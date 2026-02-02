import express, { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';
import { Brand } from '../types';

const router = express.Router();

/**
 * GET /api/brands
 * ブランド情報を取得（現在は1つのブランドのみを想定）
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json({
      status: 'success',
      data: data || null
    });
  } catch (error: any) {
    next(createError(`ブランド情報取得に失敗しました: ${error.message}`, 500));
  }
});

/**
 * POST /api/brands
 * ブランド情報を作成
 */
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, product_description, target_audience, brand_tone } = req.body;

    if (!name || !product_description || !target_audience || !brand_tone) {
      throw createError('すべてのフィールドが必要です', 400);
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({
        name,
        product_description,
        target_audience,
        brand_tone
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      status: 'success',
      data
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`ブランド情報作成に失敗しました: ${error.message}`, 500));
    }
  }
});

/**
 * PUT /api/brands/:id
 * ブランド情報を更新
 */
router.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, product_description, target_audience, brand_tone } = req.body;

    const updateData: Partial<Brand> = {};
    if (name !== undefined) updateData.name = name;
    if (product_description !== undefined) updateData.product_description = product_description;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (brand_tone !== undefined) updateData.brand_tone = brand_tone;

    if (Object.keys(updateData).length === 0) {
      throw createError('更新するフィールドがありません', 400);
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      throw createError('ブランド情報が見つかりません', 404);
    }

    res.json({
      status: 'success',
      data
    });
  } catch (error: any) {
    if (error.statusCode) {
      next(error);
    } else {
      next(createError(`ブランド情報更新に失敗しました: ${error.message}`, 500));
    }
  }
});

export default router;
