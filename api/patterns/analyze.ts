import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';
import { analyzeCompetitorImages } from '../_lib/geminiService.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { account_name, category, focus_point, images } = req.body;

    if (!account_name || !images || images.length < 5) {
      return res.status(400).json({ status: 'error', message: 'アカウント名と5枚以上の画像が必要です' });
    }

    const skeleton = await analyzeCompetitorImages(images, account_name, category, focus_point);

    const patternData = {
      name: skeleton.template_name,
      description: skeleton.summary.best_for,
      account_name,
      category: category || skeleton.category,
      skeleton
    };

    const { data, error } = await supabase
      .from('competitor_patterns')
      .insert(patternData)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      status: 'success',
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        account_name: data.account_name,
        category: data.category,
        skeleton: data.skeleton,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    });
  } catch (error: any) {
    console.error('Pattern analysis error:', error);
    return res.status(500).json({ status: 'error', message: `パターン分析に失敗しました: ${error.message}` });
  }
}
