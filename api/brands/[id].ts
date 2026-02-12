import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, product_description, target_audience, brand_tone } = req.body;
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (product_description !== undefined) updateData.product_description = product_description;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (brand_tone !== undefined) updateData.brand_tone = brand_tone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: 'error', message: '更新するフィールドがありません' });
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id as string)
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
