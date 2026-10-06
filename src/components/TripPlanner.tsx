import React, { useState, useEffect } from 'react';
import { Station, RouteOption, LineId, SavedJourney, RoutePreference, Disruption, RecentRoute } from '../types/metro';
import { STATIONS, METRO_LINES } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';
import {
  ArrowUpDown,
  Search,
  MapPin,
  Clock,
  Compass,
  Repeat,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  CornerDownRight,
  Bookmark,
  BookmarkCheck,
  Plus,
  X,
  PlusCircle,
  Sparkles,
  Train,
  TrainFront,
  GitBranch,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ZapOff,
  ShoppingBag,
  Ban,
  RefreshCw,
  History,
  RotateCcw,
  Trash2,
  ArrowRight,
  Navigation,
  Star,
} from 'lucide-react';

interface TripPlannerProps {
  language: Language;
  originId: string | null;
  destinationId: string | null;
  stopoverId: string | null;
  routes: RouteOption[];
  activeRoute: RouteOption | null;
  savedJourneys: SavedJourney[];
  recentRoutes: RecentRoute[];
  lastPlannedEntry: RecentRoute | null;
  preference: RoutePreference;
  disruptions: Disruption[];
  avoidDisruptions: boolean;
  onToggleAvoidDisruptions: (avoid: boolean) => void;
  onSetPreference: (pref: RoutePreference) => void;
  onSelectRoute: (route: RouteOption) => void;
  onCalculateRoute: () => void;
  hasCalculatedRoute?: boolean;
  onSetOrigin: (stationId: string | null) => void;
  onSetDestination: (stationId: string | null) => void;
  onSetStopover: (stationId: string | null) => void;
  onSwapStations: () => void;
  onViewOnMap: () => void;
  onSaveJourney: () => void;
  onSelectRecentRoute: (recent: RecentRoute) => void;
  onDeleteRecentRoute: (id: string) => void;
  onClearRecentRoutes: () => void;
  onRestoreLastEntry: () => void;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  language,
  originId,
  destinationId,
  stopoverId,
  routes,
  activeRoute,
  savedJourneys,
  recentRoutes,
  lastPlannedEntry,
  preference,
  disruptions,
  avoidDisruptions,
  onToggleAvoidDisruptions,
  onSetPreference,
  onSelectRoute,
  onCalculateRoute,
  hasCalculatedRoute,
  onSetOrigin,
  onSetDestination,
  onSetStopover,
  onSwapStations,
  onViewOnMap,
  onSaveJourney,
  onSelectRecentRoute,
  onDeleteRecentRoute,
  onClearRecentRoutes,
  onRestoreLastEntry,
}) => {
  const t = translations[language];

  const [searchModalType, setSearchModalType] = useState<'origin' | 'destination' | 'stopover' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLegs, setExpandedLegs] = useState<Record<number, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [showStopoverInput, setShowStopoverInput] = useState(!!stopoverId);
  const [isDisruptionIgnored, setIsDisruptionIgnored] = useState(false);
  const [showIgnoreConfirmModal, setShowIgnoreConfirmModal] = useState(false);

  useEffect(() => {
    setIsDisruptionIgnored(false);
  }, [originId, destinationId, stopoverId]);

  const originStation = originId ? STATIONS[originId] : null;
  const destinationStation = destinationId ? STATIONS[destinationId] : null;
  const stopoverStation = stopoverId ? STATIONS[stopoverId] : null;

  // Favorite stations state persisted in localStorage
  const [favoriteStationIds, setFavoriteStationIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('metroflow_favorite_stations');
      return raw ? JSON.parse(raw) : ['daniel-tower', 'central-station'];
    } catch {
      return ['daniel-tower', 'central-station'];
    }
  });

  const handleToggleFavorite = (stationId: string) => {
    haptic.selection();
    setFavoriteStationIds((prev) => {
      const updated = prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId];
      try {
        localStorage.setItem('metroflow_favorite_stations', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Alphabetical sorting of all stations (Metro + IC)
  const allStations = Object.values(STATIONS).sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );

  // Group stations: when typing, strictly filter by starting letters (prefix matching),
  // e.g. "D" shows only stations starting with D, "Da" shows only stations starting with Da,
  // and multiple results are sorted alphabetically.
  const filteredStations = allStations.filter((st) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return st.name.toLowerCase().startsWith(q);
  }).sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

  const groupedStations = filteredStations.reduce((acc, st) => {
    const firstChar = st.name.charAt(0).toUpperCase();
    if (!acc[firstChar]) {
      acc[firstChar] = [];
    }
    acc[firstChar].push(st);
    return acc;
  }, {} as Record<string, Station[]>);

  const toggleLegExpand = (legIndex: number) => {
    haptic.selection();
    setExpandedLegs((prev) => ({
      ...prev,
      [legIndex]: !prev[legIndex],
    }));
  };

  const isCurrentJourneySaved =
    activeRoute &&
    savedJourneys.some(
      (j) =>
        j.originId === originId &&
        j.destinationId === destinationId &&
        j.stopoverId === (stopoverId || undefined)
    );

  const handleShareRoute = () => {
    if (!activeRoute || !originStation || !destinationStation) return;
    haptic.light();
    const stopoverText = stopoverStation ? ` via ${stopoverStation.name}` : '';
    const text = `🚇 MetroFlow: ${originStation.name} ➔ ${destinationStation.name}${stopoverText} (~${activeRoute.totalDurationMinutes} ${t.min}, ${activeRoute.transfersCount} ${t.transfers})`;
    if (navigator.share) {
      navigator.share({
        title: 'MetroFlow Route',
        text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Popular Stations: Gare du Nord, Daniel Tower, Central Station, City Center, Traphgon Airport
  const popularStations = [
    'gare-du-nord',
    'daniel-tower',
    'central-station',
    'city-center',
    'traphgon-airp',
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20">
      {/* Station Selector Card */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="relative flex items-center gap-3">
          {/* Visual Route Indicator Line */}
          <div className="flex flex-col items-center justify-between self-stretch py-3 shrink-0">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-500/20" />
            <div className="w-0.5 flex-1 bg-slate-300 dark:bg-slate-700 my-1 dashed" />
            {showStopoverInput && (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-blue-500/20 my-0.5" />
                <div className="w-0.5 flex-1 bg-slate-300 dark:bg-slate-700 my-1 dashed" />
              </>
            )}
            <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-500 bg-rose-500/20" />
          </div>

          {/* Input Fields */}
          <div className="flex-1 space-y-2">
            {/* Origin Button */}
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  haptic.light();
                  setSearchModalType('origin');
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between py-2.5 pl-3.5 pr-8 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition"
              >
                <div className="truncate">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                    {t.startStation}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      originStation ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {originStation ? originStation.name : t.selectStart}
                  </span>
                </div>
                {originStation && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {originStation.lines.slice(0, 3).map((lId) => (
                      <span
                        key={lId}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color }}
                      >
                        {METRO_LINES[lId]?.badge}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              {originStation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.light();
                    onSetOrigin(null);
                  }}
                  className="absolute right-2 p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Startstation leeren"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Optional Stopover Field */}
            {showStopoverInput && (
              <div className="relative flex items-center gap-1.5 animate-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    haptic.light();
                    setSearchModalType('stopover');
                    setSearchQuery('');
                  }}
                  className="flex-1 flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-left transition"
                >
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 block">
                      {t.stopoverStation}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stopoverStation ? 'text-slate-900 dark:text-white' : 'text-blue-500/70'
                      }`}
                    >
                      {stopoverStation ? stopoverStation.name : t.selectStopover}
                    </span>
                  </div>
                  {stopoverStation && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {stopoverStation.lines.slice(0, 3).map((lId) => (
                        <span
                          key={lId}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: METRO_LINES[lId]?.color }}
                        >
                          {METRO_LINES[lId]?.badge}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                <button
                  onClick={() => {
                    haptic.light();
                    onSetStopover(null);
                    setShowStopoverInput(false);
                  }}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  title={t.removeStopover}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Destination Button */}
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  haptic.light();
                  setSearchModalType('destination');
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between py-2.5 pl-3.5 pr-8 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-left transition"
              >
                <div className="truncate">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                    {t.destinationStation}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      destinationStation ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {destinationStation ? destinationStation.name : t.selectDestination}
                  </span>
                </div>
                {destinationStation && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {destinationStation.lines.slice(0, 3).map((lId) => (
                      <span
                        key={lId}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color }}
                      >
                        {METRO_LINES[lId]?.badge}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              {destinationStation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.light();
                    onSetDestination(null);
                  }}
                  className="absolute right-2 p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Zielstation leeren"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={() => {
              haptic.medium();
              onSwapStations();
            }}
            disabled={!originId && !destinationId}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none self-center shadow-md"
            title={t.swapStations}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom actions of station selector card: Stopover toggle and Reset */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {(originId || destinationId) ? (
            <button
              onClick={() => {
                haptic.warning();
                onSetOrigin(null);
                onSetDestination(null);
                onSetStopover(null);
                setShowStopoverInput(false);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition py-0.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.clearRoute}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{t.emptyPlannerPrompt}</span>
            </div>
          )}

          {!showStopoverInput && (
            <button
              onClick={() => {
                haptic.light();
                setShowStopoverInput(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline py-0.5 px-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.addStopover}</span>
            </button>
          )}
        </div>

        {/* Favorite Stations in Route Planner */}
        {favoriteStationIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{t.favoriteStations}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {favoriteStationIds.length} {favoriteStationIds.length === 1 ? 'Station' : 'Stationen'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {favoriteStationIds.map((stId) => {
                const st = STATIONS[stId];
                if (!st) return null;
                const isSelected = originId === stId || destinationId === stId || stopoverId === stId;
                return (
                  <button
                    key={stId}
                    onClick={() => {
                      haptic.light();
                      if (!originId) onSetOrigin(stId);
                      else if (!destinationId && destinationId !== stId) onSetDestination(stId);
                      else onSetOrigin(stId);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition active:scale-95 border ${
                      isSelected
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shadow-xs'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-800 dark:text-slate-200 border-amber-200/70 dark:border-amber-800/50'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-medium">{st.name}</span>
                    {st.lines.slice(0, 2).map((lId) => (
                      <span
                        key={lId}
                        className="px-1 py-0.2 rounded text-[8px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color }}
                      >
                        {METRO_LINES[lId]?.badge}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Frequently Searched Stations (Always visible so users can pick start AND destination) */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
            <span className={originId && !destinationId ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
              {!originId
                ? t.frequentlySearched
                : !destinationId
                ? (language === 'de' ? 'Häufig gesucht (Ziel auswählen):' : 'Popular stations (Select destination):')
                : t.frequentlySearched}
            </span>
            {originId && !destinationId && (
              <span className="text-[10px] text-slate-400">
                {language === 'de' ? 'Tippe auf ein Ziel' : 'Tap to set destination'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popularStations.map((stId) => {
              const st = STATIONS[stId];
              if (!st) return null;
              const isOrigin = originId === stId;
              const isDestination = destinationId === stId;

              return (
                <button
                  key={stId}
                  onClick={() => {
                    haptic.light();
                    if (!originId) {
                      onSetOrigin(stId);
                    } else if (!destinationId) {
                      if (stId !== originId) {
                        onSetDestination(stId);
                      }
                    } else {
                      // Both are selected: if user clicks a different station, update destination
                      if (stId !== originId) {
                        onSetDestination(stId);
                      }
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition active:scale-95 ${
                    isOrigin
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 font-bold ring-1 ring-emerald-400/40'
                      : isDestination
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-600 font-bold ring-1 ring-rose-400/40'
                      : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isOrigin && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                  {isDestination && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />}
                  <span>{st.name}</span>
                  {st.hasAirport && <span className="text-[10px]">✈</span>}
                  {st.hasIC && <span className="text-[10px]">🚆</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prioritization Selector Bar inside Route Planner Window */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-blue-500" />
            <span>{t.routePreference}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* Fewest Transfers */}
            <button
              onClick={() => {
                haptic.selection();
                onSetPreference('fewest-transfers');
              }}
              className={`py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 border ${
                preference === 'fewest-transfers'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Repeat className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.fewestTransfers}</span>
            </button>

            {/* Prioritize Metro */}
            <button
              onClick={() => {
                haptic.selection();
                onSetPreference('prioritize-metro');
              }}
              className={`py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 border ${
                preference === 'prioritize-metro'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <TrainFront className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.prioritizeMetro}</span>
            </button>

            {/* Prioritize IC Trains */}
            <button
              onClick={() => {
                haptic.selection();
                onSetPreference('prioritize-ic');
              }}
              className={`py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 border ${
                preference === 'prioritize-ic'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Train className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.prioritizeIC}</span>
            </button>

            {/* Fastest */}
            <button
              onClick={() => {
                haptic.selection();
                onSetPreference('fastest');
              }}
              className={`py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition active:scale-95 border ${
                preference === 'fastest'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.fastestRoute}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- CALCULATE ROUTE ACTION BUTTON ---------------- */}
      <div className="pt-0.5">
        <button
          onClick={() => {
            haptic.medium();
            onCalculateRoute();
          }}
          disabled={!originId || !destinationId || originId === destinationId}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] ${
            originId && destinationId && originId !== destinationId
              ? hasCalculatedRoute
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/40 ring-2 ring-blue-400/50'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          <Navigation className="w-4 h-4 shrink-0" />
          <span>
            {hasCalculatedRoute
              ? t.recalculateRoute
              : t.calculateRoute}
          </span>
        </button>
        {originId && destinationId && !hasCalculatedRoute && (
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {language === 'de'
              ? 'Tippe auf den Button oben, um deine Verbindung zu berechnen.'
              : 'Tap the button above to calculate your connection.'}
          </p>
        )}
      </div>

      {/* When NO route is calculated yet, display Recent Routes right below calculate button */}
      {!((hasCalculatedRoute || !!activeRoute) && (activeRoute !== null || routes.length > 0)) && (
        recentRoutes.length > 0 && (
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{t.recentRoutes}</span>
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                      {recentRoutes.slice(0, 3).length}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.recentRoutesDesc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!originId && !destinationId && lastPlannedEntry && (
                  <button
                    onClick={() => {
                      haptic.medium();
                      onRestoreLastEntry();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-blue-600/25 flex items-center gap-1 transition"
                    title={t.loadLastRoute}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t.loadLastRoute}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    haptic.warning();
                    onClearRecentRoutes();
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title={t.clearRecents}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of up to 3 Recent Routes */}
            <div className="grid grid-cols-1 gap-2">
              {recentRoutes.slice(0, 3).map((recent, idx) => {
                const isLast = idx === 0;

                return (
                  <div
                    key={recent.id}
                    onClick={() => {
                      haptic.light();
                      onSelectRecentRoute(recent);
                    }}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isLast && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold border border-amber-300 dark:border-amber-800/80 flex items-center gap-1">
                            ⭐ {t.lastEntry}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(recent.timestamp).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic.light();
                          onDeleteRecentRoute(recent.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 group-hover:opacity-100 transition"
                        title={t.deleteTrip}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>{recent.originName}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        <span>{recent.destinationName}</span>
                      </div>
                      {recent.stopoverName && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                          (via {recent.stopoverName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/40 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        {recent.linesUsed && recent.linesUsed.length > 0 ? (
                          recent.linesUsed.map((lId) => {
                            const l = METRO_LINES[lId];
                            if (!l) return null;
                            return (
                              <span
                                key={lId}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.badge}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400">🚇 Metro</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-medium">
                        {recent.durationMinutes && (
                          <span>~{recent.durationMinutes} {t.min}</span>
                        )}
                        {recent.transfersCount !== undefined && (
                          <span>• {recent.transfersCount} {t.transfers}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Active Route Disruption Alert & Bypass Route Planner */}
      {activeRoute && activeRoute.affectedDisruptions && activeRoute.affectedDisruptions.length > 0 && !avoidDisruptions && (
        !isDisruptionIgnored ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/60 dark:border-amber-500/50 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500 text-white shrink-0 shadow-md shadow-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                    <span>{t.disruptionOnYourRoute}</span>
                  </h3>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    {language === 'de'
                      ? 'Auf dieser Route liegt mindestens eine gemeldete Streckenstörung vor.'
                      : 'At least one active track disruption affects this itinerary.'}
                  </p>
                </div>
              </div>
            </div>

            {/* List of disruptions affecting this route */}
            <div className="space-y-2 pt-1">
              {activeRoute.affectedDisruptions.map((disrupt) => {
                const line = METRO_LINES[disrupt.lineId];
                const fromName = STATIONS[disrupt.fromStationId]?.name || disrupt.fromStationId;
                const toName = STATIONS[disrupt.toStationId]?.name || disrupt.toStationId;

                return (
                  <div
                    key={disrupt.id}
                    className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        {disrupt.type === 'inactive_redstone' ? (
                          <ZapOff className="w-4 h-4 text-rose-500" />
                        ) : disrupt.type === 'empty_minecart' ? (
                          <ShoppingBag className="w-4 h-4 text-purple-500" />
                        ) : disrupt.type === 'closure' ? (
                          <Ban className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{disrupt.title}</span>
                      </div>

                      {line && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs shrink-0"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        {fromName} ↔ {toName}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {disrupt.confirmations} {t.confirmationsCount}
                      </span>
                    </div>

                    {disrupt.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        "{disrupt.description}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions: Calculate alternative route OR ignore disruption */}
            <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  haptic.medium();
                  onToggleAvoidDisruptions(true);
                }}
                className="py-2.5 px-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.planAlternativeRoute}</span>
              </button>

              <button
                onClick={() => {
                  haptic.warning();
                  setShowIgnoreConfirmModal(true);
                }}
                className="py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">{t.ignoreDisruption}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{t.disruptionIgnoredBanner}</span>
            </div>
            <button
              onClick={() => {
                haptic.light();
                setIsDisruptionIgnored(false);
              }}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
            >
              {t.reconsiderDisruption}
            </button>
          </div>
        )
      )}

      {/* Disruption Bypass Active Status Banner */}
      {avoidDisruptions && activeRoute && (
        <div
          className={`rounded-3xl p-4 shadow-xl space-y-2 border-2 ${
            activeRoute.isAlternativeBypass
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/70 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs">
              {activeRoute.isAlternativeBypass ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{t.alternativeRouteFound}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{t.noAlternativePossible}</span>
                </>
              )}
            </div>

            <button
              onClick={() => {
                haptic.light();
                onToggleAvoidDisruptions(false);
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
            >
              {t.resetBypass}
            </button>
          </div>

          {activeRoute.isAlternativeBypass ? (
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed pl-7">
              {t.alternativeRouteDesc}. Alle betroffenen Gleisabschnitte werden sicher umfahren.
            </p>
          ) : (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
              {language === 'de'
                ? 'Es gibt im gesamten Streckennetz keine Alternativgleise für dieses Ziel. Bitte plane Verspätungen ein.'
                : 'There is no alternative rail line to reach this destination. Please plan for delays.'}
            </p>
          )}
        </div>
      )}

      {/* Route Options Cards */}
      {(hasCalculatedRoute || !!activeRoute) && routes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.routesFound} ({routes.length})
            </span>
            <button
              onClick={() => {
                haptic.medium();
                onViewOnMap();
              }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.viewOnMap}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {routes.map((route) => {
              const isSelected = activeRoute?.id === route.id;
              const usesIC = route.linesUsed.some((l) => l.startsWith('IC'));

              return (
                <div
                  key={route.id}
                  onClick={() => {
                    haptic.selection();
                    onSelectRoute(route);
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30'
                      : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        ca. {route.totalDurationMinutes} {t.min}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        • {route.totalStops} {t.stops}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {usesIC && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-[10px] font-semibold flex items-center gap-1">
                          <Train className="w-3 h-3" />
                          <span>IC Express</span>
                        </span>
                      )}

                      {route.isAlternativeBypass && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{language === 'de' ? 'Umfahrung' : 'Bypass'}</span>
                        </span>
                      )}

                      {route.affectedDisruptions && route.affectedDisruptions.length > 0 && !route.isAlternativeBypass && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{route.affectedDisruptions.length} {language === 'de' ? 'Störung' : 'Alert'}</span>
                        </span>
                      )}

                      {route.transfersCount === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                          {t.directConnection}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold">
                          {route.transfersCount} {t.transferCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line Badges in Route */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {route.legs.map((leg, lIdx) => (
                      <React.Fragment key={lIdx}>
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: METRO_LINES[leg.lineId]?.color }}
                        >
                          {leg.lineId.startsWith('IC') && <Train className="w-3 h-3" />}
                          <span>{METRO_LINES[leg.lineId]?.badge}</span>
                          <span className="text-[10px] font-normal opacity-90">
                            {METRO_LINES[leg.lineId]?.shortName}
                          </span>
                        </div>
                        {lIdx < route.legs.length - 1 && (
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No routes found state */}
      {hasCalculatedRoute && routes.length === 0 && originId && destinationId && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {language === 'de' ? 'Keine Route gefunden' : 'No routes found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'de'
              ? 'Für diese Stationen konnte keine durchgehende Verbindung berechnet werden.'
              : 'Could not calculate a connection between the selected stations.'}
          </p>
        </div>
      )}

      {/* Detailed Itinerary for Selected Route */}
      {(hasCalculatedRoute || !!activeRoute) && activeRoute && (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.detailedPlan}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.totalDuration}: ca. {activeRoute.totalDurationMinutes} {t.min}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Save Journey Button */}
              <button
                onClick={() => {
                  haptic.success();
                  onSaveJourney();
                }}
                className={`p-2 rounded-xl transition ${
                  isCurrentJourneySaved
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={isCurrentJourneySaved ? t.savedRoute : t.saveRoute}
              >
                {isCurrentJourneySaved ? (
                  <BookmarkCheck className="w-4 h-4 text-rose-500" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleShareRoute}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                title={t.shareRoute}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  haptic.medium();
                  onViewOnMap();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t.viewOnMap}</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Directions */}
          <div className="space-y-4">
            {activeRoute.legs.map((leg, legIdx) => {
              const line = METRO_LINES[leg.lineId];
              const fromSt = STATIONS[leg.fromStationId];
              const toSt = STATIONS[leg.toStationId];
              const isExpanded = expandedLegs[legIdx] || false;
              const intermediateStops = leg.stations.slice(1, -1);
              const isStopoverReached = stopoverId && leg.toStationId === stopoverId;
              const isIC = leg.lineId.startsWith('IC');

              // Find any disruptions that affect this specific leg
              const legDisruptions = disruptions.filter((d) => {
                if (d.lineId !== leg.lineId) return false;
                const hasFrom = leg.stations.includes(d.fromStationId);
                const hasTo = leg.stations.includes(d.toStationId);
                if (hasFrom && hasTo) return true;
                if (d.affectedStations && d.affectedStations.some((stId) => leg.stations.includes(stId))) {
                  return true;
                }
                return false;
              });

              return (
                <div key={legIdx} className="space-y-2">
                  {/* Leg Departure */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: line?.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {fromSt?.name}
                        </span>
                        {fromSt?.hasAirport && <span className="text-xs">✈</span>}
                        {fromSt?.hasIC && <span className="text-xs">🚆</span>}
                        {fromSt?.isAccessible && <span className="text-xs">♿</span>}
                      </div>

                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1"
                          style={{ backgroundColor: line?.color }}
                        >
                          {isIC && <Train className="w-3 h-3" />}
                          <span>{line?.name}</span>
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t.direction} {line?.terminals[1]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Intermediate Stops */}
                  <div className="ml-3 pl-6 border-l-2 border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
                    <button
                      onClick={() => toggleLegExpand(legIdx)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition py-1"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {leg.stopsCount} {t.intermediateStops} (ca. {leg.durationMinutes} {t.min})
                      </span>
                      {intermediateStops.length > 0 && (
                        <span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      )}
                    </button>

                    {isExpanded && intermediateStops.length > 0 && (
                      <div className="space-y-1.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                        {intermediateStops.map((stId) => (
                          <div key={stId} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                            <span>{STATIONS[stId]?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Disruption Alert in Step-by-Step Itinerary if on this leg */}
                  {legDisruptions.length > 0 && (
                    <div className="ml-3 pl-6 my-2 space-y-1.5">
                      {legDisruptions.map((disrupt) => (
                        <div
                          key={`leg-disrupt-${disrupt.id}`}
                          className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-400/80 dark:border-amber-700/60 text-xs space-y-1 shadow-xs"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{t.disruptionOnThisLeg} {disrupt.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 pl-5">
                            {STATIONS[disrupt.fromStationId]?.name || disrupt.fromStationId} ↔ {STATIONS[disrupt.toStationId]?.name || disrupt.toStationId}
                            {disrupt.description ? ` • "${disrupt.description}"` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stopover Indicator if at stopover station */}
                  {isStopoverReached && legIdx < activeRoute.legs.length - 1 && (
                    <div className="ml-3 pl-3 my-2">
                      <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>
                            {t.stopoverReached}: {toSt?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transfer Box (if changing lines) - Walking time removed per user request */}
                  {legIdx < activeRoute.legs.length - 1 && (
                    <div className="ml-3 pl-3 my-2">
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-600/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                          <CornerDownRight className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            {t.changeAt} {toSt?.name}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] pl-6">
                          {t.changeFrom}{' '}
                          <strong className="text-slate-900 dark:text-white">{line?.shortName}</strong> {t.toLine}{' '}
                          <strong className="text-slate-900 dark:text-white">
                            {METRO_LINES[activeRoute.legs[legIdx + 1]?.lineId]?.shortName}
                          </strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Final Destination Station */}
                  {legIdx === activeRoute.legs.length - 1 && (
                    <div className="flex items-start gap-3 pt-1">
                      <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-rose-400 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-rose-600/30">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {toSt?.name}
                          </span>
                          {toSt?.hasAirport && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-[10px] font-medium border border-sky-300 dark:border-sky-800">
                              ✈ {t.airport}
                            </span>
                          )}
                          {toSt?.hasIC && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-medium border border-blue-300 dark:border-blue-800">
                              🚆 IC
                            </span>
                          )}
                          {toSt?.isAccessible && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium border border-emerald-300 dark:border-emerald-800">
                              ♿ {t.accessible}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          {t.destinationReached}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* When a route IS calculated, render Recent Routes BELOW the calculated route */}
      {((hasCalculatedRoute || !!activeRoute) && (activeRoute !== null || routes.length > 0)) && (
        recentRoutes.length > 0 && (
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{t.recentRoutes}</span>
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                      {recentRoutes.slice(0, 3).length}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.recentRoutesDesc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!originId && !destinationId && lastPlannedEntry && (
                  <button
                    onClick={() => {
                      haptic.medium();
                      onRestoreLastEntry();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-blue-600/25 flex items-center gap-1 transition"
                    title={t.loadLastRoute}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t.loadLastRoute}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    haptic.warning();
                    onClearRecentRoutes();
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title={t.clearRecents}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of up to 3 Recent Routes */}
            <div className="grid grid-cols-1 gap-2">
              {recentRoutes.slice(0, 3).map((recent, idx) => {
                const isLast = idx === 0;

                return (
                  <div
                    key={recent.id}
                    onClick={() => {
                      haptic.light();
                      onSelectRecentRoute(recent);
                    }}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isLast && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold border border-amber-300 dark:border-amber-800/80 flex items-center gap-1">
                            ⭐ {t.lastEntry}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(recent.timestamp).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic.light();
                          onDeleteRecentRoute(recent.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 group-hover:opacity-100 transition"
                        title={t.deleteTrip}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>{recent.originName}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        <span>{recent.destinationName}</span>
                      </div>
                      {recent.stopoverName && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                          (via {recent.stopoverName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/40 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        {recent.linesUsed && recent.linesUsed.length > 0 ? (
                          recent.linesUsed.map((lId) => {
                            const l = METRO_LINES[lId];
                            if (!l) return null;
                            return (
                              <span
                                key={lId}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.badge}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400">🚇 Metro</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-medium">
                        {recent.durationMinutes && (
                          <span>~{recent.durationMinutes} {t.min}</span>
                        )}
                        {recent.transfersCount !== undefined && (
                          <span>• {recent.transfersCount} {t.transfers}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Alphabetically Sorted Station Search Modal */}
      {searchModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {searchModalType === 'origin'
                    ? t.selectStart
                    : searchModalType === 'stopover'
                    ? t.selectStopover
                    : t.selectDestination}
                </h3>
                <button
                  onClick={() => {
                    haptic.light();
                    setSearchModalType(null);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Alphabetically Grouped Station List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Pinned Favorites at the top when starting to select */}
              {!searchQuery && favoriteStationIds.length > 0 && (
                <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{t.favoriteStations}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({favoriteStationIds.length})</span>
                  </div>

                  <div className="space-y-0.5">
                    {favoriteStationIds.map((stId) => {
                      const st = STATIONS[stId];
                      if (!st) return null;
                      return (
                        <div
                          key={`fav-${st.id}`}
                          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition group"
                        >
                          <button
                            onClick={() => {
                              haptic.light();
                              if (searchModalType === 'origin') onSetOrigin(st.id);
                              else if (searchModalType === 'stopover') onSetStopover(st.id);
                              else onSetDestination(st.id);
                              setSearchModalType(null);
                            }}
                            className="flex-1 text-left flex items-center justify-between"
                          >
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{st.name}</span>
                                {st.hasAirport && <span className="text-xs">✈</span>}
                                {st.hasIC && <span className="text-xs">🚆</span>}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {st.isInterchange ? t.interchangeStation : t.regularStation}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {st.lines.slice(0, 3).map((lId) => (
                                <span
                                  key={lId}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                  style={{ backgroundColor: METRO_LINES[lId]?.color }}
                                >
                                  {METRO_LINES[lId]?.badge}
                                </span>
                              ))}
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(st.id);
                            }}
                            className="p-1.5 ml-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
                            title={t.removeFromFavorites}
                          >
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {Object.keys(groupedStations).length > 0 ? (
                Object.keys(groupedStations)
                  .sort()
                  .map((letter) => (
                    <div key={letter} className="space-y-1">
                      {/* Alphabet letter badge header */}
                      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                          {letter}
                        </span>
                        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>

                      <div className="space-y-0.5">
                        {groupedStations[letter].map((st) => {
                          const isFav = favoriteStationIds.includes(st.id);

                          return (
                            <div
                              key={st.id}
                              className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <button
                                onClick={() => {
                                  haptic.light();
                                  if (searchModalType === 'origin') {
                                    onSetOrigin(st.id);
                                  } else if (searchModalType === 'stopover') {
                                    onSetStopover(st.id);
                                  } else {
                                    onSetDestination(st.id);
                                  }
                                  setSearchModalType(null);
                                }}
                                className="flex-1 text-left flex items-center justify-between py-1"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{st.name}</span>
                                    {st.hasAirport && <span className="text-xs">✈</span>}
                                    {st.hasIC && <span className="text-xs">🚆</span>}
                                    {st.hasICTransferRequired && <span className="text-xs">⚙️</span>}
                                    {st.isAccessible && <span className="text-xs">♿</span>}
                                    {st.isTimTrain && (
                                      <span className="w-4 h-4 rounded-full border border-purple-400 text-[8px] flex items-center justify-center font-bold text-purple-600 dark:text-purple-300">
                                        T
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {st.isInterchange ? t.interchangeStation : t.regularStation}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {st.lines.slice(0, 3).map((lId) => (
                                    <span
                                      key={lId}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                      style={{ backgroundColor: METRO_LINES[lId]?.color }}
                                    >
                                      {METRO_LINES[lId]?.badge}
                                    </span>
                                  ))}
                                  {st.lines.length > 3 && (
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      +{st.lines.length - 3}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Favorite star toggle button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(st.id);
                                }}
                                className="p-2 ml-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
                                title={isFav ? t.removeFromFavorites : t.addToFavorites}
                              >
                                <Star
                                  className={`w-4 h-4 transition ${
                                    isFav
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  {t.noStationsFound}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disruption Ignore Confirmation Warning Modal */}
      {showIgnoreConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/50 shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0 shadow-lg shadow-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {t.ignoreDisruptionTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {t.ignoreDisruptionWarning}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {language === 'de'
                  ? 'Die Störung bleibt im Schritt-für-Schritt-Reiseplan zur Orientierung sichtbar.'
                  : 'The disruption will still remain highlighted in your step-by-step itinerary.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setShowIgnoreConfirmModal(false);
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.medium();
                  setIsDisruptionIgnored(true);
                  setShowIgnoreConfirmModal(false);
                }}
                className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-xs font-bold text-white shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t.proceedAnyway}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
