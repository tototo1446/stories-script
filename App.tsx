
import React, { useState, useEffect } from 'react';
import { View, BrandInfo, CompetitorPattern } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StrategyEditor from './components/StrategyEditor';
import ScriptGenerator from './components/ScriptGenerator';
import BrandLibrary from './components/BrandLibrary';
import GrowthLog from './components/GrowthLog';
import { brandsApi } from './services/apiClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    name: 'Herbal Zen',
    productDescription: 'オーガニックハーブティー、リラックス効果、睡眠導入',
    targetAudience: '仕事が忙しい20-40代の女性',
    brandTone: '丁寧で落ち着いた、専門的なアドバイス'
  });

  useEffect(() => {
    brandsApi.get().then((data: any) => {
      if (data) {
        setBrandInfo({
          id: data.id,
          name: data.name,
          productDescription: data.product_description,
          targetAudience: data.target_audience,
          brandTone: data.brand_tone
        });
      }
    }).catch(() => {});
  }, []);

  // Initial sample data
  const [savedPatterns, setSavedPatterns] = useState<CompetitorPattern[]>([
    {
      id: 'default-1',
      name: 'ストーリー物販王道の型',
      description: '悩みの言語化から解決策を提示し、限定性を煽って購入へ導く。',
      slides: [
        { order: 1, purpose: '共感の呼びかけ', visualGuidance: '夕方のリラックスタイムの動画' },
        { order: 2, purpose: '商品紹介', visualGuidance: 'お湯を注ぐ手元のアップ' },
        { order: 3, purpose: 'CTA', visualGuidance: 'リンクステッカー付きの静止画' },
      ]
    }
  ]);

  const handlePatternCreated = (pattern: CompetitorPattern) => {
    setSavedPatterns(prev => [pattern, ...prev]);
    setCurrentView(View.DASHBOARD);
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard 
          onNavigate={setCurrentView} 
          savedPatterns={savedPatterns}
          onPatternsUpdate={setSavedPatterns}
        />;
      case View.STRATEGY_EDITOR:
        return <StrategyEditor onPatternCreated={handlePatternCreated} />;
      case View.GENERATOR:
        return <ScriptGenerator 
          brandInfo={brandInfo} 
          patterns={savedPatterns} 
          onFinish={() => setCurrentView(View.GROWTH_LOG)} 
        />;
      case View.GROWTH_LOG:
        return <GrowthLog onNavigate={setCurrentView} />;
      case View.BRAND_LIBRARY:
        return (
          <BrandLibrary 
            brandInfo={brandInfo} 
            onBrandUpdate={setBrandInfo}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentView} savedPatterns={savedPatterns} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="md:ml-64 p-6 md:p-10 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => setCurrentView(View.DASHBOARD)} className={`flex flex-col items-center gap-1 ${currentView === View.DASHBOARD ? 'text-pink-500' : 'text-slate-400'}`}>
          <i className="fa-solid fa-house"></i>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => setCurrentView(View.GENERATOR)} className={`flex flex-col items-center gap-1 ${currentView === View.GENERATOR ? 'text-pink-500' : 'text-slate-400'}`}>
          <i className="fa-solid fa-pen-nib"></i>
          <span className="text-[10px] font-bold">Write</span>
        </button>
        <button onClick={() => setCurrentView(View.STRATEGY_EDITOR)} className={`flex flex-col items-center gap-1 ${currentView === View.STRATEGY_EDITOR ? 'text-pink-500' : 'text-slate-400'}`}>
          <i className="fa-solid fa-brain"></i>
          <span className="text-[10px] font-bold">AI</span>
        </button>
        <button onClick={() => setCurrentView(View.BRAND_LIBRARY)} className={`flex flex-col items-center gap-1 ${currentView === View.BRAND_LIBRARY ? 'text-pink-500' : 'text-slate-400'}`}>
          <i className="fa-solid fa-user"></i>
          <span className="text-[10px] font-bold">Brand</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default App;
