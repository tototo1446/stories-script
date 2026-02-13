import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/cors.js';
import { supabase } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 直近1週間の成長ログ
    const { data: recentLogs, error: recentError } = await supabase
      .from('growth_logs')
      .select('engagement_metrics, created_at')
      .gte('created_at', oneWeekAgo.toISOString());

    // 先々週の成長ログ（比較用）
    const { data: previousLogs, error: previousError } = await supabase
      .from('growth_logs')
      .select('engagement_metrics, created_at')
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString());

    // 全台本数
    const { count: scriptCount, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('*', { count: 'exact', head: true });

    if (recentError || previousError || scriptError) {
      return res.status(500).json({ status: 'error', message: '統計データの取得に失敗しました' });
    }

    const sumMetrics = (logs: any[]) => {
      let impressions = 0, reactions = 0, dmCount = 0;
      for (const log of logs) {
        if (log.engagement_metrics) {
          impressions += log.engagement_metrics.impressions || 0;
          reactions += log.engagement_metrics.reactions || 0;
          dmCount += log.engagement_metrics.dm_count || 0;
        }
      }
      return { impressions, reactions, dmCount };
    };

    const recent = sumMetrics(recentLogs || []);
    const previous = sumMetrics(previousLogs || []);

    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    return res.json({
      status: 'success',
      data: {
        totalImpressions: recent.impressions,
        totalReactions: recent.reactions,
        totalDmCount: recent.dmCount,
        scriptCount: scriptCount || 0,
        impressionChange: calcChange(recent.impressions, previous.impressions),
        reactionChange: calcChange(recent.reactions, previous.reactions),
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
