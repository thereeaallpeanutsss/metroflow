import React from 'react';
import { motion } from 'motion/react';
import { Home, Compass, Map, Layers, Settings } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

export type AppTab = 'home' | 'plan' | 'map' | 'lines' | 'options';
export type TabBarStyle = 'ios26' | 'classic';

interface TabBarProps {
  language: Language;
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  tabBarStyle?: TabBarStyle;
}

export const TabBar: React.FC<TabBarProps> = ({
  language,
  activeTab,
  onChangeTab,
  tabBarStyle = 'ios26',
}) => {
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

  // ----------------------------------------------------
  // 1. Classic Full-Width Edge-to-Edge Navigation Bar
  // ----------------------------------------------------
  if (tabBarStyle === 'classic') {
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
                      layoutId="activeTabIndicatorClassic"
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
  }

  // ----------------------------------------------------
  // 2. iOS 26 Floating Glass Pill Dock (Beta 6 Design)
  // ----------------------------------------------------
  return (
    <nav className="fixed bottom-[max(env(safe-area-inset-bottom),0.85rem)] left-1/2 -translate-x-1/2 z-40 w-auto max-w-[96vw] sm:max-w-md pointer-events-auto">
      {/* Outer Floating Frosted Acrylic Pill */}
      <div className="relative p-1.5 rounded-full bg-white/70 dark:bg-black/65 backdrop-blur-3xl border border-white/40 dark:border-white/15 shadow-[0_12px_42px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.7)] flex items-center gap-1">
        {/* Soft specular rim glow */}
        <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-white/20 dark:ring-white/10" />

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
              whileTap={{ scale: 0.92 }}
              className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-full flex flex-col items-center justify-center min-w-[3.4rem] sm:min-w-[4rem] transition-colors select-none ${
                isActive
                  ? 'text-sky-600 dark:text-sky-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {/* iOS 26 Chromatic Glass Lens Capsule for Active Tab */}
              {isActive && (
                <motion.div
                  layoutId="ios26GlassPill"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/50 dark:border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(14,165,233,0.22)] backdrop-blur-md overflow-hidden"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                >
                  {/* Iridescent / chromatic refraction gleam on top & bottom rim */}
                  <div className="absolute inset-x-2 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/90 to-transparent" />
                  <div className="absolute inset-x-3 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
                </motion.div>
              )}

              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center mb-0.5">
                <Icon
                  className={`w-4 h-4 sm:w-[1.15rem] sm:h-[1.15rem] transition-transform duration-200 ${
                    isActive ? 'scale-110 drop-shadow-[0_2px_8px_rgba(56,189,248,0.45)]' : ''
                  }`}
                />
              </div>

              {/* Label */}
              <span className="text-[9.5px] sm:text-[10px] tracking-tight relative z-10 leading-tight">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
