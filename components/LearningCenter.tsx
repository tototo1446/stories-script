
import React, { useState, useEffect, useCallback } from 'react';
import { LearningRule, LearningRuleSet } from '../types';
import { learningRulesApi } from '../services/apiClient';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  tone: { label: 'トーン・文体', color: 'purple', icon: 'fa-comment' },
  structure: { label: '構成ルール', color: 'blue', icon: 'fa-layer-group' },
  expression: { label: '表現ルール', color: 'amber', icon: 'fa-pen-fancy' },
  visual: { label: 'ビジュアル', color: 'green', icon: 'fa-palette' },
  compliance: { label: 'コンプライアンス', color: 'red', icon: 'fa-shield-halved' },
  strategy: { label: '戦略・方針', color: 'pink', icon: 'fa-chess' },
};

const IMPORTANCE_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const LearningCenter: React.FC = () => {
  const [activeInputTab, setActiveInputTab] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    title: string;
    source_summary: string;
    rules: LearningRule[];
  } | null>(null);
  const [savedRules, setSavedRules] = useState<LearningRuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    loadSavedRules();
  }, []);

  const loadSavedRules = async () => {
    setLoading(true);
    try {
      const data = await learningRulesApi.getAll();
      setSavedRules(data);
    } catch (err) {
      console.error('Failed to load learning rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFiles(prev => [...prev, reader.result as string]);
        setFileNames(prev => [...prev, file.name]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      let result;
      if (activeInputTab === 'text') {
        result = await learningRulesApi.analyze({
          source_type: 'text',
          content: textContent,
        });
      } else {
        const isPdf = fileNames.some(n => n.toLowerCase().endsWith('.pdf'));
        result = await learningRulesApi.analyze({
          source_type: isPdf ? 'pdf' : 'image',
          images: uploadedFiles,
        });
      }
      setAnalysisResult(result);
      setEditingTitle(result.title || '');
    } catch (error: any) {
      alert(`分析に失敗しました: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveRule = (index: number) => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      rules: analysisResult.rules.filter((_, i) => i !== index),
    });
  };

  const handleEditRule = (index: number, field: keyof LearningRule, value: string) => {
    if (!analysisResult) return;
    const updated = [...analysisResult.rules];
    updated[index] = { ...updated[index], [field]: value };
    setAnalysisResult({ ...analysisResult, rules: updated });
  };

  const handleSave = async () => {
    if (!analysisResult || analysisResult.rules.length === 0) return;
    setSaving(true);
    try {
      await learningRulesApi.save({
        title: editingTitle || analysisResult.title,
        source_type: activeInputTab === 'text' ? 'text' : (fileNames.some(n => n.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'image'),
        source_summary: analysisResult.source_summary,
        rules: analysisResult.rules,
      });
      setAnalysisResult(null);
      setTextContent('');
      setUploadedFiles([]);
      setFileNames([]);
      await loadSavedRules();
    } catch (error: any) {
      alert(`保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (ruleSet: LearningRuleSet) => {
    try {
      await learningRulesApi.update(ruleSet.id, { is_active: !ruleSet.is_active });
      setSavedRules(prev =>
        prev.map(r => r.id === ruleSet.id ? { ...r, is_active: !r.is_active } : r)
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このルールセットを削除しますか？')) return;
    try {
      await learningRulesApi.delete(id);
      setSavedRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const canAnalyze = activeInputTab === 'text' ? textContent.length >= 50 : uploadedFiles.length > 0;
  const activeRuleCount = savedRules.filter(r => r.is_active).reduce((sum, r) => sum + r.rules.length, 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">学習センター</h2>
        <p className="text-slate-500">資料をアップロードすると、AIがルール・方針を抽出して台本生成に反映します</p>
      </header>

      {/* 統計バー */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-graduation-cap text-indigo-600"></i>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{activeRuleCount}</div>
            <div className="text-xs text-slate-400">有効なルール数</div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-folder-open text-emerald-600"></i>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{savedRules.length}</div>
            <div className="text-xs text-slate-400">ルールセット数</div>
          </div>
        </div>
      </div>

      {/* 入力セクション */}
      {!analysisResult && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-upload text-indigo-500"></i>
            資料を入力
          </h3>

          {/* タブ切り替え */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveInputTab('text')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                activeInputTab === 'text'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <i className="fa-solid fa-keyboard mr-2"></i>
              テキスト入力
            </button>
            <button
              onClick={() => setActiveInputTab('file')}
              className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                activeInputTab === 'file'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <i className="fa-solid fa-file-arrow-up mr-2"></i>
              PDF / 画像アップロード
            </button>
          </div>

          {/* テキスト入力 */}
          {activeInputTab === 'text' && (
            <div>
              <textarea
                rows={10}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-700 leading-relaxed resize-none"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="運用マニュアル、デザインガイドライン、ブランドルールなどのテキストを貼り付けてください（50文字以上）"
              />
              <div className="mt-2 text-right text-xs text-slate-400">
                {textContent.length}文字 {textContent.length < 50 && '/ 50文字以上入力してください'}
              </div>
            </div>
          )}

          {/* ファイルアップロード */}
          {activeInputTab === 'file' && (
            <div className="space-y-4">
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {fileNames.map((name, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <i className={`fa-solid ${name.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-image text-blue-500'} text-sm`}></i>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="text-slate-300 hover:text-red-500 transition-all"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-300 mb-3 block"></i>
                <p className="text-sm font-bold text-slate-500">クリックしてファイルを選択</p>
                <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG に対応（5MB以下）</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* 分析ボタン */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
              !canAnalyze || analyzing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:scale-[1.02] shadow-indigo-200'
            }`}
          >
            {analyzing ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                AIが分析中...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                AIでルールを抽出する
              </>
            )}
          </button>
        </div>
      )}

      {/* 分析結果プレビュー */}
      {analysisResult && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <i className="fa-solid fa-sparkles text-indigo-500"></i>
                抽出結果
              </h3>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                placeholder="タイトルを編集"
              />
              <p className="text-sm text-slate-500 mt-2">{analysisResult.source_summary}</p>
            </div>
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-slate-400 hover:text-slate-600 ml-4"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          <div className="space-y-3">
            {analysisResult.rules.map((rule, idx) => {
              const config = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.strategy;
              return (
                <div key={idx} className={`p-4 rounded-2xl border border-${config.color}-100 bg-${config.color}-50/50`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${config.color}-100 text-${config.color}-700`}>
                          <i className={`fa-solid ${config.icon} mr-1`}></i>
                          {config.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rule.importance === 'high' ? 'bg-red-100 text-red-700' :
                          rule.importance === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          重要度: {IMPORTANCE_LABEL[rule.importance] || rule.importance}
                        </span>
                      </div>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        value={rule.rule}
                        onChange={(e) => handleEditRule(idx, 'rule', e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1 ml-1">{rule.context}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-300 hover:text-red-500 transition-all flex-shrink-0 mt-2"
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {analysisResult.rules.length === 0 ? (
            <p className="text-center text-slate-400 py-4">ルールがありません</p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setAnalysisResult(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  saving
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:scale-[1.02]'
                }`}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
                    保存中...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check mr-2"></i>
                    {analysisResult.rules.length}件のルールを保存
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 保存済みルール一覧 */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <i className="fa-solid fa-book-open text-slate-400"></i>
          保存済みルール
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-circle-notch animate-spin text-2xl text-indigo-500"></i>
          </div>
        ) : savedRules.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
            <i className="fa-solid fa-graduation-cap text-4xl text-slate-300 mb-4"></i>
            <p className="text-slate-500 mb-2">まだ学習ルールがありません</p>
            <p className="text-sm text-slate-400">上のフォームから資料を分析してルールを追加してください</p>
          </div>
        ) : (
          savedRules.map(ruleSet => (
            <div key={ruleSet.id} className={`bg-white rounded-3xl p-6 shadow-sm border transition-all ${
              ruleSet.is_active ? 'border-slate-100' : 'border-slate-100 opacity-50'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold text-slate-900">{ruleSet.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ruleSet.source_type === 'text' ? 'bg-blue-100 text-blue-600' :
                      ruleSet.source_type === 'pdf' ? 'bg-red-100 text-red-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {ruleSet.source_type === 'text' ? 'テキスト' : ruleSet.source_type === 'pdf' ? 'PDF' : '画像'}
                    </span>
                    <span className="text-xs text-slate-400">{ruleSet.rules.length}件</span>
                  </div>
                  {ruleSet.source_summary && (
                    <p className="text-sm text-slate-500">{ruleSet.source_summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(ruleSet)}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      ruleSet.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      ruleSet.is_active ? 'left-[26px]' : 'left-0.5'
                    }`}></div>
                  </button>
                  <button
                    onClick={() => handleDelete(ruleSet.id)}
                    className="text-slate-300 hover:text-red-500 transition-all"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ruleSet.rules.slice(0, 5).map((rule, idx) => {
                  const config = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.strategy;
                  return (
                    <span key={idx} className={`px-3 py-1.5 rounded-xl text-xs font-bold bg-${config.color}-50 text-${config.color}-700 border border-${config.color}-100`}>
                      {rule.rule.length > 30 ? rule.rule.substring(0, 30) + '...' : rule.rule}
                    </span>
                  );
                })}
                {ruleSet.rules.length > 5 && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-500">
                    +{ruleSet.rules.length - 5}件
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LearningCenter;
