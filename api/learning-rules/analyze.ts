import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { extractLearningRules } from '../_lib/geminiService.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { source_type, content, images } = req.body;

    if (!source_type) {
      return res.status(400).json({ status: 'error', message: 'source_type は必須です' });
    }

    if (source_type === 'text' && !content) {
      return res.status(400).json({ status: 'error', message: 'テキスト入力が必要です' });
    }

    if ((source_type === 'pdf' || source_type === 'image') && (!images || images.length === 0)) {
      return res.status(400).json({ status: 'error', message: 'ファイルのアップロードが必要です' });
    }

    const result = await extractLearningRules(content, images);

    return res.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('Learning rules analysis error:', error);
    return res.status(500).json({ status: 'error', message: `ルール抽出に失敗しました: ${error.message}` });
  }
}
