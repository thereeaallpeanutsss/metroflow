import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Sun,
  Moon,
  WifiOff,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  MapPin,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Navigation,
} from 'lucide-react';
import { Language, translations, getDisruptionTypeLabel } from '../utils/i18n';
import { haptic } from '../utils/haptics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AppTab } from './TabBar';
import { Disruption } from '../types/metro';
import { STATIONS, METRO_LINES } from '../data/metroData';

interface HeaderProps {
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
  isTransitTheme?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  theme,
  onToggleTheme,
  activeTab,
  onNavigateToTab,
  disruptions = [],
  hasMinimizedActiveRide = false,
  activeRideEta = null,
  onOpenActiveRide,
  onStatusWindowOpenChange,
  isTransitTheme = false,
}) => {
  const t = translations[language];
  const isOnline = useOnlineStatus();

  // Status modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  useEffect(() => {
    onStatusWindowOpenChange?.(isStatusModalOpen);
  }, [isStatusModalOpen, onStatusWindowOpenChange]);

  useEffect(() => {
    return () => {
      onStatusWindowOpenChange?.(false);
    };
  }, [onStatusWindowOpenChange]);

  // Live time & date state
  const [shortTime, setShortTime] = useState('');
  const [fullTime, setFullTime] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

  const activeDisruptions = disruptions.filter((d) => d.isActive);
  const activeDisruptionsCount = activeDisruptions.length;
  const isAllClear = activeDisruptionsCount === 0;

  // Real-time ticking clock (second-by-second)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      // Format short time: HH:MM
      setShortTime(
        now.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );

      // Format full time: hh:mm:ss
      setFullTime(
        now.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );

      // Format date: dd.mm.yyyy
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setFormattedDate(`${day}.${month}.${year}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const handleOpenStatusModal = () => {
    haptic.selection();
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    haptic.light();
    setIsStatusModalOpen(false);
  };

  const handleNavigateToMap = () => {
    haptic.medium();
    setIsStatusModalOpen(false);
    if (onNavigateToTab) {
      onNavigateToTab('map');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 pt-[env(safe-area-inset-top)] transition-colors shadow-xs select-none">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl overflow-hidden shadow-md shadow-black/20 ring-1 ring-black/10 dark:ring-white/15 shrink-0"
            >
              <img
                src={`${import.meta.env.BASE_URL}app-icon.png`}
                alt="MetroFlow"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  MetroFlow
                </h1>
                <span
                  className={`${
                    hasMinimizedActiveRide
                      ? 'hidden sm:inline-flex'
                      : 'hidden min-[400px]:inline-flex sm:inline-flex'
                  } ${
                    isTransitTheme
                      ? 'text-[10px] font-extrabold px-1.5 sm:px-2 py-0.2 rounded-full bg-blue-600 text-white dark:bg-[#1d283a] dark:text-sky-300 border border-blue-500/30 dark:border-sky-400/25'
                      : 'text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  }`}
                >
                  044
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Mobile Center: Compact single-row Alert/Time + Active Ride pills */}
          <div
            className={`sm:hidden flex-1 min-w-0 grid gap-1 ${
              hasMinimizedActiveRide && onOpenActiveRide ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <motion.button
              onClick={handleOpenStatusModal}
              whileTap={{ scale: 0.96 }}
              className={`w-full min-w-0 h-7 px-2 rounded-full flex items-center justify-between gap-1 border transition-all cursor-pointer shadow-xs ${
                isTransitTheme
                  ? isAllClear
                    ? 'bg-slate-100/95 dark:bg-[#161c28] text-slate-800 dark:text-white border-slate-200/90 dark:border-slate-700/70'
                    : 'bg-amber-50 dark:bg-[#1c1812] text-amber-800 dark:text-amber-300 border-amber-400/60 dark:border-amber-500/45 shadow-amber-500/10'
                  : isAllClear
                  ? 'bg-slate-900/95 dark:bg-zinc-900/95 text-white border-slate-700/70 dark:border-zinc-700/70'
                  : 'bg-zinc-950/95 text-amber-300 border-amber-500/45 shadow-amber-500/10'
              }`}
              title={
                language === 'de'
                  ? 'Tippen für Uhrzeit, Datum & Störungsdetails'
                  : 'Tap for time, date & disruption details'
              }
              aria-label={
                language === 'de'
                  ? 'Netzwerkstatus und Uhrzeit anzeigen'
                  : 'Show network status and time'
              }
            >
              <span className="flex items-center gap-1 min-w-0">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isAllClear ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      isAllClear ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-tight truncate ${
                    isTransitTheme
                      ? isAllClear
                        ? 'text-slate-800 dark:text-white'
                        : 'text-amber-900 dark:text-amber-200'
                      : 'text-white'
                  }`}
                >
                  {isAllClear ? (
                    hasMinimizedActiveRide ? (
                      <>
                        <span className="hidden min-[430px]:inline">
                          {language === 'de' ? 'Normal' : 'Normal'}
                        </span>
                        <span className="min-[430px]:hidden">OK</span>
                      </>
                    ) : language === 'de' ? (
                      'Normalbetrieb'
                    ) : (
                      'All Normal'
                    )
                  ) : (
                    `${activeDisruptionsCount} ${
                      activeDisruptionsCount === 1
                        ? language === 'de'
                          ? hasMinimizedActiveRide
                            ? 'Stör.'
                            : 'Störung'
                          : 'Alert'
                        : language === 'de'
                        ? hasMinimizedActiveRide
                          ? 'Stör.'
                          : 'Störungen'
                        : 'Alerts'
                    }`
                  )}
                </span>
              </span>

              {shortTime && (
                <span
                  className={`text-[9.5px] border-l pl-1 shrink-0 font-mono font-semibold tabular-nums ${
                    isTransitTheme
                      ? isAllClear
                        ? 'text-slate-500 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        : 'text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-500/30'
                      : 'text-slate-300 border-slate-700/80'
                  }`}
                >
                  {shortTime}
                </span>
              )}
            </motion.button>

            {hasMinimizedActiveRide && onOpenActiveRide && (
              <motion.button
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic.selection();
                  onOpenActiveRide();
                }}
                className={`w-full min-w-0 h-7 px-2 rounded-full flex items-center justify-between gap-1 border shadow-xs cursor-pointer transition-all ${
                  isTransitTheme
                    ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-400/60 dark:border-emerald-500/50 shadow-emerald-500/15'
                    : 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20'
                }`}
                title={t.rideModeTitle}
              >
                <span className="flex items-center gap-1 min-w-0">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-tight truncate ${
                      isTransitTheme ? 'text-emerald-900 dark:text-white' : 'text-white'
                    }`}
                  >
                    <span className="hidden min-[440px]:inline">{t.activeRide}</span>
                    <span className="min-[440px]:hidden">
                      {language === 'de' ? 'Fahrt' : 'Ride'}
                    </span>
                  </span>
                </span>

                {activeRideEta && (
                  <span
                    className={`text-[9.5px] border-l pl-1 shrink-0 font-mono font-semibold tabular-nums ${
                      isTransitTheme
                        ? 'text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600/70'
                        : 'text-emerald-200 border-emerald-600/70'
                    }`}
                  >
                    {activeRideEta}
                  </span>
                )}
              </motion.button>
            )}
          </div>

          {/* Desktop/Tablet Center: Live Time Window, Disruption Pill & Active Ride Pill */}
          <div className="hidden sm:flex items-center justify-center gap-2 flex-1 min-w-0 px-1">
            <motion.button
              onClick={handleOpenStatusModal}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition-all cursor-pointer shadow-sm truncate max-w-full ${
                isTransitTheme
                  ? isAllClear
                    ? 'bg-slate-100/90 dark:bg-[#161c28] text-slate-800 dark:text-white border-slate-200/90 dark:border-slate-700/70 hover:bg-slate-200/80 dark:hover:bg-[#1e2636]'
                    : 'bg-amber-50 dark:bg-[#1c1812] text-amber-800 dark:text-amber-300 border-amber-400/60 dark:border-amber-500/45 hover:border-amber-500 shadow-amber-500/10'
                  : isAllClear
                  ? 'bg-slate-900/90 dark:bg-zinc-900/90 text-white border-slate-700/60 dark:border-zinc-700/60 hover:bg-slate-800 dark:hover:bg-zinc-800'
                  : 'bg-black/95 dark:bg-zinc-900/95 text-amber-300 border-amber-500/40 hover:border-amber-400 shadow-amber-500/10'
              }`}
              title={
                language === 'de'
                  ? 'Tippen für Uhrzeit, Datum & Störungsdetails'
                  : 'Tap for time, date & disruption details'
              }
              aria-label={
                language === 'de'
                  ? 'Netzwerkstatus und Uhrzeit anzeigen'
                  : 'Show network status and time'
              }
            >
              {/* Pulsating status dot */}
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

              {/* Disruption status count */}
              <span
                className={`text-[11px] font-semibold tracking-tight truncate ${
                  isTransitTheme
                    ? isAllClear
                      ? 'text-slate-800 dark:text-white'
                      : 'text-amber-900 dark:text-amber-200'
                    : 'text-white'
                }`}
              >
                {isAllClear
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
                    }`}
              </span>

              {/* Time display: HH:MM */}
              {shortTime && (
                <span
                  className={`text-[10px] border-l pl-1.5 shrink-0 font-mono font-medium tabular-nums ${
                    isTransitTheme
                      ? isAllClear
                        ? 'text-slate-500 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        : 'text-amber-700 dark:text-amber-300/90 border-amber-300/70 dark:border-amber-500/30'
                      : 'text-slate-400 border-slate-700'
                  }`}
                >
                  {shortTime}
                </span>
              )}
            </motion.button>

            {hasMinimizedActiveRide && onOpenActiveRide && (
              <motion.button
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic.selection();
                  onOpenActiveRide();
                }}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border shadow-sm cursor-pointer shrink-0 whitespace-nowrap transition-all ${
                  isTransitTheme
                    ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-400/60 dark:border-emerald-500/50 hover:border-emerald-500 shadow-emerald-500/15'
                    : 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-500/20'
                }`}
                title={t.rideModeTitle}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Navigation className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span
                  className={`text-[11px] font-bold tracking-tight ${
                    isTransitTheme ? 'text-emerald-900 dark:text-white' : 'text-white'
                  }`}
                >
                  {t.activeRide}
                </span>
                {activeRideEta && (
                  <span
                    className={`text-[10px] border-l pl-1.5 shrink-0 font-mono font-semibold tabular-nums ${
                      isTransitTheme
                        ? 'text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600/70'
                        : 'text-emerald-200 border-emerald-600/70'
                    }`}
                  >
                    {t.etaCompact} {activeRideEta}
                  </span>
                )}
              </motion.button>
            )}
          </div>

          {/* Right side actions: Online/Offline status + Quick theme toggle + PWA install button */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Online / Offline Status Badge */}
            <div
              className={`px-1.5 sm:px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-colors ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
              title={isOnline ? t.onlineStatus : t.offlineDisruptionWarning}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isOnline ? (
                <span className="hidden sm:inline">{t.onlineStatus}</span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">{t.offlineStatus}</span>
                </span>
              )}
            </div>

            {/* Quick theme toggle */}
            <motion.button
              onClick={() => {
                haptic.light();
                onToggleTheme();
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              className="w-7 h-7 sm:w-auto sm:h-auto sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
                )}
              </motion.div>
            </motion.button>

            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Detailed Status & Time Window Modal */}
      <AnimatePresence>
        {isStatusModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseStatusModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isAllClear ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'de' ? 'Netzwerk- & Zeit-Status' : 'Network & Time Status'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseStatusModal}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Time & Date Display Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Full Time: hh:mm:ss */}
                  <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{language === 'de' ? 'Aktuelle Uhrzeit' : 'Current Time'}</span>
                    </span>
                    <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {fullTime || '--:--:--'}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {language === 'de' ? 'Format hh:mm:ss' : 'Format hh:mm:ss'}
                    </span>
                  </div>

                  {/* Date: dd.mm.yyyy */}
                  <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'de' ? 'Aktuelles Datum' : 'Current Date'}</span>
                    </span>
                    <span className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {formattedDate || '--.--.----'}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {language === 'de' ? 'Format dd.mm.yyyy' : 'Format dd.mm.yyyy'}
                    </span>
                  </div>
                </div>

                {/* Network Status Overview Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                    isAllClear
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isAllClear
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    }`}
                  >
                    {isAllClear ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold">
                      {isAllClear
                        ? language === 'de'
                          ? 'Normalbetrieb auf allen Linien'
                          : 'Normal Operations on All Lines'
                        : language === 'de'
                        ? `${activeDisruptionsCount} gemeldete Einschränkung(en)`
                        : `${activeDisruptionsCount} Active Transit Report(s)`}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      {isAllClear
                        ? language === 'de'
                          ? 'Das gesamte Schienennetz (U1–U9 sowie IC 10–11) verkehrt planmäßig ohne Beeinträchtigungen.'
                          : 'The complete rail network (U1–U9 & IC 10–11) is operating as scheduled.'
                        : language === 'de'
                        ? 'Details zu betroffenen Linien und Streckenabschnitten findest du unten:'
                        : 'Details of affected lines and stations are listed below:'}
                    </p>
                  </div>
                </div>

                {/* Disruptions Detailed Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
                      <span>{language === 'de' ? 'Störungsübersicht' : 'Disruption Overview'}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {activeDisruptionsCount}{' '}
                      {activeDisruptionsCount === 1
                        ? language === 'de'
                          ? 'Meldung'
                          : 'Report'
                        : language === 'de'
                        ? 'Meldungen'
                        : 'Reports'}
                    </span>
                  </div>

                  {activeDisruptionsCount === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {language === 'de'
                          ? 'Keine aktiven Störungen gemeldet'
                          : 'No active disruptions reported'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {language === 'de'
                          ? 'Alle Züge und Bahnhöfe sind uneingeschränkt nutzbar.'
                          : 'All trains and stations are accessible and running normally.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeDisruptions.map((disrupt) => {
                        const line = METRO_LINES[disrupt.lineId];
                        const fromStation = STATIONS[disrupt.fromStationId];
                        const toStation = STATIONS[disrupt.toStationId];
                        const reportDate = disrupt.timestamp
                          ? new Date(disrupt.timestamp).toLocaleString(
                              language === 'de' ? 'de-DE' : 'en-US',
                              {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : null;

                        return (
                          <div
                            key={disrupt.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {line && (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                    style={{ backgroundColor: line.color }}
                                  >
                                    {line.badge} {line.name}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  {getDisruptionTypeLabel(disrupt.type, language)}
                                </span>
                              </div>
                              {reportDate && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  {reportDate}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                {disrupt.title}
                              </h5>
                              {disrupt.description && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {disrupt.description}
                                </p>
                              )}
                            </div>

                            {(fromStation || toStation) && (
                              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="truncate">{fromStation?.name || disrupt.fromStationId}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{toStation?.name || disrupt.toStationId}</span>
                              </div>
                            )}

                            {disrupt.affectedStations && disrupt.affectedStations.length > 2 && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {language === 'de'
                                  ? `${disrupt.affectedStations.length} Stationen im Abschnitt betroffen`
                                  : `${disrupt.affectedStations.length} stations in section affected`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-3">
                <button
                  onClick={handleNavigateToMap}
                  className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <span>{language === 'de' ? 'Auf Netzplan ansehen' : 'View on network map'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleCloseStatusModal}
                  className="py-2 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {language === 'de' ? 'Schließen' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
