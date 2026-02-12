import express, { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { generateScript, rewriteScript } from '../services/geminiService';
import { GenerateScriptRequest, RewriteScriptRequest, GeneratedScript, StorySlide } from '../types';
import { checkLegalCompliance } from '../utils/legalFilter';

const router = express.Router();

/**
 * POST /api/scripts/generate
 * Gemini AIを使用して台本を生成
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

    // 成長ログから修正傾向を抽出（差分学習エンジン）
    let userPreferences: string | undefined;
    try {
      const { data: recentLogs } = await supabase
        .from('growth_logs')
        .select('user_modifications')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentLogs && recentLogs.length > 0) {
        const trends: Record<string, number> = {};
        for (const log of recentLogs) {
          for (const mod of log.user_modifications || []) {
            const origLen = (mod.original_text || '').length;
            const modLen = (mod.modified_text || '').length;
            if (modLen < origLen * 0.8) {
              trends['テキストを短くする傾向'] = (trends['テキストを短くする傾向'] || 0) + 1;
            } else if (modLen > origLen * 1.2) {
              trends['テキストを長くする傾向'] = (trends['テキストを長くする傾向'] || 0) + 1;
            }
            const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
            const origEmoji = (mod.original_text || '').match(emojiRegex)?.length || 0;
            const modEmoji = (mod.modified_text || '').match(emojiRegex)?.length || 0;
            if (modEmoji > origEmoji) {
              trends['絵文字を追加する傾向'] = (trends['絵文字を追加する傾向'] || 0) + 1;
            } else if (origEmoji > modEmoji) {
              trends['絵文字を削除する傾向'] = (trends['絵文字を削除する傾向'] || 0) + 1;
            }
            if (mod.original_text !== mod.modified_text) {
              trends['文言を独自に調整する傾向'] = (trends['文言を独自に調整する傾向'] || 0) + 1;
            }
          }
        }
        const sortedTrends = Object.entries(trends)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        if (sortedTrends.length > 0) {
          userPreferences = sortedTrends
            .map(([trend, count]) => `- ${trend}（過去${count}回）`)
            .join('\n');
        }
      }
    } catch (err) {
      console.warn('成長ログ取得に失敗（スキップ）:', err);
    }

    // Gemini APIで台本生成（修正傾向を反映）
    const slides = await generateScript(
      brand,
      pattern,
      topic,
      vibe,
      userPreferences
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

    // 薬機法・景表法のNGワードチェック
    const legalWarnings = checkLegalCompliance(script.slides);

    res.status(201).json({
      status: 'success',
      data: {
        ...generatedScript,
        legal_warnings: legalWarnings
      }
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

    // 元テキストを保持してからリライト
    const originalText = slide.script;
    const rewrittenText = await rewriteScript(originalText, instruction);

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
        original_text: originalText,
        rewritten_text: rewrittenText,
        instruction
      });

    // リライト後のリーガルチェック
    const legalWarnings = checkLegalCompliance([slide]);

    res.json({
      status: 'success',
      data: {
        slide,
        script: updatedScript,
        legal_warnings: legalWarnings
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
