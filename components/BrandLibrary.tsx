import React, { useState, useEffect } from 'react';
import { BrandInfo, CompetitorPattern, KnowledgeSource } from '../types';
import { brandsApi, patternsApi } from '../services/apiClient';
import { ApiError } from '../services/apiClient';

interface BrandLibraryProps {
  brandInfo: BrandInfo;
  onBrandUpdate: (brand: BrandInfo) => void;
}

const BrandLibrary: React.FC<BrandLibraryProps> = ({ brandInfo, onBrandUpdate }) => {
  const [brand, setBrand] = useState<BrandInfo>(brandInfo);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'archive' | 'knowledge'>('brand');
  const [competitorPatterns, setCompetitorPatterns] = useState<CompetitorPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [knowledgeUrl, setKnowledgeUrl] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadBrand();
  }, []);

  useEffect(() => {
    if (activeTab === 'archive') {
      loadCompetitorPatterns();
    }
  }, [activeTab]);

  const loadBrand = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brandsApi.get();
      if (data) {
        const brandData: BrandInfo = {
          id: data.id,
          name: data.name,
          productDescription: data.product_description,
          targetAudience: data.target_audience,
          brandTone: data.brand_tone,
          logoUrl: data.logo_url || undefined,
          knowledgeSources: data.knowledge_sources || [],
        };
        setBrand(brandData);
        onBrandUpdate(brandData);
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode !== 404) {
          setError(err.message);
        }
      } else {
        setError('ブランド情報の読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitorPatterns = async () => {
    setPatternsLoading(true);
    try {
      const data = await patternsApi.getAll();
      const converted: CompetitorPattern[] = data.map((p: any) => ({
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
        skeleton: p.skeleton,
      }));
      setCompetitorPatterns(converted);
    } catch (err) {
      console.error('Failed to load patterns:', err);
    } finally {
      setPatternsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (brand.id) {
        await brandsApi.update(brand.id, {
          name: brand.name,
          product_description: brand.productDescription,
          target_audience: brand.targetAudience,
          brand_tone: brand.brandTone,
        });
      } else {
        const data = await brandsApi.create({
          name: brand.name,
          product_description: brand.productDescription,
          target_audience: brand.targetAudience,
          brand_tone: brand.brandTone,
        });
        const createdBrand = { ...brand, id: data.id };
        setBrand(createdBrand);
        onBrandUpdate(createdBrand);
        setSuccess(true);
        return;
      }
      setSuccess(true);
      onBrandUpdate(brand);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setBrand({ ...brand, logoUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const handleAddKnowledge = () => {
    if (!knowledgeTitle) return;
    const source: KnowledgeSource = {
      type: knowledgeUrl ? 'url' : 'text',
      title: knowledgeTitle,
      content: knowledgeUrl || knowledgeText,
      addedAt: new Date().toISOString(),
    };
    const updated = [...(brand.knowledgeSources || []), source];
    setBrand({ ...brand, knowledgeSources: updated });
    setKnowledgeUrl('');
    setKnowledgeText('');
    setKnowledgeTitle('');
  };

  const handleRemoveKnowledge = (index: number) => {
    const updated = (brand.knowledgeSources || []).filter((_, i) => i !== index);
    setBrand({ ...brand, knowledgeSources: updated });
  };

  const handleDeletePattern = async (id: string) => {
    if (!confirm('このパターンを削除しますか？')) return;
    try {
      await patternsApi.delete(id);
      setCompetitorPatterns(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete pattern:', err);
    }
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

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">ブランド・ライブラリ</h2>
        <p className="text-slate-500">自社資料と競合アーカイブを管理します</p>
      </header>

      {/* タブナビゲーション */}
      <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
        {[
          { key: 'brand' as const, label: 'ブランド情報', icon: 'fa-building' },
          { key: 'archive' as const, label: '競合アーカイブ', icon: 'fa-chart-column' },
          { key: 'knowledge' as const, label: 'ナレッジベース', icon: 'fa-book' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <i className="fa-solid fa-circle-exclamation text-red-500"></i>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <i className="fa-solid fa-check-circle text-green-500"></i>
          <p className="text-green-700 text-sm">保存しました</p>
        </div>
      )}

      {/* ブランド情報タブ */}
      {activeTab === 'brand' && (
        <div className="space-y-6">
          {/* ロゴ設定 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-3">ロゴ</label>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <i className="fa-solid fa-image text-2xl text-slate-300"></i>
                )}
              </div>
              <div>
                <label className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all cursor-pointer">
                  <i className="fa-solid fa-upload mr-2"></i>
                  画像を選択
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoPreview && (
                  <button
                    onClick={() => { setLogoPreview(null); setBrand({ ...brand, logoUrl: undefined }); }}
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ブランド情報フォーム */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ブランド名 / 商品名</label>
              <input
                type="text"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                value={brand.name}
                onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                placeholder="例: Herbal Zen"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">商品説明</label>
              <textarea
                rows={4}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none"
                value={brand.productDescription}
                onChange={(e) => setBrand({ ...brand, productDescription: e.target.value })}
                placeholder="例: オーガニックハーブティー、リラックス効果、睡眠導入"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ターゲットオーディエンス</label>
              <input
                type="text"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                value={brand.targetAudience}
                onChange={(e) => setBrand({ ...brand, targetAudience: e.target.value })}
                placeholder="例: 仕事が忙しい20-40代の女性"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ブランドトーン</label>
              <textarea
                rows={3}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none"
                value={brand.brandTone}
                onChange={(e) => setBrand({ ...brand, brandTone: e.target.value })}
                placeholder="例: 丁寧で落ち着いた、専門的なアドバイス"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !brand.name || !brand.productDescription || !brand.targetAudience || !brand.brandTone}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                  saving || !brand.name || !brand.productDescription || !brand.targetAudience || !brand.brandTone
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-[1.02] shadow-pink-200'
                }`}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    保存中...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    保存する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 競合アーカイブタブ */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          {patternsLoading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fa-solid fa-circle-notch animate-spin text-2xl text-pink-500"></i>
            </div>
          ) : competitorPatterns.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
              <i className="fa-solid fa-chart-column text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500 mb-2">まだ競合分析データがありません</p>
              <p className="text-sm text-slate-400">戦略構築エディタで競合のストーリーズを分析してください</p>
            </div>
          ) : (
            competitorPatterns.map(pattern => (
              <div key={pattern.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">{pattern.name}</h3>
                      {pattern.is_favorite && (
                        <i className="fa-solid fa-star text-yellow-400 text-sm"></i>
                      )}
                    </div>
                    {pattern.account_name && (
                      <p className="text-sm text-pink-500 font-bold">@{pattern.account_name}</p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">{pattern.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePattern(pattern.id)}
                    className="text-slate-300 hover:text-red-500 transition-all"
                    title="削除"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>

                {pattern.skeleton && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">スケルトン構成</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {pattern.skeleton.skeleton.map((slide, idx) => (
                        <div key={idx} className="flex-shrink-0 w-36 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-[10px] font-bold text-pink-500 mb-1">{slide.slide_number}枚目</div>
                          <div className="text-xs font-bold text-slate-800 mb-1">{slide.role}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-2">{slide.copy_pattern}</div>
                        </div>
                      ))}
                    </div>
                    {pattern.skeleton.summary && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-800">
                          <span className="font-bold">最適:</span> {pattern.skeleton.summary.best_for}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ナレッジベースタブ */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* 実装済み機能の表示 */}
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
            <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-check-circle"></i>
              実装済みの自動学習機能
            </h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>- ストーリーズの基礎知識（フォーマット、文字数、エンゲージメント手法）をAIに事前学習済み</li>
              <li>- 薬機法・景表法のNG表現を43パターン以上で自動検出</li>
            </ul>
          </div>

          {/* URL/LP/テキスト登録 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-plus-circle text-pink-500"></i>
              商品資料を追加
            </h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">タイトル</label>
              <input
                type="text"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                value={knowledgeTitle}
                onChange={(e) => setKnowledgeTitle(e.target.value)}
                placeholder="例: 商品LP、パンフレット要約"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">商品URL（LP・商品ページ等）</label>
              <input
                type="url"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                value={knowledgeUrl}
                onChange={(e) => setKnowledgeUrl(e.target.value)}
                placeholder="https://example.com/product"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs text-slate-400 font-bold">または</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">テキスト情報（パンフレット内容等）</label>
              <textarea
                rows={4}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none"
                value={knowledgeText}
                onChange={(e) => setKnowledgeText(e.target.value)}
                placeholder="商品の特長、成分、使用方法などを貼り付けてください"
              />
            </div>

            <button
              onClick={handleAddKnowledge}
              disabled={!knowledgeTitle || (!knowledgeUrl && !knowledgeText)}
              className={`w-full py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                !knowledgeTitle || (!knowledgeUrl && !knowledgeText)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-black'
              }`}
            >
              <i className="fa-solid fa-plus"></i>
              ナレッジに追加
            </button>
          </div>

          {/* 登録済みナレッジ一覧 */}
          {(brand.knowledgeSources || []).length > 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">登録済みの資料</h3>
              <div className="space-y-3">
                {(brand.knowledgeSources || []).map((source, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        source.type === 'url' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <i className={`fa-solid ${source.type === 'url' ? 'fa-link' : 'fa-file-lines'} text-sm`}></i>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{source.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {source.type === 'url' ? source.content : `${source.content.substring(0, 50)}...`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveKnowledge(idx)}
                      className="text-slate-300 hover:text-red-500 transition-all"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:scale-[1.02] transition-all"
              >
                {saving ? '保存中...' : 'ナレッジを保存'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLibrary;
