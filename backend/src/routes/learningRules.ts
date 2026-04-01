import express, { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { extractLearningRules } from '../services/geminiService';

const router = express.Router();

/**
 * GET /api/learning-rules
 * 全学習ルールを取得
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { data, error } = await supabase
      .from('learning_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ status: 'success', data: data || [] });
  } catch (error: any) {
    next(createError(`学習ルール取得に失敗しました: ${error.message}`, 500));
  }
});

/**
 * POST /api/learning-rules/analyze
 * 資料をAIで分析してルールを抽出（未保存状態で返す）
 */
router.post('/analyze', async (req: Request, res: Response, next) => {
  try {
    const { source_type, content, images } = req.body;

    if (!source_type) {
      throw createError('source_type は必須です', 400);
    }

    if (source_type === 'text' && !content) {
      throw createError('テキスト入力が必要です', 400);
    }

    if ((source_type === 'pdf' || source_type === 'image') && (!images || images.length === 0)) {
      throw createError('ファイルのアップロードが必要です', 400);
    }

    const result = await extractLearningRules(content, images);

    res.json({ status: 'success', data: result });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`ルール抽出に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * POST /api/learning-rules
 * 確認済みルールを保存
 */
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { title, source_type, source_summary, rules } = req.body;

    if (!title || !rules || rules.length === 0) {
      throw createError('title と rules は必須です', 400);
    }

    const { data, error } = await supabase
      .from('learning_rules')
      .insert({
        title,
        source_type: source_type || 'text',
        source_summary: source_summary || null,
        rules,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ status: 'success', data });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`学習ルール保存に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * PUT /api/learning-rules/:id
 * ルールを更新
 */
router.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { title, rules, is_active } = req.body;

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (rules !== undefined) updateData.rules = rules;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      throw createError('更新するフィールドがありません', 400);
    }

    const { data, error } = await supabase
      .from('learning_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'success', data });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`学習ルール更新に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * DELETE /api/learning-rules/:id
 * ルールを削除
 */
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('learning_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ status: 'success', data: null });
  } catch (error: any) {
    next(createError(`学習ルール削除に失敗しました: ${error.message}`, 500));
  }
});

export default router;
