import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('competitor_patterns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data: data || [] });
  }

  if (req.method === 'POST') {
    const { name, description, account_name, category, skeleton, is_favorite } = req.body;

    if (!name || !description || !account_name || !skeleton) {
      return res.status(400).json({ status: 'error', message: 'name, description, account_name, skeleton は必須です' });
    }

    const { data, error } = await supabase
      .from('competitor_patterns')
      .insert({
        name,
        description,
        account_name,
        category: category || null,
        skeleton,
        is_favorite: is_favorite || false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
