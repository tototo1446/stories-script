import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { engagement_metrics } = req.body;

    if (!engagement_metrics) {
      return res.status(400).json({ status: 'error', message: 'engagement_metrics は必須です' });
    }

    const { data, error } = await supabase
      .from('growth_logs')
      .update({ engagement_metrics })
      .eq('id', id as string)
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
