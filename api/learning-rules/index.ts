import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('learning_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data: data || [] });
  }

  if (req.method === 'POST') {
    const { title, source_type, source_summary, rules } = req.body;

    if (!title || !rules || rules.length === 0) {
      return res.status(400).json({ status: 'error', message: 'title と rules は必須です' });
    }

    const { data, error } = await supabase
      .from('learning_rules')
      .insert({
        title,
        source_type: source_type || 'text',
        source_summary: source_summary || null,
        rules,
        is_active: true
      })
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
