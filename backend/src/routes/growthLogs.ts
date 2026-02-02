import express, { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { CreateGrowthLogRequest, GrowthLog } from '../types';

const router = express.Router();

/**
 * GET /api/growth-logs
 * 成長ログ一覧を取得
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { script_id } = req.query;

    let query = supabase
      .from('growth_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (script_id) {
      query = query.eq('script_id', script_id as string);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    next(createError(`成長ログ取得に失敗しました: ${error.message}`, 500));
  }
});

/**
 * POST /api/growth-logs
 * 成長ログを作成
 */
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { script_id, user_modifications, engagement_metrics }: CreateGrowthLogRequest = req.body;

    if (!script_id || !user_modifications) {
      throw createError('script_id と user_modifications は必須です', 400);
    }

    // 台本が存在するか確認
    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('id')
      .eq('id', script_id)
      .single();

    if (scriptError || !script) {
      throw createError('台本が見つかりません', 404);
    }

    const { data, error } = await supabase
      .from('growth_logs')
      .insert({
        script_id,
        user_modifications,
        engagement_metrics: engagement_metrics || null
      })
      .select()
      .single();

    if (error) throw error;

    const growthLog: GrowthLog = {
      id: data.id,
      script_id: data.script_id,
      user_modifications: data.user_modifications,
      engagement_metrics: data.engagement_metrics,
      created_at: data.created_at
    };

    res.status(201).json({
      status: 'success',
      data: growthLog
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`成長ログ作成に失敗しました: ${error.message}`, 500));
    }
  }
});

export default router;
