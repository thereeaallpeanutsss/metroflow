import React from 'react';
import { Language, translations } from '../utils/i18n';
import { SavedJourney } from '../types/metro';
import { METRO_LINES } from '../data/metroData';
import { useHaptics, haptic } from '../utils/haptics';
import { TabBarStyle } from './TabBar';
import {
  Globe,
  Sun,
  Moon,
  Bookmark,
  Trash2,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
  Check,
  MapPin,
  Smartphone,
  Vibrate,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  RefreshCw,
  Bell,
  Wifi,
} from 'lucide-react';

interface OptionsMenuProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  theme: 'dark' | 'light';
  onSetTheme: (theme: 'dark' | 'light') => void;
  savedJourneys: SavedJourney[];
  onLoadSavedJourney: (journey: SavedJourney) => void;
  onDeleteSavedJourney: (journeyId: string) => void;
  mapRoutePlanningEnabled: boolean;
  onToggleMapRoutePlanning: (enabled: boolean) => void;
  isAdmin: boolean;
  onToggleAdmin: (isAdmin: boolean) => void;
  tabBarStyle: TabBarStyle;
  onSetTabBarStyle: (style: TabBarStyle) => void;
  startupOverviewEnabled?: boolean;
  onToggleStartupOverview?: (enabled: boolean) => void;
  onRefreshData?: () => Promise<void>;
  isRefreshingData?: boolean;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  language,
  onSetLanguage,
  theme,
  onSetTheme,
  savedJourneys,
  onLoadSavedJourney,
  onDeleteSavedJourney,
  mapRoutePlanningEnabled,
  onToggleMapRoutePlanning,
  isAdmin,
  onToggleAdmin,
  tabBarStyle,
  onSetTabBarStyle,
  startupOverviewEnabled = true,
  onToggleStartupOverview,
  onRefreshData,
  isRefreshingData = false,
}) => {
  const t = translations[language];
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled, isSupported: hapticsSupported } = useHaptics();

  // Admin passcode verification state
  const [adminCodeInput, setAdminCodeInput] = React.useState('');
  const [adminError, setAdminError] = React.useState(false);
  const [adminSuccess, setAdminSuccess] = React.useState(false);

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

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-24">
      {/* Title Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{t.settingsTitle}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'de'
            ? 'Passe Sprache, Darstellung, Haptik und deine gespeicherten Verbindungen an.'
            : 'Customize language, appearance, haptics, and your saved journeys.'}
        </p>
      </div>

      {/* Language Setting */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Globe className="w-4 h-4 text-blue-500" />
          <span>{t.languageSetting}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              haptic.light();
              onSetLanguage('de');
            }}
            className={`py-2.5 px-4 rounded-2xl flex items-center justify-between border transition text-xs font-semibold ${
              language === 'de'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🇩🇪</span>
              <span>Deutsch</span>
            </div>
            {language === 'de' && <Check className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              haptic.light();
              onSetLanguage('en');
            }}
            className={`py-2.5 px-4 rounded-2xl flex items-center justify-between border transition text-xs font-semibold ${
              language === 'en'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🇬🇧</span>
              <span>English</span>
            </div>
            {language === 'en' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Theme Setting (Light / Dark Mode) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>{t.themeSetting}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              haptic.light();
              onSetTheme('light');
            }}
            className={`py-2.5 px-4 rounded-2xl flex items-center justify-between border transition text-xs font-semibold ${
              theme === 'light'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
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
            className={`py-2.5 px-4 rounded-2xl flex items-center justify-between border transition text-xs font-semibold ${
              theme === 'dark'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
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

      {/* Navigation Bar Style Setting (iOS 26 Floating Glass Dock vs. Classic) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>{t.tabBarStyleSetting}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t.tabBarStyleDesc}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* iOS 26 Floating Glass Dock */}
          <button
            onClick={() => {
              haptic.selection();
              onSetTabBarStyle('ios26');
            }}
            className={`py-3 px-3.5 rounded-2xl flex items-center justify-between border transition text-xs font-semibold cursor-pointer ${
              tabBarStyle === 'ios26'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 shadow-md shadow-sky-500/25 ring-2 ring-sky-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold">{t.tabBarStyleIOS26}</div>
                <div className="text-[9px] opacity-80">Floating Dock</div>
              </div>
            </div>
            {tabBarStyle === 'ios26' && <Check className="w-4 h-4 shrink-0 ml-1" />}
          </button>

          {/* Classic Edge-to-Edge Navigation Bar */}
          <button
            onClick={() => {
              haptic.selection();
              onSetTabBarStyle('classic');
            }}
            className={`py-3 px-3.5 rounded-2xl flex items-center justify-between border transition text-xs font-semibold cursor-pointer ${
              tabBarStyle === 'classic'
                ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-600 shadow-md shadow-slate-900/30 ring-2 ring-slate-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
                <div className="w-3.5 h-2 border border-white/70 rounded-[2px]" />
              </div>
              <div className="text-left">
                <div className="font-bold">{t.tabBarStyleClassic}</div>
                <div className="text-[9px] opacity-80">Edge-to-Edge</div>
              </div>
            </div>
            {tabBarStyle === 'classic' && <Check className="w-4 h-4 shrink-0 ml-1" />}
          </button>
        </div>
      </div>

      {/* Online Data Update Button & Cross-Device Sync Status */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Wifi className="w-4 h-4 text-emerald-500" />
              <span>{t.syncServerSetting}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.syncServerDesc}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </span>
        </div>

        {/* Manual Refresh / Update Data Button */}
        {onRefreshData && (
          <button
            onClick={() => {
              haptic.medium();
              onRefreshData();
            }}
            disabled={isRefreshingData}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
            <span>{isRefreshingData ? t.refreshingData : t.refreshDataButton}</span>
          </button>
        )}
      </div>

      {/* Startup Disruption Overview Setting */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Bell className="w-4 h-4 text-amber-500" />
            <span>{t.startupDisruptionOverview}</span>
          </div>

          <button
            onClick={() => {
              haptic.selection();
              if (onToggleStartupOverview) {
                onToggleStartupOverview(!startupOverviewEnabled);
              }
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 cursor-pointer focus:outline-none ${
              startupOverviewEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            title={t.startupDisruptionOverview}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                startupOverviewEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.startupDisruptionOverviewDesc}
        </p>
      </div>

      {/* Haptic Feedback (iOS-Style Vibrations) Setting */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Smartphone className="w-4 h-4 text-purple-500" />
            <span>{t.hapticFeedback}</span>
          </div>

          <button
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 cursor-pointer focus:outline-none ${
              hapticsEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            title={t.hapticFeedback}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.hapticFeedbackDesc}
        </p>

        {/* Haptic profile test buttons */}
        {hapticsEnabled && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 animate-in fade-in duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Vibrate className="w-3.5 h-3.5 text-purple-500" />
              <span>
                {language === 'de' ? 'Vibrationen testen (iOS Taptic Profile)' : 'Test Vibrations (iOS Taptic Profiles)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => haptic.selection()}
                className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition active:scale-95 text-center"
              >
                <span>Tick (8ms)</span>
              </button>

              <button
                onClick={() => haptic.light()}
                className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition active:scale-95 text-center"
              >
                <span>Button Tap (12ms)</span>
              </button>

              <button
                onClick={() => haptic.medium()}
                className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition active:scale-95 text-center"
              >
                <span>Aktion (22ms)</span>
              </button>

              <button
                onClick={() => haptic.routeCalculated()}
                className="py-1.5 px-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-bold transition active:scale-95 text-center"
              >
                <span>Route (Puls)</span>
              </button>
            </div>
          </div>
        )}

        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              hapticsEnabled ? 'bg-purple-500' : 'bg-slate-400'
            }`}
          />
          <span>
            {hapticsEnabled
              ? language === 'de'
                ? 'Aktiviert: Feine taktile Impulse bei Buttons und Routenberechnung'
                : 'Enabled: Crisp tactile impulses for buttons and route calculations'
              : language === 'de'
                ? 'Deaktiviert: Keine Vibrationen'
                : 'Disabled: No vibrations'}
          </span>
        </div>
      </div>

      {/* Route Planning from Transit Map Setting Toggle */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{t.mapRoutePlanning}</span>
          </div>

          <button
            onClick={() => {
              haptic.medium();
              onToggleMapRoutePlanning(!mapRoutePlanningEnabled);
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 cursor-pointer focus:outline-none ${
              mapRoutePlanningEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            title={t.mapRoutePlanning}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                mapRoutePlanningEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.mapRoutePlanningDesc}
        </p>

        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              mapRoutePlanningEnabled ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          <span>
            {mapRoutePlanningEnabled
              ? language === 'de'
                ? 'Aktiviert: Antippen auf Stationen öffnet Routenplanung'
                : 'Enabled: Tapping stations allows trip planning'
              : language === 'de'
                ? 'Deaktiviert: Reine Stationsinformationen ohne Routenplanung'
                : 'Disabled: Station info only without trip planning'}
          </span>
        </div>
      </div>

      {/* Saved Journeys Menu */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Bookmark className="w-4 h-4 text-rose-500" />
            <span>{t.savedTripsTitle}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {savedJourneys.length}
          </span>
        </div>

        {savedJourneys.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
            <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {t.noSavedTrips}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {savedJourneys.map((journey) => (
              <div
                key={journey.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500 transition space-y-2 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>{journey.originName}</span>
                      {journey.stopoverName && (
                        <>
                          <span className="text-slate-400">➔</span>
                          <span className="text-blue-500 dark:text-blue-400">
                            {journey.stopoverName} ({t.stopover})
                          </span>
                        </>
                      )}
                      <span className="text-slate-400">➔</span>
                      <span>{journey.destinationName}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        ca. {journey.durationMinutes} {t.min}
                      </span>
                      <span>•</span>
                      <span>
                        {journey.transfersCount === 0
                          ? t.directConnection
                          : `${journey.transfersCount} ${t.transfers}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      haptic.light();
                      onDeleteSavedJourney(journey.id);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title={t.deleteTrip}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
                  <div className="flex items-center gap-1">
                    {journey.linesUsed.map((lId) => (
                      <span
                        key={lId}
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color }}
                      >
                        {METRO_LINES[lId]?.badge}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      haptic.medium();
                      onLoadSavedJourney(journey);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition active:scale-95 shadow-xs"
                  >
                    <span>{t.loadTrip}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Portal Verification Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>{t.adminSection}</span>
          </div>

          {isAdmin && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>{t.adminActive}</span>
            </span>
          )}
        </div>

        {isAdmin ? (
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{t.adminActive}</div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {t.adminActiveDesc}
                </p>
              </div>
            </div>

            <button
              onClick={handleExitAdmin}
              className="w-full py-2 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.exitAdmin}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyAdmin} className="space-y-2.5 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'de'
                ? 'Gib den 6-stelligen Freischaltcode ein, um Artikel auf der Startseite zu veröffentlichen.'
                : 'Enter the admin passcode to unlock news & article publishing on the Home page.'}
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={adminCodeInput}
                  onChange={(e) => {
                    setAdminCodeInput(e.target.value);
                    if (adminError) setAdminError(false);
                  }}
                  placeholder={t.adminCodePlaceholder}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={!adminCodeInput.trim()}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition shrink-0"
              >
                {t.verifyAdmin}
              </button>
            </div>

            {adminError && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-in fade-in">
                <span>✕ {t.adminWrongCode}</span>
              </p>
            )}

            {adminSuccess && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <span>✓ {t.adminSuccessCode}</span>
              </p>
            )}
          </form>
        )}
      </div>

      {/* Network Info & Version */}
      <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>ÄÄPIZRM 044 Metro Information</span>
        </div>
        <p>27 Stationen • 6 U-Bahn Linien inkl. Tim Train • Vollständig Offline-fähig</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/80">
          {t.appVersion}
        </p>
      </div>
    </div>
  );
};
