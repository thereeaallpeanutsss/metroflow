import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Language, translations } from '../../utils/i18n';
import { LineId, SavedJourney, TravelTimeOverridesMap, UIThemeMode } from '../../types/metro';
import { useHaptics, haptic } from '../../utils/haptics';
import { TabBarStyle } from '../TabBar';
import { VersionHistoryView } from '../VersionHistoryView';
import { AdminTravelTimesPanel } from '../AdminTravelTimesPanel';
import { CURRENT_VERSION } from '../../data/versionHistory';
import {
  Globe,
  Sun,
  Moon,
  Bookmark,
  Trash2,
  ArrowRight,
  Clock,
  Sparkles,
  Check,
  Smartphone,
  Vibrate,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  RefreshCw,
  Bell,
  MapPin,
  Compass,
  History,
  ChevronRight,
} from 'lucide-react';

interface IOSSettingsViewProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  theme: 'dark' | 'light';
  onSetTheme: (theme: 'dark' | 'light') => void;
  uiTheme: UIThemeMode;
  onSetUiTheme: (mode: UIThemeMode) => void;
  savedJourneys: SavedJourney[];
  onLoadSavedJourney: (journey: SavedJourney) => void;
  onDeleteSavedJourney: (journeyId: string) => void;
  mapRoutePlanningEnabled: boolean;
  onToggleMapRoutePlanning: (enabled: boolean) => void;
  mapHighlightGlowEnabled?: boolean;
  onToggleMapHighlightGlow?: (enabled: boolean) => void;
  isAdmin: boolean;
  onToggleAdmin: (isAdmin: boolean) => void;
  tabBarStyle: TabBarStyle;
  onSetTabBarStyle: (style: TabBarStyle) => void;
  startupOverviewEnabled?: boolean;
  onToggleStartupOverview?: (enabled: boolean) => void;
  onRefreshData?: () => Promise<void>;
  isRefreshingData?: boolean;
  openVersionHistoryDirectly?: boolean;
  onCloseVersionHistoryDirectly?: () => void;
  travelTimeOverrides?: TravelTimeOverridesMap;
  onResetLineTravelTimes?: (lineId: LineId) => Promise<void>;
}

export const IOSSettingsView: React.FC<IOSSettingsViewProps> = ({
  language,
  onSetLanguage,
  theme,
  onSetTheme,
  uiTheme,
  onSetUiTheme,
  savedJourneys,
  onLoadSavedJourney,
  onDeleteSavedJourney,
  mapRoutePlanningEnabled,
  onToggleMapRoutePlanning,
  mapHighlightGlowEnabled = false,
  onToggleMapHighlightGlow,
  isAdmin,
  onToggleAdmin,
  tabBarStyle,
  onSetTabBarStyle,
  startupOverviewEnabled = true,
  onToggleStartupOverview,
  onRefreshData,
  isRefreshingData = false,
  openVersionHistoryDirectly = false,
  onCloseVersionHistoryDirectly,
  travelTimeOverrides = {},
  onResetLineTravelTimes,
}) => {
  const t = translations[language];
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHaptics();

  // Version History subpage state
  const [showVersionHistory, setShowVersionHistory] = useState(openVersionHistoryDirectly);

  useEffect(() => {
    if (openVersionHistoryDirectly) {
      setShowVersionHistory(true);
    }
  }, [openVersionHistoryDirectly]);

  // Admin passcode verification
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);

  const handleVerifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput.trim().toLowerCase() === 'abc123') {
      haptic.success();
      onToggleAdmin(true);
      setAdminError(false);
      setAdminSuccess(true);
      setAdminCodeInput('');
      setTimeout(() => setAdminSuccess(false), 3000);
    } else {
      haptic.error();
      setAdminError(true);
      setAdminSuccess(false);
    }
  };

  const handleExitAdmin = () => {
    haptic.medium();
    onToggleAdmin(false);
    setAdminError(false);
    setAdminSuccess(false);
  };

  if (showVersionHistory) {
    return (
      <VersionHistoryView
        language={language}
        onBack={() => {
          setShowVersionHistory(false);
          onCloseVersionHistoryDirectly?.();
        }}
        uiTheme="ios"
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-28">
      {/* Settings Top Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {language === 'de' ? 'System & Präferenzen' : 'System & Preferences'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.options}
          </h1>
        </div>
      </div>

      {/* GROUP 1: Interface & Design System (Apple Inset Grouped Table) */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
          {language === 'de' ? 'Design & Benutzeroberfläche' : 'Design & Interface'}
        </span>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
          {/* UI Design System Row (Transit & Classic for everyone; iOS & Minecraft Admin-only) */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {t.uiDesignSetting}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.uiDesignDesc}
                </span>
              </div>
            </div>

            {/* Segmented Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onSetUiTheme('transit');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  uiTheme === 'transit'
                    ? 'bg-[#121722] text-white border-[#E03E32]/70 shadow-md ring-2 ring-[#F5B31A]/40'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.uiDesignTransit}</span>
                  <span className="inline-flex items-center gap-0.5 shrink-0" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E03E32]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5B31A]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A8FE8]" />
                  </span>
                </div>
                {uiTheme === 'transit' && <Check className="w-4 h-4 text-[#F5B31A]" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onSetUiTheme('default');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  uiTheme === 'default'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-600 shadow-md ring-2 ring-slate-400/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <span>{t.uiDesignClassic}</span>
                {uiTheme === 'default' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    onSetUiTheme('ios');
                  }}
                  className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                    uiTheme === 'ios'
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t.uiDesignIOS}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  {uiTheme === 'ios' && <Check className="w-4 h-4 text-white" />}
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    onSetUiTheme('minecraft');
                  }}
                  className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                    uiTheme === 'minecraft'
                      ? 'bg-gradient-to-r from-emerald-700 via-stone-700 to-amber-700 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t.uiDesignMinecraft}</span>
                    <span className="text-xs">⛏️</span>
                  </div>
                  {uiTheme === 'minecraft' && <Check className="w-4 h-4 text-emerald-300" />}
                </button>
              )}
            </div>
          </div>

          {/* Theme Row (Light / Dark) */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {t.themeSetting}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'de' ? 'Helles oder dunkles Erscheinungsbild' : 'Light or dark appearance'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  haptic.light();
                  onSetTheme('light');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>{t.lightMode}</span>
                </div>
                {theme === 'light' && <Check className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  haptic.light();
                  onSetTheme('dark');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>{t.darkMode}</span>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Bar Style Row */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {t.tabBarStyleSetting}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.tabBarStyleDesc}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  haptic.selection();
                  onSetTabBarStyle('ios26');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  tabBarStyle === 'ios26'
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">{t.tabBarStyleIOS26}</div>
                  <div className="text-[9px] opacity-80">Floating Dock</div>
                </div>
                {tabBarStyle === 'ios26' && <Check className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  onSetTabBarStyle('classic');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                  tabBarStyle === 'classic'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-600 shadow-md ring-2 ring-slate-400/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">{t.tabBarStyleClassic}</div>
                  <div className="text-[9px] opacity-80">Edge-to-Edge</div>
                </div>
                {tabBarStyle === 'classic' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GROUP 2: Language & Region */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
          {language === 'de' ? 'Sprache & Region' : 'Language & Region'}
        </span>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {t.languageSetting}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                haptic.light();
                onSetLanguage('de');
              }}
              className={`py-2.5 px-3.5 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                language === 'de'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/30'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              <span>🇩🇪 Deutsch</span>
              {language === 'de' && <Check className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                haptic.light();
                onSetLanguage('en');
              }}
              className={`py-2.5 px-3.5 rounded-2xl flex items-center justify-between border text-xs font-semibold transition cursor-pointer ${
                language === 'en'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/30'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              <span>🇬🇧 English</span>
              {language === 'en' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* GROUP 3: Features & Switches (Apple Inset Toggles) */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
          {language === 'de' ? 'Funktionen & Verhalten' : 'Features & Behavior'}
        </span>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
          {/* Haptics Switch */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {language === 'de' ? 'Haptisches Feedback' : 'Haptic Feedback'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'de'
                    ? 'Subtile Vibrationen bei Berührungen und Routenberechnung'
                    : 'Subtle vibrations on interaction and routing'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setHapticsEnabled(!hapticsEnabled);
              }}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                hapticsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full bg-white shadow-md ${
                  hapticsEnabled ? 'ml-auto' : 'ml-0'
                }`}
              />
            </button>
          </div>

          {/* Startup Overview Switch */}
          {onToggleStartupOverview && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    {t.startupDisruptionOverview}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.startupDisruptionOverviewDesc}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onToggleStartupOverview(!startupOverviewEnabled);
                }}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  startupOverviewEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-6 h-6 rounded-full bg-white shadow-md ${
                    startupOverviewEnabled ? 'ml-auto' : 'ml-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Map Direct Planning Switch */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {language === 'de' ? 'Routenplanung auf Karte' : 'Map Route Planning'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'de'
                    ? 'Start und Ziel direkt per Fingertipp auf der Karte festlegen'
                    : 'Set origin and destination directly by tapping on map'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onToggleMapRoutePlanning(!mapRoutePlanningEnabled);
              }}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                mapRoutePlanningEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full bg-white shadow-md ${
                  mapRoutePlanningEnabled ? 'ml-auto' : 'ml-0'
                }`}
              />
            </button>
          </div>

          {/* Map Highlight Glow Switch (Off by default for max FPS) */}
          {onToggleMapHighlightGlow && (
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    {t.mapHighlightGlow}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.mapHighlightGlowDesc}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onToggleMapHighlightGlow(!mapHighlightGlowEnabled);
                }}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                  mapHighlightGlowEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-6 h-6 rounded-full bg-white shadow-md ${
                    mapHighlightGlowEnabled ? 'ml-auto' : 'ml-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GROUP 4: Saved Journeys */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
          {language === 'de' ? 'Gespeicherte Verbindungen' : 'Saved Journeys'}
        </span>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden p-4 space-y-3">
          {savedJourneys.length === 0 ? (
            <div className="text-center py-6 text-slate-400 space-y-1">
              <Bookmark className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">
                {language === 'de'
                  ? 'Noch keine Fahrten gespeichert. Sichere Verbindungen im Routenplaner.'
                  : 'No saved journeys yet. Bookmark routes in the trip planner.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedJourneys.map((journey) => (
                <div
                  key={journey.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between"
                >
                  <button
                    onClick={() => {
                      haptic.selection();
                      onLoadSavedJourney(journey);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                      <span>{journey.originName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{journey.destinationName}</span>
                    </div>
                    {(journey.stopoverNames?.length || journey.stopoverName) && (
                      <span className="text-[10px] text-amber-500 font-medium block truncate">
                        via {journey.stopoverNames?.join(' ➔ ') || journey.stopoverName}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      haptic.warning();
                      onDeleteSavedJourney(journey.id);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GROUP 5: Admin & Server Synchronization */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
          {language === 'de' ? 'Administrator & Synchronisation' : 'Administrator & Sync'}
        </span>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden p-4 space-y-4">
          {/* Admin Unlock Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${
                  isAdmin ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {isAdmin ? t.adminActive : t.adminSection}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin
                    ? t.adminActiveDesc
                    : language === 'de'
                    ? 'Verifiziere dich als Administrator mit deinem Freischaltcode.'
                    : 'Verify administrator status using your admin passcode.'}
                </span>
              </div>
            </div>

            {isAdmin ? (
              <button
                onClick={handleExitAdmin}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                {t.exitAdmin}
              </button>
            ) : (
              <form onSubmit={handleVerifyAdmin} className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  value={adminCodeInput}
                  onChange={(e) => setAdminCodeInput(e.target.value)}
                  placeholder={t.adminCodePlaceholder}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
                >
                  {t.verifyAdmin}
                </button>
              </form>
            )}

            {adminError && (
              <p className="text-xs text-rose-500 font-semibold">{t.adminWrongCode}</p>
            )}
            {adminSuccess && (
              <p className="text-xs text-emerald-500 font-semibold">{t.adminSuccessCode}</p>
            )}

            {isAdmin && onResetLineTravelTimes && (
              <AdminTravelTimesPanel
                language={language}
                travelTimeOverrides={travelTimeOverrides}
                onResetLineTravelTimes={onResetLineTravelTimes}
              />
            )}
          </div>

          {/* Online Sync Refresh */}
          {onRefreshData && (
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw
                  className={`w-4 h-4 text-sky-500 ${isRefreshingData ? 'animate-spin' : ''}`}
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.syncServerSetting}
                </span>
              </div>

              <button
                onClick={() => {
                  haptic.medium();
                  onRefreshData();
                }}
                disabled={isRefreshingData}
                className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
              >
                {isRefreshingData ? t.refreshingData : t.refreshDataButton}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Version History Button at Very Bottom */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            setShowVersionHistory(true);
          }}
          className="w-full p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md flex items-center justify-between transition cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'de' ? 'Versionsverlauf' : 'Version History'}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60">
                  {CURRENT_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'de'
                  ? 'Alle Updates, Neuerungen und Changelogs chronologisch ansehen'
                  : 'View all updates, new features and release notes chronologically'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition group-hover:translate-x-0.5 shrink-0" />
        </button>
      </div>
    </div>
  );
};
