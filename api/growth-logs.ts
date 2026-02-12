import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/cors.js';
import { supabase } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const { script_id } = req.query;

    let query = supabase
      .from('growth_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (script_id) {
      query = query.eq('script_id', script_id as string);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data: data || [] });
  }

  if (req.method === 'POST') {
    const { script_id, user_modifications, engagement_metrics } = req.body;

    if (!script_id || !user_modifications) {
      return res.status(400).json({ status: 'error', message: 'script_id と user_modifications は必須です' });
    }

    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('id')
      .eq('id', script_id)
      .single();

    if (scriptError || !script) {
      return res.status(404).json({ status: 'error', message: '台本が見つかりません' });
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

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
