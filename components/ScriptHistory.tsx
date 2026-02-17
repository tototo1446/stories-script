
import React, { useState, useEffect } from 'react';
import { View, GeneratedScript, StorySlide } from '../types';
import { scriptsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';

interface ScriptHistoryProps {
  onNavigate: (view: View) => void;
}

const ScriptHistory: React.FC<ScriptHistoryProps> = ({ onNavigate }) => {
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scriptsApi.getAll();
      setScripts(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('履歴の読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  };

  const handleCopyAll = (slides: StorySlide[]) => {
    const allText = slides.map((s, i) => `【Slide ${i + 1}: ${s.role}】\n${s.script}`).join('\n\n');
    navigator.clipboard.writeText(allText);
    alert('全スライドをコピーしました');
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
              onClick={loadScripts}
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
          <h2 className="text-3xl font-bold text-slate-900">生成履歴</h2>
          <p className="text-slate-500">過去に生成した台本の一覧です（最新50件）</p>
        </div>
        <button
          onClick={() => onNavigate(View.GENERATOR)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          新しい台本を作成
        </button>
      </header>

      {scripts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
          <i className="fa-solid fa-clock-rotate-left text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-500 mb-2">まだ生成履歴がありません</p>
          <p className="text-sm text-slate-400">台本を生成すると、ここに自動で保存されます</p>
          <button
            onClick={() => onNavigate(View.GENERATOR)}
            className="mt-6 px-6 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all"
          >
            台本を作成する
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scripts.map(script => {
            const isExpanded = expandedId === script.id;
            return (
              <div key={script.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* ヘッダー部分（クリックで展開） */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : script.id)}
                  className="w-full p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                          {script.vibe}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                          {script.slides?.length || 0}枚構成
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-2 mb-1">
                        {script.topic.length > 80 ? script.topic.substring(0, 80) + '...' : script.topic}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {new Date(script.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400`}></i>
                    </div>
                  </div>
                </button>

                {/* 展開時のスライド一覧 */}
                {isExpanded && script.slides && (
                  <div className="border-t border-slate-100 p-6">
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => handleCopyAll(script.slides)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-copy"></i>
                        全スライドをコピー
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {script.slides.map((slide: StorySlide, idx: number) => (
                        <div key={idx} className="border border-slate-200 rounded-2xl p-5 border-t-4 border-t-pink-400">
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black uppercase text-slate-500">
                              Slide {idx + 1}
                            </span>
                            <span className="text-pink-500 text-xs font-bold">{slide.role}</span>
                          </div>

                          <div className="mb-3 p-3 bg-slate-50 rounded-xl">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              <i className="fa-solid fa-video mr-1"></i>撮影指示
                            </div>
                            <p className="text-xs text-slate-600 italic">"{slide.visualGuidance}"</p>
                          </div>

                          <div className="mb-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              <i className="fa-solid fa-align-left mr-1"></i>文言
                            </div>
                            <div className="p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 text-sm text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">
                              {slide.script}
                            </div>
                          </div>

                          <div className="flex items-start gap-2 mb-3">
                            <i className="fa-solid fa-circle-info text-blue-400 text-xs mt-0.5"></i>
                            <p className="text-[11px] text-slate-500 italic">{slide.tips}</p>
                          </div>

                          <button
                            onClick={() => handleCopy(slide.script)}
                            className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                          >
                            <i className="fa-solid fa-copy mr-1"></i> コピー
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScriptHistory;
