import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors.js';
import { supabase } from '../_lib/supabase.js';
import { generateScript } from '../_lib/geminiService.js';
import { checkLegalCompliance } from '../_lib/legalFilter.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { brand_id, pattern_id, topic, vibe, pattern_data } = req.body;

    if (!brand_id || !pattern_id || !topic || !vibe) {
      return res.status(400).json({ status: 'error', message: 'brand_id, pattern_id, topic, vibe は必須です' });
    }

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return res.status(404).json({ status: 'error', message: 'ブランド情報が見つかりません' });
    }

    // DBからパターンを取得。見つからない場合はフロントエンドから送信されたpattern_dataを使用
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pattern_id);
    let pattern: any = null;

    if (isValidUuid) {
      const { data: dbPattern } = await supabase
        .from('competitor_patterns')
        .select('*')
        .eq('id', pattern_id)
        .single();
      if (dbPattern) pattern = dbPattern;
    }

    if (!pattern && pattern_data?.skeleton) {
      pattern = {
        id: pattern_id,
        name: pattern_data.name,
        skeleton: pattern_data.skeleton
      };
    }

    if (!pattern) {
      return res.status(404).json({ status: 'error', message: 'パターン情報が見つかりません' });
    }

    // 差分学習エンジン
    let userPreferences: string | undefined;
    try {
      const { data: recentLogs } = await supabase
        .from('growth_logs')
        .select('user_modifications')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentLogs && recentLogs.length > 0) {
        const trends: Record<string, number> = {};
        for (const log of recentLogs) {
          for (const mod of log.user_modifications || []) {
            const origLen = (mod.original_text || '').length;
            const modLen = (mod.modified_text || '').length;
            if (modLen < origLen * 0.8) trends['テキストを短くする傾向'] = (trends['テキストを短くする傾向'] || 0) + 1;
            else if (modLen > origLen * 1.2) trends['テキストを長くする傾向'] = (trends['テキストを長くする傾向'] || 0) + 1;

            const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
            const origEmoji = (mod.original_text || '').match(emojiRegex)?.length || 0;
            const modEmoji = (mod.modified_text || '').match(emojiRegex)?.length || 0;
            if (modEmoji > origEmoji) trends['絵文字を追加する傾向'] = (trends['絵文字を追加する傾向'] || 0) + 1;
            else if (origEmoji > modEmoji) trends['絵文字を削除する傾向'] = (trends['絵文字を削除する傾向'] || 0) + 1;

            if (mod.original_text !== mod.modified_text) trends['文言を独自に調整する傾向'] = (trends['文言を独自に調整する傾向'] || 0) + 1;
          }
        }
        const sortedTrends = Object.entries(trends).sort(([, a], [, b]) => b - a).slice(0, 5);
        if (sortedTrends.length > 0) {
          userPreferences = sortedTrends.map(([trend, count]) => `- ${trend}（過去${count}回）`).join('\n');
        }
      }
    } catch (err) {
      console.warn('成長ログ取得に失敗（スキップ）:', err);
    }

    const slides = await generateScript(brand, pattern, topic, vibe, userPreferences);
    const legalWarnings = checkLegalCompliance(slides);

    // 常にDBに保存（デフォルトパターン使用時はpattern_idをnullにする）
    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .insert({
        brand_id,
        pattern_id: isValidUuid ? pattern_id : null,
        topic,
        vibe,
        slides
      })
      .select()
      .single();

    if (scriptError) throw scriptError;

    return res.status(201).json({
      status: 'success',
      data: {
        id: script.id,
        brand_id: script.brand_id,
        pattern_id: script.pattern_id,
        topic: script.topic,
        vibe: script.vibe,
        slides: script.slides,
        created_at: script.created_at,
        legal_warnings: legalWarnings
      }
    });
  } catch (error: any) {
    console.error('Script generation error:', error);
    return res.status(500).json({ status: 'error', message: `台本生成に失敗しました: ${error.message}` });
  }
}
