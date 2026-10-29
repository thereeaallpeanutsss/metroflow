import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Station,
  RouteOption,
  LineId,
  SavedJourney,
  RoutePreference,
  Disruption,
  RecentRoute,
} from '../../types/metro';
import { STATIONS, METRO_LINES } from '../../data/metroData';
import { Language, translations, getDisruptionTypeLabel } from '../../utils/i18n';
import { haptic } from '../../utils/haptics';
import {
  ArrowUpDown,
  Search,
  MapPin,
  Clock,
  Compass,
  Repeat,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Plus,
  X,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowRight,
  Sparkles,
  Map,
  Ban,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface IOSTripPlannerProps {
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

export const IOSTripPlanner: React.FC<IOSTripPlannerProps> = ({
  language,
  originId,
  destinationId,
  stopoverId,
  routes,
  activeRoute,
  savedJourneys,
  recentRoutes,
  preference,
  disruptions,
  avoidDisruptions,
  onToggleAvoidDisruptions,
  onSetPreference,
  onSelectRoute,
  onCalculateRoute,
  hasCalculatedRoute = false,
  onSetOrigin,
  onSetDestination,
  onSetStopover,
  onSwapStations,
  onViewOnMap,
  onSaveJourney,
  onSelectRecentRoute,
  onDeleteRecentRoute,
}) => {
  const t = translations[language];

  // Active picker modal state: 'origin' | 'destination' | 'stopover' | null
  const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination' | 'stopover' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Leg expansion state: default empty Record means all legs show intermediate stations by default
  const [collapsedLegIndices, setCollapsedLegIndices] = useState<Record<number, boolean>>({});

  // Disruption detail modal state
  const [modalDisruption, setModalDisruption] = useState<Disruption | null>(null);

  // Helper to test if a disruption represents impassable track maintenance or track closure
  const isTrackObstruction = (d: Disruption) =>
    d.type === 'closure' ||
    d.type === 'construction' ||
    d.type === 'missing_tracks' ||
    d.title.toLowerCase().includes('sperrung') ||
    d.title.toLowerCase().includes('wartung') ||
    d.title.toLowerCase().includes('closure') ||
    d.title.toLowerCase().includes('maintenance');

  const originStation = originId ? STATIONS[originId] : null;
  const destinationStation = destinationId ? STATIONS[destinationId] : null;
  const stopoverStation = stopoverId ? STATIONS[stopoverId] : null;

  // Helper to determine the directional terminus (last stop of the line in user's direction of travel)
  const getLegDirectionTerminus = (lineId: string, fromStationId: string, toStationId: string): string => {
    const line = METRO_LINES[lineId];
    if (!line || !line.stations || line.stations.length === 0) return '';
    const idxFrom = line.stations.indexOf(fromStationId);
    const idxTo = line.stations.indexOf(toStationId);
    let termStationId: string;
    if (idxFrom !== -1 && idxTo !== -1) {
      termStationId = idxTo >= idxFrom
        ? line.stations[line.stations.length - 1]
        : line.stations[0];
    } else {
      termStationId = line.stations[line.stations.length - 1];
    }
    return STATIONS[termStationId]?.name || termStationId;
  };

  // Filter stations for search modal - guaranteed sorted alphabetically
  const allStations = Object.values(STATIONS).sort((a, b) =>
    a.name.localeCompare(b.name, language === 'de' ? 'de' : 'en', { sensitivity: 'base' })
  );
  const filteredPickerStations = pickerSearch.trim()
    ? allStations.filter((s) =>
        s.name.toLowerCase().includes(pickerSearch.toLowerCase().trim())
      )
    : allStations;

  const handleSelectStationInPicker = (stId: string) => {
    haptic.selection();
    if (pickerTarget === 'origin') onSetOrigin(stId);
    if (pickerTarget === 'destination') onSetDestination(stId);
    if (pickerTarget === 'stopover') onSetStopover(stId);
    setPickerTarget(null);
    setPickerSearch('');
  };

  const isCurrentJourneySaved = activeRoute
    ? savedJourneys.some(
        (j) =>
          j.originId === originId &&
          j.destinationId === destinationId &&
          (j.stopoverId || null) === (stopoverId || null)
      )
    : false;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-28">
      {/* Top Title & Quick Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {language === 'de' ? 'Routenführung' : 'Transit Navigation'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.planner}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>iOS Route Engine</span>
        </div>
      </div>

      {/* Responsive Grid: on iPad side-by-side (Left: Planner controls; Right: Route Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Inputs, Preferences, Calculate): 12 on mobile, 5 on iPad/desktop */}
        <div className="lg:col-span-5 space-y-4">
          {/* Apple Maps Style From / To Route Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-3 relative">
            <div className="relative pl-9 space-y-3">
              {/* Connecting vertical line - mathematically centered between green and red dot centers */}
              <div className="absolute left-[18px] top-6 bottom-6 w-0 -translate-x-1/2 border-l-2 border-dashed border-slate-300 dark:border-zinc-700 pointer-events-none" />

              {/* 1. Origin Station Field */}
              <div className="relative">
                <span className="absolute -left-[18px] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 z-10" />
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setPickerTarget('origin');
                    setPickerSearch('');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-left transition hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none mb-1">
                      {t.startStation}
                    </span>
                    <span
                      className={`text-sm font-semibold truncate block ${
                        originStation
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {originStation?.name || t.selectStart}
                    </span>
                  </div>
                  {originStation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetOrigin(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
              </div>

              {/* Stopover (Optional) */}
              {stopoverId && (
                <div className="relative">
                  <span className="absolute -left-[18px] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20 z-10" />
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setPickerTarget('stopover');
                      setPickerSearch('');
                    }}
                    className="w-full py-2 px-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-left transition hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-amber-500 block leading-none mb-1">
                        {t.stopover}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
                        {stopoverStation?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetStopover(null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </button>
                </div>
              )}

              {/* 2. Destination Station Field */}
              <div className="relative">
                <span className="absolute -left-[18px] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 z-10" />
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setPickerTarget('destination');
                    setPickerSearch('');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-left transition hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none mb-1">
                      {t.destinationStation}
                    </span>
                    <span
                      className={`text-sm font-semibold truncate block ${
                        destinationStation
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {destinationStation?.name || t.selectDestination}
                    </span>
                  </div>
                  {destinationStation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDestination(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions under fields: Swap & Add Stopover */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  haptic.medium();
                  onSwapStations();
                }}
                className="py-1 px-2.5 rounded-xl text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-95"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{t.swapStations}</span>
              </button>

              {!stopoverId && (
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setPickerTarget('stopover');
                    setPickerSearch('');
                  }}
                  className="py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.addStopover}</span>
                </button>
              )}
            </div>
          </div>

          {/* iOS Segmented Preference Control */}
          <div className="p-1 rounded-2xl bg-slate-200/80 dark:bg-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1 select-none">
            {(
              [
                { id: 'fastest', label: t.fastestRoute, icon: '⚡' },
                { id: 'fewest-transfers', label: t.fewestTransfers, icon: '🔄' },
                { id: 'prioritize-metro', label: t.prioritizeMetro, icon: '🚇' },
                { id: 'prioritize-ic', label: t.prioritizeIC, icon: '🚆' },
              ] as const
            ).map((pref) => (
              <button
                key={pref.id}
                type="button"
                onClick={() => {
                  haptic.selection();
                  onSetPreference(pref.id);
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  preference === pref.id
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{pref.icon}</span>
                <span className="truncate">{pref.label}</span>
              </button>
            ))}
          </div>

          {/* Avoid Disruptions iOS Toggle Switch */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {language === 'de' ? 'Störungen umgehen' : 'Avoid disruptions'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'de'
                    ? 'Aktive Baustellen & Störungen meiden'
                    : 'Reroute around reported delays & closures'}
                </span>
              </div>
            </div>

            {/* Apple iOS Green Switch */}
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onToggleAvoidDisruptions(!avoidDisruptions);
              }}
              className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                avoidDisruptions ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full bg-white shadow-md ${
                  avoidDisruptions ? 'ml-auto' : 'ml-0'
                }`}
              />
            </button>
          </div>

          {/* Big iOS Action Button: Calculate Route */}
          <button
            type="button"
            disabled={!originId || !destinationId}
            onClick={() => {
              haptic.routeCalculated();
              onCalculateRoute();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{t.recalculateRoute}</span>
          </button>

          {/* Recent Routes Carousel */}
          {recentRoutes.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                {language === 'de' ? 'Zuletzt gesucht' : 'Recent Searches'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {recentRoutes.map((recent) => (
                  <button
                    key={recent.id}
                    onClick={() => {
                      haptic.selection();
                      onSelectRecentRoute(recent);
                    }}
                    className="py-1.5 px-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1.5 whitespace-nowrap hover:bg-slate-50 dark:hover:bg-zinc-800 transition active:scale-95"
                  >
                    <span>{recent.originName}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{recent.destinationName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Routes and Itinerary): 12 on mobile, 7 on iPad/desktop */}
        <div className="lg:col-span-7 space-y-4">
          {!hasCalculatedRoute ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'de' ? 'Wähle Start und Ziel' : 'Select origin & destination'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {language === 'de'
                  ? 'Wähle deine Stationen aus und tippe auf "Route berechnen", um die schnellste Fahrtzeit zu ermitteln.'
                  : 'Pick your stations and tap calculate route to view optimal travel time and transfer guidance.'}
              </p>
            </div>
          ) : routes.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'de' ? 'Keine Verbindung gefunden' : 'No Route Found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'de'
                  ? 'Mit den aktuellen Filtern konnte keine Route ermittelt werden.'
                  : 'No route could be found with current settings.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Route Options Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {routes.length} {t.routesFound}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {preference === 'fastest' ? t.fastestRoute : t.fewestTransfers}
                </span>
              </div>

              {/* Route Cards */}
              <div className="space-y-3">
                {routes.map((route, idx) => {
                  const isSelected = activeRoute === route;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => {
                        haptic.selection();
                        onSelectRoute(route);
                      }}
                      className={`p-4 rounded-3xl border transition cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white/80 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Route Summary Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {route.totalDurationMinutes} {t.min}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                            {route.transfersCount === 0
                              ? t.directConnection
                              : `${route.transfersCount} ${t.transfers}`}
                          </span>
                        </div>

                        {/* Line Badges Chain */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {route.legs.map((leg, lIdx) => (
                            <React.Fragment key={lIdx}>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: METRO_LINES[leg.lineId]?.color }}
                              >
                                {METRO_LINES[leg.lineId]?.badge}
                              </span>
                              {lIdx < route.legs.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Disruption Alert Banner & Impassable Route Warning if on route */}
                      {route.affectedDisruptions && route.affectedDisruptions.length > 0 && (() => {
                        const impassableDisruptions = route.affectedDisruptions.filter(isTrackObstruction);
                        const hasImpassable = impassableDisruptions.length > 0;

                        if (hasImpassable) {
                          return (
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/60 dark:border-rose-500/50 space-y-2.5">
                              <div className="flex items-start gap-2.5">
                                <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-xs">
                                  <Ban className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                                    {language === 'de'
                                      ? 'Warnung: Diese Route ist unpassierbar!'
                                      : 'Warning: This planned route is impossible to use!'}
                                  </h4>
                                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-snug">
                                    {language === 'de'
                                      ? 'Aufgrund von Streckensperrung oder Gleisarbeiten kann dieser Streckenabschnitt nicht befahren werden.'
                                      : 'Due to track maintenance or track closure, this itinerary is blocked and cannot be used.'}
                                  </p>
                                </div>
                              </div>

                              {/* Affected Disruptions List with Type Badges */}
                              <div className="space-y-1.5 pt-0.5">
                                {route.affectedDisruptions.map((disrupt) => {
                                  const line = METRO_LINES[disrupt.lineId];
                                  const isObs = isTrackObstruction(disrupt);
                                  return (
                                    <div
                                      key={disrupt.id}
                                      className="p-2 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between gap-2 shadow-2xs"
                                    >
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {line && (
                                            <span
                                              className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shrink-0"
                                              style={{ backgroundColor: line.color }}
                                            >
                                              {line.badge}
                                            </span>
                                          )}
                                          <span
                                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                              isObs
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            }`}
                                          >
                                            {getDisruptionTypeLabel(disrupt.type, language)}
                                          </span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            {STATIONS[disrupt.fromStationId]?.name} ↔ {STATIONS[disrupt.toStationId]?.name}
                                          </span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                          {disrupt.title}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          haptic.light();
                                          setModalDisruption(disrupt);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                                      >
                                        <span>{language === 'de' ? 'Details' : 'Details'}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic.medium();
                                    onToggleAvoidDisruptions(true);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>{language === 'de' ? 'Alternativroute berechnen' : 'Calculate alternate route'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // General non-impassable disruption alert
                        return (
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                  {language === 'de' ? 'Störung auf der Route' : 'Disruption on route'} ({route.affectedDisruptions.length})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptic.medium();
                                  onToggleAvoidDisruptions(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1 transition"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{language === 'de' ? 'Umfahrung' : 'Bypass'}</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              {route.affectedDisruptions.map((disrupt) => (
                                <div
                                  key={disrupt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic.light();
                                    setModalDisruption(disrupt);
                                  }}
                                  className="p-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-1.5 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-zinc-800 transition"
                                >
                                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                      {getDisruptionTypeLabel(disrupt.type, language)}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {disrupt.title}
                                    </span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Selected Route Action Buttons */}
                      {isSelected && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.medium();
                              onViewOnMap();
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                          >
                            <Map className="w-3.5 h-3.5" />
                            <span>{t.viewOnMap}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.light();
                              onSaveJourney();
                            }}
                            className={`py-2 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                              isCurrentJourneySaved
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                            }`}
                          >
                            {isCurrentJourneySaved ? (
                              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {isCurrentJourneySaved ? t.savedRoute : t.saveRoute}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Step-by-Step Leg Details Accordion */}
                      {isSelected && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                          {route.legs.map((leg, lIdx) => {
                            const isExpanded = !collapsedLegIndices[lIdx];
                            const line = METRO_LINES[leg.lineId];
                            const directionTerminus = getLegDirectionTerminus(
                              leg.lineId,
                              leg.fromStationId,
                              leg.toStationId
                            );
                            const legDisruptions = disruptions.filter((d) => {
                              if (!d.isActive || d.lineId !== leg.lineId) return false;
                              const hasFrom = leg.stations.includes(d.fromStationId);
                              const hasTo = leg.stations.includes(d.toStationId);
                              if (hasFrom && hasTo) return true;
                              if (d.affectedStations && d.affectedStations.some((stId) => leg.stations.includes(stId))) {
                                return true;
                              }
                              return false;
                            });

                            return (
                              <div
                                key={lIdx}
                                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2 text-xs"
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic.light();
                                    setCollapsedLegIndices((prev) => ({
                                      ...prev,
                                      [lIdx]: !prev[lIdx],
                                    }));
                                  }}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span
                                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0 shadow-2xs"
                                      style={{ backgroundColor: line?.color }}
                                    >
                                      {line?.badge}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {STATIONS[leg.fromStationId]?.name} ➔{' '}
                                        {STATIONS[leg.toStationId]?.name}
                                      </div>
                                      {directionTerminus && (
                                        <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate flex items-center gap-1 mt-0.5">
                                          <Compass className="w-2.5 h-2.5 shrink-0" />
                                          <span>{language === 'de' ? 'Richtung' : 'Direction'}:</span>
                                          <span className="font-bold underline decoration-blue-400/40">{directionTerminus}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                                    {leg.durationMinutes} {t.min}
                                  </span>
                                </div>

                                {/* Intermediate Stations List (Expanded by default per user request) */}
                                {leg.stations.length > 2 && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-4 border-l-2 border-slate-200 dark:border-zinc-700">
                                    <div
                                      className="flex items-center justify-between cursor-pointer py-0.5 hover:text-slate-900 dark:hover:text-slate-200 transition"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        haptic.selection();
                                        setCollapsedLegIndices((prev) => ({
                                          ...prev,
                                          [lIdx]: !prev[lIdx],
                                        }));
                                      }}
                                    >
                                      <span className="font-medium">
                                        {leg.stations.length - 2} {t.intermediateStops}
                                      </span>
                                      <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                                        {isExpanded ? (
                                          <>
                                            <span>{language === 'de' ? 'Einklappen' : 'Collapse'}</span>
                                            <ChevronUp className="w-3 h-3" />
                                          </>
                                        ) : (
                                          <>
                                            <span>{language === 'de' ? 'Ausklappen' : 'Expand'}</span>
                                            <ChevronDown className="w-3 h-3" />
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    {isExpanded && (
                                      <div className="pt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
                                        {leg.stations.slice(1, -1).map((stId: string) => (
                                          <div key={stId} className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                            <span>{STATIONS[stId]?.name || stId}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Disruptions on this leg */}
                                {legDisruptions.length > 0 && (
                                  <div className="pt-1 space-y-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                                    {legDisruptions.map((disrupt) => (
                                      <div
                                        key={`leg-disrupt-${disrupt.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          haptic.light();
                                          setModalDisruption(disrupt);
                                        }}
                                        className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-1.5 cursor-pointer hover:bg-amber-500/20 transition"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                            {getDisruptionTypeLabel(disrupt.type, language)}:
                                          </span>
                                          <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate">
                                            {disrupt.title}
                                          </span>
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Station Selector Full Sheet Modal */}
      <AnimatePresence>
        {pickerTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md max-h-[80vh] flex flex-col p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {pickerTarget === 'origin'
                    ? t.selectStart
                    : pickerTarget === 'destination'
                    ? t.selectDestination
                    : t.selectStopover}
                </h3>
                <button
                  onClick={() => setPickerTarget(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Station Search Input */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={language === 'de' ? 'Station tippen...' : 'Type station name...'}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Station List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[50vh]">
                {filteredPickerStations.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleSelectStationInPicker(station.id)}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {station.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1 shrink-0 ml-2 max-w-[85px] sm:max-w-[110px]">
                      {station.lines.slice(0, 3).map((lId) => (
                        <span
                          key={lId}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-2xs shrink-0"
                          style={{ backgroundColor: METRO_LINES[lId]?.color }}
                        >
                          {METRO_LINES[lId]?.badge}
                        </span>
                      ))}
                      {station.lines.length > 3 && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0">
                          +{station.lines.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disruption Details Sheet Modal */}
      <AnimatePresence>
        {modalDisruption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {t.disruptionDetails}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {modalDisruption.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setModalDisruption(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Line and Segment Info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {METRO_LINES[modalDisruption.lineId] && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: METRO_LINES[modalDisruption.lineId]?.color }}
                      >
                        {METRO_LINES[modalDisruption.lineId]?.badge}
                      </span>
                    )}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {METRO_LINES[modalDisruption.lineId]?.name || modalDisruption.lineId}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isTrackObstruction(modalDisruption)
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {getDisruptionTypeLabel(modalDisruption.type, language)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {STATIONS[modalDisruption.fromStationId]?.name || modalDisruption.fromStationId} ➔{' '}
                    {STATIONS[modalDisruption.toStationId]?.name || modalDisruption.toStationId}
                  </span>
                </div>
              </div>

              {modalDisruption.description && (
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-100/60 dark:bg-zinc-800/40 p-3 rounded-2xl">
                  {modalDisruption.description}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  {modalDisruption.confirmations} {t.confirmationsCount}
                </span>
                <span>
                  {new Date(modalDisruption.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalDisruption(null);
                    onViewOnMap();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>{t.viewOnMap}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalDisruption(null)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                >
                  {language === 'de' ? 'Schließen' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
