import express, { Request, Response } from 'express';
import { analyzeCompetitorImages } from '../services/geminiService';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { AnalyzePatternRequest, CompetitorPattern } from '../types';

const router = express.Router();

/**
 * GET /api/patterns
 * 保存済みパターン一覧を取得
 */
router.get('/', async (_req: Request, res: Response, next) => {
  try {
    const { data, error } = await supabase
      .from('competitor_patterns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    next(createError(`パターン取得に失敗しました: ${error.message}`, 500));
  }
});

/**
 * POST /api/patterns/analyze
 * 競合のストーリーズスクショを分析してパターンを抽出
 * NOTE: /:id より前に定義しないと "analyze" が :id としてマッチしてしまう
 */
router.post('/analyze', async (req: Request, res: Response, next) => {
  try {
    const { account_name, category, focus_point, images }: AnalyzePatternRequest = req.body;

    if (!account_name || !images || images.length < 1) {
      throw createError('アカウント名と1枚以上の画像が必要です', 400);
    }

    // Gemini APIでパターン分析
    const skeleton = await analyzeCompetitorImages(
      images,
      account_name,
      category,
      focus_point
    );

    // Supabaseに保存
    const patternData = {
      name: skeleton.template_name,
      description: skeleton.summary.best_for,
      account_name,
      category: category || skeleton.category,
      skeleton
    };

    const { data, error } = await supabase
      .from('competitor_patterns')
      .insert(patternData)
      .select()
      .single();

    if (error) throw error;

    const pattern: CompetitorPattern = {
      id: data.id,
      name: data.name,
      description: data.description,
      account_name: data.account_name,
      category: data.category,
      skeleton: data.skeleton,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({
      status: 'success',
      data: pattern
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`パターン分析に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * GET /api/patterns/:id
 * 特定のパターンを取得
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('competitor_patterns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      throw createError('パターンが見つかりません', 404);
    }

    res.json({
      status: 'success',
      data
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`パターン取得に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * DELETE /api/patterns/:id
 * パターンを削除
 */
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('competitor_patterns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      status: 'success',
      message: 'パターンを削除しました'
    });
  } catch (error: any) {
    next(createError(`パターン削除に失敗しました: ${error.message}`, 500));
  }
});

export default router;
