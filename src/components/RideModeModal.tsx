import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ActiveRideState,
  MeasuredSegmentLog,
  TravelTimeOverridesMap,
} from '../types/metro';
import { STATIONS, METRO_LINES } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
import {
  getEffectiveSegmentSeconds,
  isCompleteSingleLineRoute,
} from '../utils/routeFinder';
import { getSegmentTimeKey } from '../services/travelTimesService';
import { haptic } from '../utils/haptics';
import {
  X,
  Navigation,
  Map,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Timer,
  Play,
  Flag,
  RotateCcw,
  ShieldCheck,
  Repeat,
  Train,
  ArrowRight,
  Check,
  Loader2,
  Power,
  Lock,
} from 'lucide-react';

interface RideModeModalProps {
  language: Language;
  rideState: ActiveRideState;
  isAdmin: boolean;
  travelTimeOverrides: TravelTimeOverridesMap;
  onMinimize: () => void;
  onEndRide: () => void;
  onViewOnMap: () => void;
  onUpdateRideState: React.Dispatch<React.SetStateAction<ActiveRideState | null>>;
  onConfirmSaveTravelTimes: (logs: MeasuredSegmentLog[]) => Promise<void>;
}

function formatTimerMs(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const tenths = Math.floor((safeMs % 1000) / 100);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function formatSecondsCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export const RideModeModal: React.FC<RideModeModalProps> = ({
  language,
  rideState,
  isAdmin,
  travelTimeOverrides,
  onMinimize,
  onEndRide,
  onViewOnMap,
  onUpdateRideState,
  onConfirmSaveTravelTimes,
}) => {
  const t = translations[language];
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isSavingTimes, setIsSavingTimes] = useState(false);
  const [showEndRideConfirm, setShowEndRideConfirm] = useState(false);

  const {
    route,
    steps,
    currentStepIndex,
    loggingEnabled,
    loggingStatus,
    segmentTimerStartedAt,
    measuredSegments,
    showComparisonModal,
  } = rideState;

  const isRunningTimer = loggingEnabled && loggingStatus === 'running' && segmentTimerStartedAt !== null;

  useEffect(() => {
    if (!isRunningTimer) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, [isRunningTimer, segmentTimerStartedAt]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;
  const totalStopsCount = steps.length;
  const isFinalStop = currentStepIndex >= steps.length - 1;
  const remainingStops = Math.max(0, steps.length - 1 - currentStepIndex);

  const progressPercent = useMemo(() => {
    if (steps.length <= 1) return 100;
    return Math.min(100, Math.max(0, Math.round((currentStepIndex / (steps.length - 1)) * 100)));
  }, [currentStepIndex, steps.length]);

  const remainingMinutes = useMemo(() => {
    if (isFinalStop) return 0;
    let totalSec = 0;
    for (let i = currentStepIndex; i < steps.length - 1; i++) {
      totalSec += steps[i].segmentSecondsToNext || 0;
      if (steps[i + 1]?.isTransferArrival) {
        totalSec += 3 * 60;
      }
    }
    return Math.max(1, Math.round((totalSec / 60) * 10) / 10);
  }, [currentStepIndex, isFinalStop, steps]);

  const completeness = useMemo(() => isCompleteSingleLineRoute(route), [route]);

  const originStation = STATIONS[steps[0]?.stationId || route.pathStationIds[0]];
  const destStation = STATIONS[steps[steps.length - 1]?.stationId || route.pathStationIds[route.pathStationIds.length - 1]];
  const currentStation = currentStep ? STATIONS[currentStep.stationId] : null;
  const nextStation = nextStep ? STATIONS[nextStep.stationId] : null;
  const currentLine = currentStep ? METRO_LINES[currentStep.lineId] : null;
  const transferTargetLine = currentStep?.transferToLineId
    ? METRO_LINES[currentStep.transferToLineId]
    : null;

  const liveElapsedMs =
    isRunningTimer && segmentTimerStartedAt !== null ? Math.max(0, nowMs - segmentTimerStartedAt) : 0;

  // Normal passenger step navigation
  const handleStepChange = (targetIdx: number) => {
    if (isRunningTimer) return;
    const clamped = Math.max(0, Math.min(steps.length - 1, targetIdx));
    haptic.selection();
    onUpdateRideState((prev) =>
      prev
        ? {
            ...prev,
            currentStepIndex: clamped,
          }
        : null
    );
  };

  // Toggle Admin Travel Time Logging
  const handleToggleLogging = () => {
    if (!isAdmin || !completeness.eligible) {
      haptic.warning();
      return;
    }
    haptic.medium();
    onUpdateRideState((prev) => {
      if (!prev) return null;
      const nextEnabled = !prev.loggingEnabled;
      return {
        ...prev,
        loggingEnabled: nextEnabled,
        loggingStatus: 'idle',
        segmentTimerStartedAt: null,
        measuredSegments: [],
        showComparisonModal: false,
        currentStepIndex: nextEnabled ? 0 : prev.currentStepIndex,
      };
    });
  };

  // Admin Logging: Start timer at first station
  const handleStartLoggingTimer = () => {
    if (!isAdmin || !completeness.eligible) return;
    haptic.routeCalculated();
    const startTime = Date.now();
    setNowMs(startTime);
    onUpdateRideState((prev) =>
      prev
        ? {
            ...prev,
            currentStepIndex: 0,
            loggingStatus: 'running',
            segmentTimerStartedAt: startTime,
            measuredSegments: [],
            showComparisonModal: false,
          }
        : null
    );
  };

  // Admin Logging: Station Passed button
  const handleStationPassed = () => {
    if (!isAdmin || !isRunningTimer || !currentStep || !nextStep || segmentTimerStartedAt === null) {
      return;
    }
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.round((now - segmentTimerStartedAt) / 1000));
    const lineId = currentStep.lineId;
    const oldDurationSeconds = getEffectiveSegmentSeconds(
      lineId,
      currentStep.stationId,
      nextStep.stationId,
      travelTimeOverrides
    );
    const oldDurationMinutes = Math.max(0.1, Number((oldDurationSeconds / 60).toFixed(1)));
    const newDurationMinutes = Math.max(0.1, Number((elapsedSeconds / 60).toFixed(1)));

    const newLog: MeasuredSegmentLog = {
      id: getSegmentTimeKey(lineId, currentStep.stationId, nextStep.stationId),
      lineId,
      fromStationId: currentStep.stationId,
      toStationId: nextStep.stationId,
      oldDurationSeconds,
      oldDurationMinutes,
      newDurationSeconds: elapsedSeconds,
      newDurationMinutes,
    };

    const nextIdx = currentStepIndex + 1;
    const reachedFinal = nextIdx >= steps.length - 1;

    if (reachedFinal) {
      haptic.success();
    } else {
      haptic.medium();
    }

    setNowMs(now);
    onUpdateRideState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentStepIndex: nextIdx,
        loggingStatus: reachedFinal ? 'completed' : 'running',
        segmentTimerStartedAt: reachedFinal ? null : now,
        measuredSegments: [...prev.measuredSegments, newLog],
      };
    });
  };

  const handleRestartLogging = () => {
    haptic.warning();
    onUpdateRideState((prev) =>
      prev
        ? {
            ...prev,
            currentStepIndex: 0,
            loggingStatus: 'idle',
            segmentTimerStartedAt: null,
            measuredSegments: [],
            showComparisonModal: false,
          }
        : null
    );
  };

  const handleOpenComparison = () => {
    haptic.selection();
    onUpdateRideState((prev) =>
      prev
        ? {
            ...prev,
            showComparisonModal: true,
          }
        : null
    );
  };

  const handleCloseComparison = () => {
    haptic.light();
    onUpdateRideState((prev) =>
      prev
        ? {
            ...prev,
            showComparisonModal: false,
          }
        : null
    );
  };

  const handleConfirmUpdateTimes = async () => {
    if (isSavingTimes || measuredSegments.length === 0) return;
    setIsSavingTimes(true);
    try {
      await onConfirmSaveTravelTimes(measuredSegments);
    } finally {
      setIsSavingTimes(false);
    }
  };

  // Totals for comparison modal
  const oldTotalSeconds = useMemo(
    () => measuredSegments.reduce((acc, s) => acc + s.oldDurationSeconds, 0),
    [measuredSegments]
  );
  const newTotalSeconds = useMemo(
    () => measuredSegments.reduce((acc, s) => acc + s.newDurationSeconds, 0),
    [measuredSegments]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop - clicking minimizes instead of ending ride */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          haptic.light();
          onMinimize();
        }}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full sm:max-w-xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {t.rideModeTitle}
                </h2>
                {route.linesUsed.map((lId) => {
                  const line = METRO_LINES[lId];
                  if (!line) return null;
                  return (
                    <span
                      key={lId}
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.badge}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {originStation?.name} ➔ {destStation?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onMinimize();
                onViewOnMap();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              title={t.viewOnMap}
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t.viewOnMap}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptic.light();
                onMinimize();
              }}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
              title={t.close}
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showComparisonModal ? (
            /* ================= ADMIN COMPARISON & CONFIRMATION VIEW ================= */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-extrabold">{t.comparisonTitle}</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.comparisonQuestion}
                </p>
              </div>

              {/* Totals Summary Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {t.oldTotal}
                  </span>
                  <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-200">
                    {formatSecondsCompact(oldTotalSeconds)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    ({Math.max(0.1, Number((oldTotalSeconds / 60).toFixed(1)))} {t.min})
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    {t.newTotal}
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {formatSecondsCompact(newTotalSeconds)}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    ({Math.max(0.1, Number((newTotalSeconds / 60).toFixed(1)))} {t.min})
                  </span>
                </div>
              </div>

              {/* Segment-by-Segment Comparison Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/70 dark:bg-slate-950/40">
                <div className="grid grid-cols-12 gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                  <div className="col-span-6">{t.currentSegment}</div>
                  <div className="col-span-2 text-right">{t.oldTime}</div>
                  <div className="col-span-2 text-right">{t.newTime}</div>
                  <div className="col-span-2 text-right">{t.differenceLabel}</div>
                </div>
                <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 max-h-60 overflow-y-auto">
                  {measuredSegments.map((seg, i) => {
                    const diff = seg.newDurationSeconds - seg.oldDurationSeconds;
                    return (
                      <div
                        key={`${seg.id}-${i}`}
                        className="grid grid-cols-12 gap-1 px-3 py-2 text-xs items-center"
                      >
                        <div className="col-span-6 min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                            {STATIONS[seg.fromStationId]?.name || seg.fromStationId}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                            <span>{STATIONS[seg.toStationId]?.name || seg.toStationId}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {seg.oldDurationSeconds}s
                        </div>
                        <div className="col-span-2 text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {seg.newDurationSeconds}s
                        </div>
                        <div
                          className={`col-span-2 text-right font-mono text-[10px] font-bold ${
                            diff > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : diff < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {diff > 0 ? `+${diff}s` : `${diff}s`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Second & Final Confirmation Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingTimes}
                  onClick={handleCloseComparison}
                  className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={isSavingTimes}
                  onClick={handleConfirmUpdateTimes}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {isSavingTimes ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{t.confirmUpdateTimes}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= ACTIVE RIDE TRACKER MAIN BODY ================= */
            <>
              {/* Progress Bar & Remaining Countdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.progressLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold font-mono">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">
                      {remainingStops} {t.stops}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {remainingMinutes} {t.min}
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: `${Math.max(4, progressPercent)}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: currentLine?.color || '#10B981',
                    }}
                  />
                </div>

                {/* Current Station -> Next Station Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 ring-4 ring-emerald-500/20"
                      style={{ backgroundColor: currentLine?.color || '#10B981' }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        {language === 'de' ? 'Aktuelle Station' : 'Current Station'} ({currentStepIndex + 1}/{totalStopsCount})
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                        {currentStation?.name}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
                    {isFinalStop ? (
                      <Flag className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        {isFinalStop ? t.destinationReached : t.nextStop}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                        {isFinalStop ? currentStation?.name : nextStation?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-Transfer Warning (1 stop BEFORE transfer) */}
              {currentStep?.isTransferBeforeNextStop && nextStation && transferTargetLine && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/45 border-2 border-amber-400 dark:border-amber-600/70 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      {t.transferAlertBefore}
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                      {language === 'de'
                        ? `Nächster Halt ist ${nextStation.name}. Dort aussteigen und umsteigen in ${transferTargetLine.name}.`
                        : `Next stop is ${nextStation.name}. Get ready to transfer to ${transferTargetLine.name}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* At-Transfer Station Banner */}
              {currentStep?.isTransferArrival && transferTargetLine && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/45 border-2 border-blue-400 dark:border-blue-600/70 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                      {t.transferAlertNow}
                    </h4>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-snug">
                      {language === 'de'
                        ? `An ${currentStation?.name}: Wechseln von ${currentLine?.shortName} in ${transferTargetLine.name}.`
                        : `At ${currentStation?.name}: Change from ${currentLine?.shortName} to ${transferTargetLine.name}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Operational Transfer Notice for Jurassic Park (IC 10) */}
              {currentStep?.isOperationalTransfer && (
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-2.5 text-xs text-sky-900 dark:text-sky-200">
                  <Train className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    {language === 'de'
                      ? 'Betrieblicher Zugwechsel an Jurassic Park (Linie IC 10).'
                      : 'Operational train transfer at Jurassic Park (Line IC 10).'}
                  </span>
                </div>
              )}

              {/* Final Stop Reached Banner (Passenger Mode) */}
              {isFinalStop && !loggingEnabled && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center gap-3 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold">{t.destinationReachedRide}</span>
                </div>
              )}

              {/* Standard Passenger Navigation Controls (hidden/disabled when stopwatch timer is active) */}
              {!loggingEnabled && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={currentStepIndex === 0}
                    onClick={() => handleStepChange(currentStepIndex - 1)}
                    className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t.prevStop}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFinalStop}
                    onClick={() => handleStepChange(currentStepIndex + 1)}
                    className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                  >
                    <span>{t.nextStop}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ==================== ADMIN-ONLY TRAVEL TIME LOGGING PANEL ==================== */}
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/70 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-100">
                          {t.travelTimeLogging}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        {t.travelTimeLoggingDesc}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      disabled={!completeness.eligible}
                      onClick={handleToggleLogging}
                      aria-label={t.travelTimeLogging}
                      className={`w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                        !completeness.eligible
                          ? 'bg-slate-300 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                          : loggingEnabled
                          ? 'bg-indigo-600 cursor-pointer'
                          : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${
                          loggingEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Strict Single Complete Line Gate Notice */}
                  {!completeness.eligible && (
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-700/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        {completeness.reason === 'multi-line'
                          ? t.loggingMultiLineDisabled
                          : t.loggingPartialLineDisabled}
                        {completeness.expectedStationsCount && completeness.routeStationsCount
                          ? ` (${completeness.routeStationsCount}/${completeness.expectedStationsCount} ${t.stops})`
                          : ''}
                      </span>
                    </div>
                  )}

                  {/* Active Logging Workflow */}
                  {completeness.eligible && loggingEnabled && (
                    <div className="space-y-3 pt-1 border-t border-indigo-200/70 dark:border-indigo-800/60">
                      {loggingStatus === 'idle' && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            {language === 'de'
                              ? `Bereit an der Startstation ${originStation?.name}. Starte den Timer bei Abfahrt.`
                              : `Ready at ${originStation?.name}. Press Start Journey when departing the first station.`}
                          </p>
                          <button
                            type="button"
                            onClick={handleStartLoggingTimer}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>
                              {t.startTimerAtFirstStop} {originStation?.name}
                            </span>
                          </button>
                        </div>
                      )}

                      {loggingStatus === 'running' && nextStation && (
                        <div className="space-y-3">
                          {/* Live Segment & Stopwatch Readout */}
                          <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                {t.timerRunningLabel}
                              </span>
                              <div className="text-xs font-bold truncate mt-0.5">
                                {currentStation?.name} ➔ {nextStation.name}
                              </div>
                            </div>
                            <div className="text-2xl font-black font-mono tabular-nums text-emerald-300 shrink-0">
                              {formatTimerMs(liveElapsedMs)}
                            </div>
                          </div>

                          {/* Station Passed Button */}
                          <button
                            type="button"
                            onClick={handleStationPassed}
                            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] cursor-pointer"
                          >
                            {currentStepIndex === steps.length - 2 ? (
                              <>
                                <Flag className="w-4 h-4" />
                                <span>
                                  {t.finalStationReachedBtn} {nextStation.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {t.stationPassedBtn} {nextStation.name}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {loggingStatus === 'completed' && (
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 text-emerald-900 dark:text-emerald-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold">{t.timerStoppedLabel}</span>
                            </div>
                            <span className="text-xs font-mono font-black">
                              {formatSecondsCompact(newTotalSeconds)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenComparison}
                            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>{t.finishLoggingUpdateTimes}</span>
                          </button>
                        </div>
                      )}

                      {/* Live list of already measured segments + restart */}
                      {measuredSegments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>
                              {t.measuredSegmentsTitle} ({measuredSegments.length}/{steps.length - 1})
                            </span>
                            <button
                              type="button"
                              onClick={handleRestartLogging}
                              className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{t.restartLogging}</span>
                            </button>
                          </div>

                          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                            {measuredSegments.map((seg, i) => (
                              <div
                                key={`${seg.id}-${i}`}
                                className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px]"
                              >
                                <span className="truncate text-slate-700 dark:text-slate-300">
                                  {STATIONS[seg.fromStationId]?.name} ➔ {STATIONS[seg.toStationId]?.name}
                                </span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                                  {seg.newDurationSeconds}s
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stop-by-Stop Vertical Route Timeline */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  {t.detailedPlan}
                </span>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-3 space-y-1">
                  {steps.map((step, idx) => {
                    const st = STATIONS[step.stationId];
                    const line = METRO_LINES[step.lineId];
                    const isPassed = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const isNext = idx === currentStepIndex + 1;
                    const clickable = !isRunningTimer && !loggingEnabled;

                    return (
                      <div
                        key={`${step.stationId}-${idx}`}
                        onClick={() => clickable && handleStepChange(idx)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition ${
                          clickable ? 'cursor-pointer hover:bg-white dark:hover:bg-slate-900' : ''
                        } ${
                          isCurrent
                            ? 'bg-white dark:bg-slate-900 border border-emerald-400/70 shadow-xs'
                            : isNext
                            ? 'bg-blue-50/60 dark:bg-blue-950/20'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? 'ring-4 ring-emerald-500/25'
                                : isPassed
                                ? 'opacity-50'
                                : ''
                            }`}
                            style={{
                              backgroundColor: isCurrent
                                ? '#10B981'
                                : isPassed
                                ? line?.color || '#64748B'
                                : 'transparent',
                              border: `2px solid ${line?.color || '#64748B'}`,
                            }}
                          >
                            {isPassed && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs truncate ${
                                  isCurrent
                                    ? 'font-extrabold text-slate-900 dark:text-white'
                                    : isPassed
                                    ? 'text-slate-400 line-through'
                                    : 'font-semibold text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {st?.name || step.stationId}
                              </span>
                              {step.isTransferArrival && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold shrink-0">
                                  {language === 'de' ? 'Umstieg' : 'Transfer'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {line && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white"
                              style={{ backgroundColor: line.color }}
                            >
                              {line.badge}
                            </span>
                          )}
                          {idx < steps.length - 1 && (
                            <span className="text-[10px] font-mono text-slate-400 w-10 text-right">
                              {formatSecondsCompact(step.segmentSecondsToNext)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions: Close (keeps Active Ride) vs End Ride (destroys ride) */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onMinimize();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.close}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.warning();
              setShowEndRideConfirm(true);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{t.endRide}</span>
          </button>
        </div>
      </motion.div>

      {/* Small Confirmation Dialog on top of Active Journey Tracker */}
      <AnimatePresence>
        {showEndRideConfirm && (
          <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                haptic.light();
                setShowEndRideConfirm(false);
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Power className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {t.confirmEndRideTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t.confirmEndRideMessage}
                  </p>
                </div>
              </div>

              {loggingEnabled && (loggingStatus === 'running' || measuredSegments.length > 0) && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/45 border border-amber-300 dark:border-amber-700/70 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{t.confirmEndRideLoggingWarning}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setShowEndRideConfirm(false);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic.heavy();
                    setShowEndRideConfirm(false);
                    onEndRide();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25 transition active:scale-[0.98] cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{t.confirmEndRideBtn}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
