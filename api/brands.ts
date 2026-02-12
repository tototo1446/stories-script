import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/cors';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    return res.json({ status: 'success', data: data || null });
  }

  if (req.method === 'POST') {
    const { name, product_description, target_audience, brand_tone } = req.body;
    if (!name || !product_description || !target_audience || !brand_tone) {
      return res.status(400).json({ status: 'error', message: 'すべてのフィールドが必要です' });
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({ name, product_description, target_audience, brand_tone })
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
