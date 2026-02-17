import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('generated_scripts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Scripts list error:', error);
    return res.status(500).json({ status: 'error', message: `台本一覧の取得に失敗しました: ${error.message}` });
  }
}
