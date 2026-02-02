import express, { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { generateScriptWithDify } from '../services/difyService';
import { rewriteScript } from '../services/geminiService';
import { GenerateScriptRequest, RewriteScriptRequest, GeneratedScript, StorySlide } from '../types';

const router = express.Router();

/**
 * POST /api/scripts/generate
 * Difyワークフローを使用して台本を生成
 */
router.post('/generate', async (req: Request, res: Response, next) => {
  try {
    const { brand_id, pattern_id, topic, vibe }: GenerateScriptRequest = req.body;

    if (!brand_id || !pattern_id || !topic || !vibe) {
      throw createError('brand_id, pattern_id, topic, vibe は必須です', 400);
    }

    // ブランド情報を取得
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      throw createError('ブランド情報が見つかりません', 404);
    }

    // パターン情報を取得
    const { data: pattern, error: patternError } = await supabase
      .from('competitor_patterns')
      .select('*')
      .eq('id', pattern_id)
      .single();

    if (patternError || !pattern) {
      throw createError('パターン情報が見つかりません', 404);
    }

    // Difyワークフローを呼び出して台本生成
    const slides = await generateScriptWithDify(
      brand,
      pattern,
      topic,
      vibe
    );

    // 生成された台本をデータベースに保存
    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .insert({
        brand_id,
        pattern_id,
        topic,
        vibe,
        slides
      })
      .select()
      .single();

    if (scriptError) throw scriptError;

    const generatedScript: GeneratedScript = {
      id: script.id,
      brand_id: script.brand_id,
      pattern_id: script.pattern_id,
      topic: script.topic,
      vibe: script.vibe,
      slides: script.slides,
      created_at: script.created_at
    };

    res.status(201).json({
      status: 'success',
      data: generatedScript
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`台本生成に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * GET /api/scripts/:id
 * 生成された台本を取得
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      throw createError('台本が見つかりません', 404);
    }

    res.json({
      status: 'success',
      data
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`台本取得に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * POST /api/scripts/:id/rewrite
 * 台本の特定スライドをリライト
 */
router.post('/:id/rewrite', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { slide_id, instruction }: RewriteScriptRequest = req.body;

    if (!slide_id || !instruction) {
      throw createError('slide_id と instruction は必須です', 400);
    }

    // 台本を取得
    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('id', id)
      .single();

    if (scriptError || !script) {
      throw createError('台本が見つかりません', 404);
    }

    const slides: StorySlide[] = script.slides;
    const slide = slides.find(s => s.id === slide_id);

    if (!slide) {
      throw createError('指定されたスライドが見つかりません', 404);
    }

    // Gemini APIでリライト
    const rewrittenText = await rewriteScript(slide.script, instruction);

    // スライドを更新
    slide.script = rewrittenText;
    const updatedSlides = slides.map(s => s.id === slide_id ? slide : s);

    // データベースを更新
    const { data: updatedScript, error: updateError } = await supabase
      .from('generated_scripts')
      .update({ slides: updatedSlides })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // リライト履歴を保存
    await supabase
      .from('script_rewrites')
      .insert({
        script_id: id,
        slide_id,
        original_text: slide.script,
        rewritten_text: rewrittenText,
        instruction
      });

    res.json({
      status: 'success',
      data: {
        slide,
        script: updatedScript
      }
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`リライトに失敗しました: ${error.message}`, 500));
    }
  }
});

export default router;
