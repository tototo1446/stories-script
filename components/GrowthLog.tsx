import React, { useState, useEffect } from 'react';
import { GrowthLog, GeneratedScript } from '../types';
import { growthLogsApi, scriptsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';
import { View } from '../types';

interface GrowthLogProps {
  onNavigate: (view: View) => void;
}

const GrowthLog: React.FC<GrowthLogProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [scripts, setScripts] = useState<Record<string, GeneratedScript>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const logsData = await growthLogsApi.getAll();
      setLogs(logsData);

      // 関連する台本を取得
      const scriptIds = [...new Set(logsData.map(log => log.script_id))];
      const scriptsData: Record<string, GeneratedScript> = {};
      
      for (const scriptId of scriptIds) {
        try {
          const script = await scriptsApi.getById(scriptId);
          scriptsData[scriptId] = script;
        } catch (err) {
          console.error(`Failed to load script ${scriptId}:`, err);
        }
      }
      
      setScripts(scriptsData);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('成長ログの読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeModifications = (log: GrowthLog) => {
    const changes: string[] = [];
    
    log.user_modifications.forEach(mod => {
      const originalLength = mod.original_text.length;
      const modifiedLength = mod.modified_text.length;
      
      if (modifiedLength < originalLength * 0.8) {
        changes.push('テキストを短縮');
      } else if (modifiedLength > originalLength * 1.2) {
        changes.push('テキストを拡張');
      }
      
      // 絵文字の検出（簡易版）
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      const originalEmojis = mod.original_text.match(emojiRegex)?.length || 0;
      const modifiedEmojis = mod.modified_text.match(emojiRegex)?.length || 0;
      
      if (originalEmojis > modifiedEmojis) {
        changes.push('絵文字を削除');
      } else if (modifiedEmojis > originalEmojis) {
        changes.push('絵文字を追加');
      }
      
      // 文末表現の検出
      const originalEndings = mod.original_text.match(/[！？。]$/g)?.length || 0;
      const modifiedEndings = mod.modified_text.match(/[！？。]$/g)?.length || 0;
      
      if (originalEndings !== modifiedEndings) {
        changes.push('文末表現を変更');
      }
    });
    
    return [...new Set(changes)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch animate-spin text-4xl text-pink-500 mb-4"></i>
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
            <i className="fa-solid fa-circle-exclamation text-red-500 text-2xl mb-3"></i>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadLogs}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">成長ログ</h2>
          <p className="text-slate-500">AI生成案とユーザー修正後の比較</p>
        </div>
        <button
          onClick={() => onNavigate(View.DASHBOARD)}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
        >
          ダッシュボードに戻る
        </button>
      </header>

      {logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
          <i className="fa-solid fa-chart-line text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500 mb-2">まだ成長ログがありません</p>
          <p className="text-sm text-slate-400">台本を生成して投稿完了すると、ここに記録されます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map(log => {
            const script = scripts[log.script_id];
            const trends = analyzeModifications(log);
            
            return (
              <div key={log.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {script ? `台本: ${script.topic.substring(0, 50)}...` : `台本ID: ${log.script_id}`}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(log.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {log.engagement_metrics && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-pink-500">
                        {log.engagement_metrics.impressions?.toLocaleString() || '-'}
                      </div>
                      <div className="text-xs text-slate-400">インプレッション</div>
                    </div>
                  )}
                </div>

                {trends.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-chart-line"></i>
                      修正傾向
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {trends.map((trend, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold"
                        >
                          {trend}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">修正内容</h4>
                  {log.user_modifications.map((mod, idx) => {
                    const slide = script?.slides.find(s => s.id === mod.slide_id);
                    return (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                            Slide {mod.slide_id}
                          </span>
                          {slide && (
                            <span className="text-xs text-slate-500">{slide.role}</span>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">
                              AI生成案
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 line-through">
                              {mod.original_text}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-green-600 uppercase mb-1">
                              修正後
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-sm text-slate-800 font-medium">
                              {mod.modified_text}
                            </div>
                          </div>
                        </div>
                        {mod.changes.length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            変更点: {mod.changes.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GrowthLog;
