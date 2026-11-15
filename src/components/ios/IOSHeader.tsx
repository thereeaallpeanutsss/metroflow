import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
  Compass,
  Navigation,
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
  hasMinimizedActiveRide?: boolean;
  activeRideEta?: string | null;
  onOpenActiveRide?: () => void;
  onStatusWindowOpenChange?: (isOpen: boolean) => void;
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({
  language,
  theme,
  onToggleTheme,
  onNavigateToTab,
  disruptions = [],
  hasMinimizedActiveRide = false,
  activeRideEta = null,
  onOpenActiveRide,
  onStatusWindowOpenChange,
}) => {
  const t = translations[language];
  const isOnline = useOnlineStatus();
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    onStatusWindowOpenChange?.(isIslandExpanded);
  }, [isIslandExpanded, onStatusWindowOpenChange]);

  useEffect(() => {
    return () => {
      onStatusWindowOpenChange?.(false);
    };
  }, [onStatusWindowOpenChange]);

  const activeDisruptionsCount = disruptions.filter((d) => d.isActive).length;
  const isAllClear = activeDisruptionsCount === 0;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [language]);

  const statusLabel = isAllClear
    ? language === 'de'
      ? 'Normalbetrieb'
      : 'All Normal'
    : `${activeDisruptionsCount} ${
        activeDisruptionsCount === 1
          ? language === 'de'
            ? 'Störung'
            : 'Alert'
          : language === 'de'
          ? 'Störungen'
          : 'Alerts'
      }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full pt-[env(safe-area-inset-top)] select-none">
      {/* Background Frosted Glass Bar */}
      <div className="w-full bg-[#F2F2F7]/85 dark:bg-black/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
          {/* Left: iOS App Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-[10px] overflow-hidden shadow-sm shadow-black/25 ring-1 ring-black/10 dark:ring-white/15 shrink-0"
            >
              <img
                src={`${import.meta.env.BASE_URL}app-icon.png`}
                alt="MetroFlow"
                className="w-full h-full object-cover"
              />
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
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                {language === 'de' ? 'iOS U-Bahn Navigator' : 'iOS Metro Navigator'}
              </p>
            </div>
          </div>

          {/* Desktop/Tablet Center: Apple Dynamic Island Pill + Optional Active Ride Pill */}
          <div className="hidden sm:flex items-center justify-center gap-2 min-w-0 px-1">
            <div className="relative min-w-0">
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
                <span className="relative flex h-2 w-2 shrink-0">
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
                  {statusLabel}
                </span>

                {currentTime && (
                  <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 shrink-0 font-mono font-medium tabular-nums">
                    {currentTime}
                  </span>
                )}
              </motion.button>
            </div>

            {hasMinimizedActiveRide && onOpenActiveRide && (
              <motion.button
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic.selection();
                  onOpenActiveRide();
                }}
                className="px-3 py-1.5 rounded-full flex items-center gap-1.5 border bg-emerald-950/95 text-emerald-300 border-emerald-500/50 hover:border-emerald-400 shadow-sm shadow-emerald-500/20 cursor-pointer shrink-0 whitespace-nowrap transition-all"
                title={t.rideModeTitle}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold tracking-tight text-white">
                  {t.activeRide}
                </span>
                {activeRideEta && (
                  <span className="text-[10px] text-emerald-200 border-l border-emerald-600/70 pl-1.5 shrink-0 font-mono font-semibold tabular-nums">
                    {t.etaCompact} {activeRideEta}
                  </span>
                )}
              </motion.button>
            )}
          </div>

          {/* Right Side: Connectivity & Theme Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Online Indicator Badge */}
            <div
              className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
              title={isOnline ? t.onlineStatus : t.offlineStatus}
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
              className="w-8 h-8 sm:w-auto sm:h-auto sm:p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
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

        {/* Mobile Dynamic Island + Active Ride Equal-Width Pill Strip */}
        <div
          className={`sm:hidden max-w-5xl mx-auto px-3.5 pb-2 pt-0.5 grid gap-2 ${
            hasMinimizedActiveRide && onOpenActiveRide ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <motion.button
            onClick={() => {
              haptic.selection();
              setIsIslandExpanded((prev) => !prev);
            }}
            whileTap={{ scale: 0.98 }}
            className={`w-full min-w-0 h-9 px-2.5 rounded-full flex items-center justify-between gap-1.5 border transition-all cursor-pointer shadow-xs ${
              isAllClear
                ? 'bg-black/90 dark:bg-zinc-900/95 text-white border-black/15 dark:border-zinc-700/70'
                : 'bg-black/95 dark:bg-zinc-950/95 text-amber-300 border-amber-500/45'
            }`}
            title={
              language === 'de'
                ? 'Tippen für Dynamic Island Netzstatus'
                : 'Tap for Dynamic Island transit status'
            }
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
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
              <span className="text-[11px] font-semibold tracking-tight text-white truncate">
                {statusLabel}
              </span>
            </span>

            {currentTime && (
              <span className="text-[10px] text-slate-300 border-l border-slate-700/80 pl-1.5 shrink-0 font-mono font-semibold tabular-nums">
                {currentTime}
              </span>
            )}
          </motion.button>

          {hasMinimizedActiveRide && onOpenActiveRide && (
            <motion.button
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic.selection();
                onOpenActiveRide();
              }}
              className="w-full min-w-0 h-9 px-2.5 rounded-full flex items-center justify-between gap-1.5 border bg-emerald-950/95 text-emerald-300 border-emerald-500/50 hover:border-emerald-400 shadow-xs shadow-emerald-500/20 cursor-pointer transition-all"
              title={t.rideModeTitle}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold tracking-tight text-white truncate">
                  {t.activeRide}
                </span>
              </span>

              {activeRideEta && (
                <span className="text-[10px] text-emerald-200 border-l border-emerald-600/70 pl-1.5 shrink-0 font-mono font-semibold tabular-nums">
                  {t.etaCompact} {activeRideEta}
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Expanded Dynamic Island Dropdown Card (viewport-centered on mobile & desktop) */}
      <AnimatePresence>
        {isIslandExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 6 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="mx-auto mt-1 w-[calc(100vw-1.5rem)] max-w-sm p-4 rounded-3xl bg-black/95 text-white shadow-2xl border border-zinc-800 backdrop-blur-2xl z-50 space-y-3"
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
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">{currentTime}</span>
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
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.planner}</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
              <button
                onClick={() => {
                  haptic.selection();
                  setIsIslandExpanded(false);
                  onNavigateToTab?.('lines');
                }}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.lines}</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
