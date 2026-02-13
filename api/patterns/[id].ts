import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('competitor_patterns')
      .select('*')
      .eq('id', id as string)
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    if (!data) return res.status(404).json({ status: 'error', message: 'パターンが見つかりません' });
    return res.json({ status: 'success', data });
  }

  if (req.method === 'PATCH') {
    const { is_favorite } = req.body;

    const { data, error } = await supabase
      .from('competitor_patterns')
      .update({ is_favorite })
      .eq('id', id as string)
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('competitor_patterns')
      .delete()
      .eq('id', id as string);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', message: 'パターンを削除しました' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
