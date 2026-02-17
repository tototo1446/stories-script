
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems = [
    { id: View.DASHBOARD, label: 'ダッシュボード', icon: 'fa-chart-pie' },
    { id: View.BRAND_LIBRARY, label: 'ブランド/競合資料', icon: 'fa-book' },
    { id: View.STRATEGY_EDITOR, label: '戦略構築 (AI解析)', icon: 'fa-brain' },
    { id: View.GENERATOR, label: '今日の台本作成', icon: 'fa-pen-to-square' },
    { id: View.SCRIPT_HISTORY, label: '生成履歴', icon: 'fa-clock-rotate-left' },
    { id: View.GROWTH_LOG, label: '学習ログ', icon: 'fa-arrow-up-right-dots' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white p-6 z-50 transition-transform hidden md:block">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-yellow-500 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-bolt text-sm"></i>
        </div>
        <h1 className="text-xl font-bold tracking-tight">StoryFlow AI</h1>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === item.id 
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-10 left-6 right-6">
        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Pro Plan Status</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="w-4/5 h-full bg-gradient-to-r from-green-400 to-cyan-400"></div>
            </div>
            <span className="text-xs font-bold">80%</span>
          </div>
          <button className="w-full text-xs font-bold py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            Manage Subscription
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
