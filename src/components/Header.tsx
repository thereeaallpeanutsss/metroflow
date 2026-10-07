import React from 'react';
import { motion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import { TrainFront, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AppTab } from './TabBar';

interface HeaderProps {
  language: Language;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeTab?: AppTab;
}

export const Header: React.FC<HeaderProps> = ({ language, theme, onToggleTheme }) => {
  const t = translations[language];
  const isOnline = useOnlineStatus();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 pt-[env(safe-area-inset-top)] transition-colors shadow-xs">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0"
          >
            <TrainFront className="w-4 h-4 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">MetroFlow</h1>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                044
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right side actions: Online/Offline status + Quick theme toggle + PWA install button */}
        <div className="flex items-center gap-2">
          {/* Online / Offline Status Badge */}
          <div
            className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-colors ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}
            title={isOnline ? t.onlineStatus : t.offlineDisruptionWarning}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isOnline ? (
              <span className="hidden xs:inline">{t.onlineStatus}</span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="w-2.5 h-2.5" />
                <span>{t.offlineStatus}</span>
              </span>
            )}
          </div>
          <motion.button
            onClick={() => {
              haptic.light();
              onToggleTheme();
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
            title={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </motion.div>
          </motion.button>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
