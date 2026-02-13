
import React, { useState } from 'react';
import { View, CompetitorPattern, BrandInfo, StorySlide, GeneratedScript, LegalWarning } from '../types';
import { scriptsApi, growthLogsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';

interface ScriptGeneratorProps {
  brandInfo: BrandInfo;
  patterns: CompetitorPattern[];
  onFinish: () => void;
}

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ brandInfo, patterns, onFinish }) => {
  const [selectedPatternId, setSelectedPatternId] = useState(patterns[0]?.id || '');
  const [vibe, setVibe] = useState('フランク（親しみやすい）');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<StorySlide[] | null>(null);
  const [generatedScriptId, setGeneratedScriptId] = useState<string | null>(null);
  const [rewritingSlideId, setRewritingSlideId] = useState<number | null>(null);
  const [currentRewriteSlideId, setCurrentRewriteSlideId] = useState<number | null>(null);
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [legalWarnings, setLegalWarnings] = useState<LegalWarning[]>([]);

  const handleGenerate = async () => {
    if (!topic || topic.length < 100) {
      alert("今日伝えたいことをもう少し詳しく（100文字以上）入力してください。");
      return;
    }
    
    if (!brandInfo.id) {
      alert("ブランド情報を先に設定してください。");
      return;
    }

    const pattern = patterns.find(p => p.id === selectedPatternId);
    if (!pattern) {
      alert("パターン（型）を先に作成してください。競合分析から型を抽出できます。");
      return;
    }

    setGenerating(true);
    setRewriteError(null);
    try {
      const scriptData = await scriptsApi.generate({
        brand_id: brandInfo.id,
        pattern_id: selectedPatternId,
        topic,
        vibe
      });
      
      setResult(scriptData.slides);
      setGeneratedScriptId(scriptData.id);
      setLegalWarnings(scriptData.legal_warnings || []);
    } catch (error: any) {
      console.error(error);
      if (error instanceof ApiError) {
        alert(`生成中にエラーが発生しました: ${error.message}`);
      } else {
        alert("生成中にエラーが発生しました。");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRewrite = async (slideId: number) => {
    if (!rewriteInstruction.trim()) {
      setRewriteError('リライト指示を入力してください');
      return;
    }

    if (!generatedScriptId) {
      // まだ保存されていない場合は、ローカルでリライト
      setRewriteError(null);
      setRewritingSlideId(slideId);
      
      try {
        // 簡易的なリライト（実際にはAPIを呼び出す）
        // ここでは、scriptsApi.rewriteを呼び出す代わりに、直接Gemini APIを呼び出すか、
        // またはバックエンドのリライトエンドポイントを直接呼び出す
        // 今回は、保存後にリライトできるようにするため、一旦スキップ
        setRewriteError('台本を先に保存してください');
        setRewriteModalOpen(false);
        return;
      } catch (error: any) {
        setRewriteError(error.message || 'リライトに失敗しました');
      } finally {
        setRewritingSlideId(null);
      }
      return;
    }

    setRewriteError(null);
    setRewritingSlideId(slideId);

    try {
      const response = await scriptsApi.rewrite(generatedScriptId, {
        slide_id: slideId,
        instruction: rewriteInstruction
      });

      // 結果を更新
      if (result) {
        const updatedSlides = result.map(slide => 
          slide.id === slideId ? response.slide : slide
        );
        setResult(updatedSlides);
      }

      setRewriteModalOpen(false);
      setRewriteInstruction('');
    } catch (error: any) {
      console.error(error);
      if (error instanceof ApiError) {
        setRewriteError(error.message);
      } else {
        setRewriteError('リライトに失敗しました');
      }
    } finally {
      setRewritingSlideId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // 簡単なフィードバック（実際にはトースト通知などを使う）
    alert('コピーしました');
  };

  if (result) {
    return (
      <div className="space-y-8 animate-fadeIn pb-20">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">生成された台本</h2>
            <p className="text-slate-500">全{result.length}枚の構成案です。</p>
          </div>
          <button 
            onClick={() => setResult(null)}
            className="text-slate-400 font-bold hover:text-slate-600"
          >
            やり直す
          </button>
        </header>

        {legalWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i>
              <h3 className="font-bold text-amber-900">リーガルチェック: {legalWarnings.length}件の注意表現が検出されました</h3>
            </div>
            <div className="space-y-3">
              {legalWarnings.map((w, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${w.severity === 'high' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${w.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {w.law}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      Slide {w.slideId}: 「<span className={w.severity === 'high' ? 'text-red-600' : 'text-yellow-700'}>{w.matchedWord}</span>」
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{w.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {result.map((slide, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col min-h-[500px] border-t-8 border-t-pink-500">
              <div className="flex justify-between items-center mb-6">
                <span className="px-4 py-1 bg-slate-100 rounded-full text-xs font-black uppercase text-slate-500">Slide {idx + 1}</span>
                <span className="text-pink-500 text-xs font-bold">{slide.role}</span>
              </div>
              
              <div className="flex-1 space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <i className="fa-solid fa-video"></i> 撮影・素材指示
                  </h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    "{slide.visualGuidance}"
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <i className="fa-solid fa-align-left"></i> 文言（コピペ可）
                  </h4>
                  <div className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 text-slate-800 font-bold whitespace-pre-wrap leading-relaxed shadow-inner">
                    {slide.script}
                  </div>
                </div>

                <div className="flex gap-2">
                  <i className="fa-solid fa-circle-info text-blue-400 text-xs mt-1"></i>
                  <p className="text-[11px] text-slate-500 italic">{slide.tips}</p>
                </div>
              </div>

              <div className="mt-8 flex gap-2">
                <button 
                  onClick={() => handleCopy(slide.script)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                >
                  <i className="fa-solid fa-copy mr-2"></i> コピー
                </button>
                <button 
                  onClick={() => {
                    setCurrentRewriteSlideId(slide.id);
                    setRewriteModalOpen(true);
                    setRewriteInstruction('');
                    setRewriteError(null);
                  }}
                  disabled={rewritingSlideId === slide.id}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                    rewritingSlideId === slide.id
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-600 hover:bg-pink-100 hover:text-pink-600'
                  }`}
                >
                  {rewritingSlideId === slide.id ? (
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                  ) : (
                    <i className="fa-solid fa-magic"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-50">
          <button 
            onClick={async () => {
              if (generatedScriptId && result) {
                try {
                  // 成長ログを作成（実際の修正内容はユーザーが手動で入力する想定）
                  await growthLogsApi.create({
                    script_id: generatedScriptId,
                    user_modifications: result.map((slide, idx) => ({
                      slide_id: slide.id,
                      original_text: slide.script,
                      modified_text: slide.script, // 実際にはユーザーが修正したテキスト
                      changes: []
                    })),
                    engagement_metrics: null
                  });
                } catch (error) {
                  console.error('Failed to save growth log:', error);
                }
              }
              onFinish();
            }}
            className="px-8 py-4 bg-green-500 text-white rounded-full font-bold shadow-2xl shadow-green-200 hover:scale-105 transition-all flex items-center gap-3"
          >
            <i className="fa-solid fa-check"></i>
            投稿完了・ログに保存
          </button>
        </div>

        {/* リライトモーダル */}
        {rewriteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">リライト指示</h3>
                <button
                  onClick={() => {
                    setRewriteModalOpen(false);
                    setRewriteInstruction('');
                    setRewriteError(null);
                    setCurrentRewriteSlideId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              {rewriteError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                  <p className="text-red-700 text-sm">{rewriteError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    リライト指示（例：もっと短く、ベネフィットを強調して、絵文字を追加して）
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none"
                    value={rewriteInstruction}
                    onChange={(e) => setRewriteInstruction(e.target.value)}
                    placeholder="例：もっと短く、ベネフィットを強調して"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRewriteModalOpen(false);
                      setRewriteInstruction('');
                      setRewriteError(null);
                      setCurrentRewriteSlideId(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      if (currentRewriteSlideId !== null) {
                        handleRewrite(currentRewriteSlideId);
                      }
                    }}
                    disabled={!rewriteInstruction.trim() || rewritingSlideId !== null || currentRewriteSlideId === null}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      !rewriteInstruction.trim() || rewritingSlideId !== null || currentRewriteSlideId === null
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-[1.02]'
                    }`}
                  >
                    {rewritingSlideId !== null ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
                        リライト中...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-magic mr-2"></i>
                        リライト実行
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">10秒で台本生成</h2>
        <p className="text-slate-500">今日のネタを入れるだけで、勝率の高い構成に変換します。</p>
      </header>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">1. どの「型」を適用しますか？</label>
          <div className="grid grid-cols-2 gap-3">
            {patterns.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatternId(p.id)}
                className={`px-4 py-3 rounded-2xl text-left border-2 transition-all ${
                  selectedPatternId === p.id 
                    ? 'border-pink-500 bg-pink-50 text-pink-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <div className="text-xs font-black opacity-50 mb-1">PATTERN</div>
                <div className="font-bold text-sm line-clamp-1">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">2. 今日の雰囲気（バイブス）</label>
          <div className="flex flex-wrap gap-2">
            {['フランク', '専門家', '丁寧・上品', 'ワクワク', '裏側暴露'].map(v => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  vibe === v 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-slate-700">3. 今日伝えたいこと（箇条書きOK）</label>
            <button
              type="button"
              onClick={() => {
                const samples = [
                  '新商品のハーブティーが届いた。カモミールとラベンダーのブレンドで香りが最高。夜寝る前に飲むとリラックスできる。初回限定30%OFFクーポンを今日から3日間配布中。DMで「ハーブ」と送ってくれた方に特別にクーポンコードをお届けします。',
                  '今日はお客様のビフォーアフターを紹介。3ヶ月間トリートメントを続けてくださった方の変化がすごい。髪のツヤとまとまりが別人レベル。使っているのはうちのオリジナルヘアオイル。気になる方はプロフィールのリンクからチェックしてみてね。',
                  '実はずっと悩んでいたことがあって。商品の価格設定について。高すぎると手が出ない、安すぎると価値が伝わらない。でもこだわりの原材料を使っているからこそ今の価格。その裏側を今日は正直に話します。質問があればコメントで教えてね。',
                ];
                const random = samples[Math.floor(Math.random() * samples.length)];
                setTopic(random);
              }}
              className="px-3 py-1 bg-violet-100 text-violet-600 rounded-full text-xs font-bold hover:bg-violet-200 transition-all"
            >
              <i className="fa-solid fa-flask mr-1"></i>
              サンプルを入力
            </button>
          </div>
          <textarea
            rows={6}
            placeholder="例：新商品のハーブティーが届いた。香りが最高でリラックス効果抜群。初回限定30%OFFクーポン配布中。夜寝る前に飲むのがおすすめ。"
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all text-slate-700 leading-relaxed"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          ></textarea>
          <div className="mt-2 text-right text-xs text-slate-400">
            {topic.length} / 100文字以上
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={generating || !topic}
          className={`w-full py-4 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
            generating 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white hover:scale-[1.02] shadow-pink-200'
          }`}
        >
          {generating ? (
            <>
              <i className="fa-solid fa-compact-disc animate-spin"></i>
              生成中...
            </>
          ) : (
            <>
              台本を魔法で作成する
              <i className="fa-solid fa-sparkles"></i>
            </>
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini 2.0 Flash</p>
      </div>
    </div>
  );
};

export default ScriptGenerator;
