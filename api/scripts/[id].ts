import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('id', id as string)
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    if (!data) return res.status(404).json({ status: 'error', message: '台本が見つかりません' });
    return res.json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
