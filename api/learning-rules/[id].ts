import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { title, rules, is_active } = req.body;
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (rules !== undefined) updateData.rules = rules;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ status: 'error', message: '更新するフィールドがありません' });
    }

    const { data, error } = await supabase
      .from('learning_rules')
      .update(updateData)
      .eq('id', id as string)
      .select()
      .single();

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('learning_rules')
      .delete()
      .eq('id', id as string);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data: null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
