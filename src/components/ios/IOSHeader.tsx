import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  TrainFront,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Layers,
  Compass,
} from 'lucide-react';
import { Language, translations } from '../../utils/i18n';
import { haptic } from '../../utils/haptics';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { AppTab } from '../TabBar';
import { Disruption } from '../../types/metro';

interface IOSHeaderProps {
  language: Language;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeTab?: AppTab;
  onNavigateToTab?: (tab: AppTab) => void;
  disruptions?: Disruption[];
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({
  language,
  theme,
  onToggleTheme,
  activeTab,
  onNavigateToTab,
  disruptions = [],
}) => {
  const t = translations[language];
  const isOnline = useOnlineStatus();
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const activeDisruptionsCount = disruptions.length;
  const isAllClear = activeDisruptionsCount === 0;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [language]);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full pt-[env(safe-area-inset-top)] select-none">
      {/* Background Frosted Glass Bar */}
      <div className="w-full bg-[#F2F2F7]/80 dark:bg-black/75 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: iOS App Identity */}
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm shadow-blue-500/25 shrink-0"
            >
              <TrainFront className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  MetroFlow
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  044
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                {language === 'de' ? 'iOS U-Bahn Navigator' : 'iOS Metro Navigator'}
              </p>
            </div>
          </div>

          {/* Center: Apple Dynamic Island Pill */}
          <div className="relative">
            <motion.button
              onClick={() => {
                haptic.selection();
                setIsIslandExpanded((prev) => !prev);
              }}
              whileTap={{ scale: 0.96 }}
              className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition-all cursor-pointer shadow-sm ${
                isAllClear
                  ? 'bg-black/90 dark:bg-zinc-900/90 text-white border-black/20 dark:border-zinc-700/60'
                  : 'bg-black/95 dark:bg-zinc-900/95 text-amber-300 border-amber-500/40'
              }`}
              title={
                language === 'de'
                  ? 'Tippen für Dynamic Island Netzstatus'
                  : 'Tap for Dynamic Island transit status'
              }
            >
              {/* Pulsating status dot */}
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isAllClear ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isAllClear ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>

              <span className="text-[11px] font-semibold tracking-tight text-white">
                {isAllClear
                  ? language === 'de'
                    ? 'Normalbetrieb'
                    : 'All Normal'
                  : `${activeDisruptionsCount} ${
                      language === 'de' ? 'Störung(en)' : 'Alert(s)'
                    }`}
              </span>

              {currentTime && (
                <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 shrink-0 font-mono font-medium">
                  {currentTime}
                </span>
              )}
            </motion.button>

            {/* Expanded Dynamic Island Dropdown Card */}
            <AnimatePresence>
              {isIslandExpanded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 8 }}
                  exit={{ opacity: 0, scale: 0.9, y: 4 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full w-76 sm:w-84 p-4 rounded-3xl bg-black/95 text-white shadow-2xl border border-zinc-800 backdrop-blur-2xl z-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isAllClear ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {language === 'de' ? 'Netzwerkstatus' : 'Network Status'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{currentTime}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
                    {isAllClear ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">
                        {isAllClear
                          ? language === 'de'
                            ? 'Alle Linien im Takt'
                            : 'All Lines On Schedule'
                          : language === 'de'
                          ? `${activeDisruptionsCount} gemeldete Einschränkung(en)`
                          : `${activeDisruptionsCount} active disruption report(s)`}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isAllClear
                          ? language === 'de'
                            ? 'U1–U9 & IC 10–11 fahrplanmäßig'
                            : 'U1–U9 & IC 10–11 operating normally'
                          : language === 'de'
                          ? 'Tippe auf Linien für Umleitungsdetails'
                          : 'Tap lines tab for detour details'}
                      </div>
                    </div>
                  </div>

                  {/* Quick Shortcut Buttons inside Dynamic Island */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        haptic.selection();
                        setIsIslandExpanded(false);
                        onNavigateToTab?.('plan');
                      }}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Compass className="w-3.5 h-3.5 text-blue-400" />
                      <span>{t.planner}</span>
                    </button>
                    <button
                      onClick={() => {
                        haptic.selection();
                        setIsIslandExpanded(false);
                        onNavigateToTab?.('lines');
                      }}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.lines}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side: Connectivity & Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* Online Indicator Badge */}
            <div
              className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isOnline ? t.onlineStatus : t.offlineStatus}
              </span>
            </div>

            {/* Apple iOS Theme Toggle Button */}
            <motion.button
              onClick={() => {
                haptic.light();
                onToggleTheme();
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              aria-label="Toggle light/dark theme"
            >
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-800" />
                )}
              </motion.div>
            </motion.button>

            <PWAInstallButton />
          </div>
        </div>
      </div>
    </header>
  );
};
