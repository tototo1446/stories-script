
import React, { useEffect, useState } from 'react';
import { View, CompetitorPattern } from '../types';
import { patternsApi, statsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';

interface DashboardStats {
  totalImpressions: number;
  totalReactions: number;
  totalDmCount: number;
  scriptCount: number;
  impressionChange: number;
  reactionChange: number;
}

interface DashboardProps {
  onNavigate: (view: View) => void;
  savedPatterns: CompetitorPattern[];
  onPatternsUpdate?: (patterns: CompetitorPattern[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, savedPatterns, onPatternsUpdate }) => {
  const [patterns, setPatterns] = useState<CompetitorPattern[]>(savedPatterns);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await statsApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const data = await patternsApi.getAll();
      if (data.length > 0) {
        const convertedPatterns: CompetitorPattern[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          account_name: p.account_name,
          category: p.category,
          is_favorite: p.is_favorite || false,
          slides: p.skeleton?.skeleton?.map((s: any, idx: number) => ({
            order: s.slide_number || idx + 1,
            purpose: s.role || '',
            visualGuidance: s.visual_instruction || ''
          })) || [],
          skeleton: p.skeleton
        }));
        setPatterns(convertedPatterns);
        if (onPatternsUpdate) {
          onPatternsUpdate(convertedPatterns);
        }
      }
    } catch (error: any) {
      if (error instanceof ApiError && error.statusCode !== 404) {
        console.error('Failed to load patterns:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (patternId: string, currentFav: boolean) => {
    // デフォルトパターンはスキップ
    if (patternId.startsWith('default-')) return;
    try {
      await patternsApi.toggleFavorite(patternId, !currentFav);
      setPatterns(prev => prev.map(p =>
        p.id === patternId ? { ...p, is_favorite: !currentFav } : p
      ));
      if (onPatternsUpdate) {
        onPatternsUpdate(patterns.map(p =>
          p.id === patternId ? { ...p, is_favorite: !currentFav } : p
        ));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const formatChange = (change: number) => {
    if (change > 0) return `+${change}%`;
    if (change < 0) return `${change}%`;
    return '±0%';
  };

  // お気に入りを先頭にソート
  const sortedPatterns = [...patterns].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return 0;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">こんにちは！</h2>
          <p className="text-slate-500">今日はどんなストーリーでファンを惹きつけますか？</p>
        </div>
        <button
          onClick={() => onNavigate(View.GENERATOR)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold shadow-lg shadow-pink-200 hover:scale-105 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          今日の一本を作成
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-eye text-xl"></i>
          </div>
          {statsLoading ? (
            <i className="fa-solid fa-circle-notch animate-spin text-slate-300 text-xl mb-1"></i>
          ) : (
            <span className="text-2xl font-bold">{stats ? stats.totalImpressions.toLocaleString() : '-'}</span>
          )}
          <span className="text-slate-400 text-sm">先週の総インプレッション</span>
          {stats && (
            <span className={`text-xs font-bold mt-2 ${stats.impressionChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatChange(stats.impressionChange)} vs 先々週
            </span>
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-comments text-xl"></i>
          </div>
          {statsLoading ? (
            <i className="fa-solid fa-circle-notch animate-spin text-slate-300 text-xl mb-1"></i>
          ) : (
            <span className="text-2xl font-bold">{stats ? (stats.totalReactions + stats.totalDmCount).toLocaleString() : '-'}</span>
          )}
          <span className="text-slate-400 text-sm">DM・リアクション数</span>
          {stats && (
            <span className={`text-xs font-bold mt-2 ${stats.reactionChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatChange(stats.reactionChange)} vs 先々週
            </span>
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-bolt text-xl"></i>
          </div>
          {statsLoading ? (
            <i className="fa-solid fa-circle-notch animate-spin text-slate-300 text-xl mb-1"></i>
          ) : (
            <span className="text-2xl font-bold">{stats ? stats.scriptCount : '-'}</span>
          )}
          <span className="text-slate-400 text-sm">生成された台本数</span>
          <span className="text-blue-500 text-xs font-bold mt-2">累計</span>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">お気に入りの「型」</h3>
          <button onClick={() => onNavigate(View.STRATEGY_EDITOR)} className="text-pink-500 font-bold text-sm hover:underline">
            すべて見る
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 flex items-center justify-center">
              <i className="fa-solid fa-circle-notch animate-spin text-2xl text-pink-500"></i>
            </div>
          ) : sortedPatterns.length === 0 ? (
            <div className="col-span-full py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
              <i className="fa-solid fa-images text-4xl mb-4"></i>
              <p>まだ保存された「型」がありません。</p>
              <button
                onClick={() => onNavigate(View.STRATEGY_EDITOR)}
                className="mt-4 text-pink-500 font-bold hover:underline"
              >
                競合のスクショから型を抽出する
              </button>
            </div>
          ) : (
            sortedPatterns.map(pattern => (
              <div key={pattern.id} className={`group bg-white rounded-3xl overflow-hidden shadow-sm border hover:shadow-md transition-all ${pattern.is_favorite ? 'border-pink-200 ring-1 ring-pink-100' : 'border-slate-100'}`}>
                <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                  <div className="flex -space-x-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-12 h-20 bg-white border border-slate-200 rounded shadow-sm flex items-center justify-center text-[8px] text-slate-300 text-center p-1">
                        Slide {i}
                      </div>
                    ))}
                  </div>
                  {!pattern.id.startsWith('default-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(pattern.id, !!pattern.is_favorite);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-sm transition-all"
                      title={pattern.is_favorite ? 'お気に入り解除' : 'お気に入り登録'}
                    >
                      <i className={`fa-${pattern.is_favorite ? 'solid' : 'regular'} fa-star ${pattern.is_favorite ? 'text-yellow-400' : 'text-slate-300'}`}></i>
                    </button>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-800">{pattern.name}</h4>
                    {pattern.is_favorite && (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-bold">Fav</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{pattern.description}</p>
                  <button
                    onClick={() => onNavigate(View.GENERATOR)}
                    className="w-full py-2 bg-slate-50 group-hover:bg-pink-50 group-hover:text-pink-600 text-slate-600 rounded-xl font-bold text-sm transition-all"
                  >
                    この型で台本を作る
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
