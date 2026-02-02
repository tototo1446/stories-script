import React, { useState, useEffect } from 'react';
import { BrandInfo } from '../types';
import { brandsApi } from '../services/apiClient';
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

  useEffect(() => {
    loadBrand();
  }, []);

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
          brandTone: data.brand_tone
        };
        setBrand(brandData);
        onBrandUpdate(brandData);
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (brand.id) {
        // 更新
        await brandsApi.update(brand.id, {
          name: brand.name,
          product_description: brand.productDescription,
          target_audience: brand.targetAudience,
          brand_tone: brand.brandTone
        });
      } else {
        // 新規作成
        const data = await brandsApi.create({
          name: brand.name,
          product_description: brand.productDescription,
          target_audience: brand.targetAudience,
          brand_tone: brand.brandTone
        });
        setBrand({ ...brand, id: data.id });
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
        <p className="text-slate-500">自社の商品情報、ターゲット、ブランドトーンを設定します</p>
      </header>

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

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ブランド名 / 商品名
          </label>
          <input
            type="text"
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            value={brand.name}
            onChange={(e) => setBrand({ ...brand, name: e.target.value })}
            placeholder="例: Herbal Zen"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            商品説明
          </label>
          <textarea
            rows={4}
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none"
            value={brand.productDescription}
            onChange={(e) => setBrand({ ...brand, productDescription: e.target.value })}
            placeholder="例: オーガニックハーブティー、リラックス効果、睡眠導入"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ターゲットオーディエンス
          </label>
          <input
            type="text"
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            value={brand.targetAudience}
            onChange={(e) => setBrand({ ...brand, targetAudience: e.target.value })}
            placeholder="例: 仕事が忙しい20-40代の女性"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ブランドトーン
          </label>
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

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <i className="fa-solid fa-lightbulb"></i>
          ナレッジベース機能（今後実装予定）
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• 商品URL、パンフレット、LPの登録</li>
          <li>• インスタの「ストーリーズの基礎知識」の事前学習</li>
          <li>• リーガル・フィルタリング（薬機法、景表法）</li>
        </ul>
      </div>
    </div>
  );
};

export default BrandLibrary;
