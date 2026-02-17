
import React, { useState, useEffect } from 'react';
import { View, BrandInfo, CompetitorPattern } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StrategyEditor from './components/StrategyEditor';
import ScriptGenerator from './components/ScriptGenerator';
import BrandLibrary from './components/BrandLibrary';
import GrowthLogComponent from './components/GrowthLog';
import ScriptHistory from './components/ScriptHistory';
import { brandsApi, patternsApi } from './services/apiClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    name: 'Herbal Zen',
    productDescription: 'オーガニックハーブティー、リラックス効果、睡眠導入',
    targetAudience: '仕事が忙しい20-40代の女性',
    brandTone: '丁寧で落ち着いた、専門的なアドバイス'
  });

  const defaultPatterns: CompetitorPattern[] = [
    {
      id: 'default-1',
      name: 'ストーリー物販王道の型',
      description: '悩みの言語化から解決策を提示し、限定性を煽って購入へ導く。',
      slides: [
        { order: 1, purpose: '共感フック', visualGuidance: '悩みを連想させる日常シーン' },
        { order: 2, purpose: '問題提起', visualGuidance: 'テキスト中心の静止画' },
        { order: 3, purpose: '解決策（商品紹介）', visualGuidance: '商品を手に取るクローズアップ' },
        { order: 4, purpose: '使用感・証拠', visualGuidance: '実際に使用しているシーン' },
        { order: 5, purpose: 'CTA', visualGuidance: 'リンクステッカー付きの静止画' },
      ],
      skeleton: {
        template_name: 'ストーリー物販王道の型',
        category: '物販・EC',
        total_slides: 5,
        skeleton: [
          { slide_number: 1, role: '共感フック', recommended_elements: ['疑問文', '数字', '意外性'], copy_pattern: '「〇〇で悩んでいませんか？」', visual_instruction: '悩みを連想させる日常シーンの動画または写真' },
          { slide_number: 2, role: '問題提起', recommended_elements: ['具体的な悩み', '共感ワード'], copy_pattern: '「実は〇〇が原因かも…」', visual_instruction: 'テキスト中心のシンプルな背景' },
          { slide_number: 3, role: '解決策（商品紹介）', recommended_elements: ['商品名', '特徴', 'ベネフィット'], copy_pattern: '「そんな方におすすめなのが〇〇」', visual_instruction: '商品のクローズアップ、手に取っているシーン' },
          { slide_number: 4, role: '使用感・証拠', recommended_elements: ['体験談', 'ビフォーアフター', '口コミ'], copy_pattern: '「使ってみたら〇〇が変わった！」', visual_instruction: '実際に使用しているシーンや変化がわかる写真' },
          { slide_number: 5, role: 'CTA', recommended_elements: ['限定性', '行動喚起', 'リンクステッカー'], copy_pattern: '「今だけ〇〇！リンクはここから」', visual_instruction: 'リンクステッカー付き、目立つ背景色の静止画' },
        ],
        summary: {
          best_for: '物販・EC商品の販売促進ストーリーズ',
          key_success_factors: ['冒頭の共感フックで離脱を防ぐ', '商品ベネフィットを具体的に伝える', 'CTAで明確な行動を促す']
        }
      }
    }
  ];

  const [savedPatterns, setSavedPatterns] = useState<CompetitorPattern[]>(defaultPatterns);

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

    patternsApi.getAll().then((data: any[]) => {
      if (data.length > 0) {
        const convertedPatterns: CompetitorPattern[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          account_name: p.account_name,
          category: p.category,
          slides: p.skeleton?.skeleton?.map((s: any, idx: number) => ({
            order: s.slide_number || idx + 1,
            purpose: s.role || '',
            visualGuidance: s.visual_instruction || ''
          })) || [],
          skeleton: p.skeleton
        }));
        setSavedPatterns([...defaultPatterns, ...convertedPatterns]);
      }
    }).catch(() => {});
  }, []);

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
      case View.SCRIPT_HISTORY:
        return <ScriptHistory onNavigate={setCurrentView} />;
      case View.GROWTH_LOG:
        return <GrowthLogComponent onNavigate={setCurrentView} />;
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
        <button onClick={() => setCurrentView(View.SCRIPT_HISTORY)} className={`flex flex-col items-center gap-1 ${currentView === View.SCRIPT_HISTORY ? 'text-pink-500' : 'text-slate-400'}`}>
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span className="text-[10px] font-bold">History</span>
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
