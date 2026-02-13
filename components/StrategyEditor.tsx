
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { patternsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';
import { CompetitorPattern } from '../types';

interface StrategyEditorProps {
  onPatternCreated: (pattern: CompetitorPattern) => void;
}

const StrategyEditor: React.FC<StrategyEditorProps> = ({ onPatternCreated }) => {
  const [images, setImages] = useState<string[]>([]);
  const [competitorName, setCompetitorName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);

  // クリップボードからの画像ペースト対応
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ドラッグ＆ドロップによる並べ替え
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = dragItem.current;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const reordered = [...images];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    setImages(reordered);
    dragItem.current = null;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    setDragOverIndex(null);
  };

  const startAnalysis = async () => {
    if (!competitorName || images.length < 5) {
      alert("競合名と、少なくとも5枚以上のスクリーンショットが必要です。");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await patternsApi.analyze({
        account_name: competitorName,
        images: images,
        category: '',
        focus_point: ''
      });

      // APIレスポンスをCompetitorPattern形式に変換
      const pattern: CompetitorPattern = {
        id: result.id || result.data?.id || Date.now().toString(),
        name: result.name || result.data?.name || '',
        description: result.description || result.data?.description || '',
        account_name: result.account_name || result.data?.account_name || competitorName,
        category: result.category || result.data?.category,
        slides: result.skeleton?.skeleton?.map((s: any, idx: number) => ({
          order: s.slide_number || idx + 1,
          purpose: s.role || '',
          visualGuidance: s.visual_instruction || ''
        })) || [],
        skeleton: result.skeleton || result.data?.skeleton
      };

      onPatternCreated(pattern);
      alert("分析が完了しました！「型」として保存されました。");
      setImages([]);
      setCompetitorName('');
    } catch (error: any) {
      console.error(error);
      if (error instanceof ApiError) {
        alert(`分析中にエラーが発生しました: ${error.message}`);
      } else {
        alert("分析中にエラーが発生しました。");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">競合ベンチマーク・エンジン</h2>
        <p className="text-slate-500">憧れのアカウントの「売れる構成」をAIが10秒で丸裸にします。</p>
      </header>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">対象のアカウント名 / 競合名</label>
          <input
            type="text"
            placeholder="例: @modern_kitchen_life"
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ストーリーズのスクリーンショット（5〜10枚推奨）
          </label>
          <p className="text-xs text-slate-400 mb-3">
            <i className="fa-solid fa-arrows-up-down-left-right mr-1"></i>
            ドラッグ＆ドロップで順番を並べ替えできます ／
            <i className="fa-solid fa-paste ml-1 mr-1"></i>
            Ctrl+V（⌘+V）で画像を貼り付けできます
          </p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((src, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-[9/16] rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${
                  dragOverIndex === idx ? 'ring-4 ring-pink-400 scale-105' : ''
                }`}
              >
                <img src={src} className="w-full h-full object-cover" alt={`Screenshot ${idx}`} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="text-white text-xs font-bold">{idx + 1}枚目</span>
                </div>
                <button
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
                <div className="absolute top-2 left-2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fa-solid fa-grip-vertical text-xs"></i>
                </div>
              </div>
            ))}
            <label className="aspect-[9/16] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-2"></i>
              <span className="text-xs font-bold text-slate-400">アップロード</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={startAnalysis}
            disabled={analyzing || images.length < 5}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
              analyzing || images.length < 5
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-[1.02] shadow-indigo-200'
            }`}
          >
            {analyzing ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                AIがパターンを抽出中...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                {images.length < 5 ? `戦略を解析する（あと${5 - images.length}枚必要）` : '戦略を解析する'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
        <i className="fa-solid fa-lightbulb text-amber-500 mt-1"></i>
        <div className="text-sm text-amber-800">
          <p className="font-bold mb-1">分析のコツ</p>
          <p>一連のストーリー（1つの企画分）を最初から最後まで順番にアップロードすると、AIが「フック→共感→解決→CTA」の流れをより正確に抽出できます。</p>
        </div>
      </div>
    </div>
  );
};

export default StrategyEditor;
