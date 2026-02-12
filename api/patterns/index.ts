import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors';
import { supabase } from '../_lib/supabase';

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

  return res.status(405).json({ error: 'Method not allowed' });
}
