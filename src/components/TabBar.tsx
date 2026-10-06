import React from 'react';
import { motion } from 'motion/react';
import { Home, Compass, Map, Layers, Settings } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

export type AppTab = 'home' | 'plan' | 'map' | 'lines' | 'options';

interface TabBarProps {
  language: Language;
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ language, activeTab, onChangeTab }) => {
  const t = translations[language];

  const tabs: Array<{
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'plan', label: t.planner, icon: Compass },
    { id: 'map', label: t.map, icon: Map },
    { id: 'lines', label: t.lines, icon: Layers },
    { id: 'options', label: t.options, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800/80 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-2xl transition-colors">
      <div className="max-w-md mx-auto px-4 flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                haptic.selection();
                onChangeTab(tab.id);
              }}
              whileTap={{ scale: 0.9 }}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative p-1 rounded-xl">
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-500/15 dark:bg-blue-400/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
              </div>
              <span className="text-[10px] font-semibold tracking-tight relative z-10">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
