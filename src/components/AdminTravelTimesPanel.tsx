import React, { useMemo, useState } from 'react';
import { LineId, TravelTimeOverridesMap } from '../types/metro';
import { METRO_LINES, STATIONS } from '../data/metroData';
import { getLineTotalTravelTime } from '../utils/routeFinder';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';
import {
  Timer,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface AdminTravelTimesPanelProps {
  language: Language;
  travelTimeOverrides: TravelTimeOverridesMap;
  onResetLineTravelTimes: (lineId: LineId) => Promise<void>;
}

function formatSecondsDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function formatTimestamp(ms: number, language: Language): string {
  return new Date(ms).toLocaleString(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const AdminTravelTimesPanel: React.FC<AdminTravelTimesPanelProps> = ({
  language,
  travelTimeOverrides,
  onResetLineTravelTimes,
}) => {
  const t = translations[language];
  const [filterMode, setFilterMode] = useState<'all' | 'timed'>('all');
  const [expandedLineId, setExpandedLineId] = useState<LineId | null>(null);
  const [confirmingLineId, setConfirmingLineId] = useState<LineId | null>(null);
  const [resettingLineId, setResettingLineId] = useState<LineId | null>(null);

  const lineSummaries = useMemo(() => {
    return Object.values(METRO_LINES)
      .filter((line) => line.stations && line.stations.length >= 2)
      .map((line) => ({
        line,
        summary: getLineTotalTravelTime(line.id, travelTimeOverrides),
      }));
  }, [travelTimeOverrides]);

  const timedLinesCount = useMemo(
    () => lineSummaries.filter((entry) => entry.summary.hasMeasuredSegments).length,
    [lineSummaries]
  );

  const visibleLines = useMemo(() => {
    const base =
      filterMode === 'timed'
        ? lineSummaries.filter((entry) => entry.summary.hasMeasuredSegments)
        : lineSummaries;
    // Sort lines with active measurements first when viewing all so admins see timed lines immediately
    return [...base].sort((a, b) => {
      const aTime = a.summary.lastUpdatedAt ?? 0;
      const bTime = b.summary.lastUpdatedAt ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return 0;
    });
  }, [filterMode, lineSummaries]);

  const handleConfirmReset = async (lineId: LineId) => {
    if (resettingLineId) return;
    setResettingLineId(lineId);
    try {
      await onResetLineTravelTimes(lineId);
      setConfirmingLineId(null);
    } finally {
      setResettingLineId(null);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 space-y-3">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
            <Timer className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{t.measurementHistoryTitle}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.measurementHistoryDesc}
          </p>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 shrink-0 tabular-nums">
          {timedLinesCount}/{lineSummaries.length}
        </span>
      </div>

      {/* Filter Segmented Control */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60">
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setFilterMode('all');
          }}
          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
            filterMode === 'all'
              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {t.filterAllLines} ({lineSummaries.length})
        </button>
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            setFilterMode('timed');
          }}
          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
            filterMode === 'timed'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {t.filterTimedOnly} ({timedLinesCount})
        </button>
      </div>

      {/* Lines List */}
      {visibleLines.length === 0 ? (
        <div className="py-5 px-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-dashed border-slate-200 dark:border-zinc-700 text-center space-y-1">
          <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.notTimedYet}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-0.5">
          {visibleLines.map(({ line, summary }) => {
            const isExpanded = expandedLineId === line.id;
            const isConfirming = confirmingLineId === line.id;
            const isResetting = resettingLineId === line.id;
            const totalDiffSec = summary.totalSeconds - summary.defaultTotalSeconds;

            return (
              <div
                key={line.id}
                className={`rounded-2xl border transition overflow-hidden ${
                  summary.hasMeasuredSegments
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-800/50'
                    : 'bg-slate-50/80 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800'
                }`}
              >
                {/* Collapsible Row Header */}
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setExpandedLineId((prev) => (prev === line.id ? null : line.id));
                  }}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-white/60 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white shrink-0 shadow-2xs min-w-[2.3rem] text-center"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.badge}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {line.name}
                        </span>
                        {summary.hasMeasuredSegments && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold tabular-nums">
                            {summary.measuredSegmentsCount}/{summary.totalSegmentsCount} {t.measuredCountLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                        {summary.lastUpdatedAt ? (
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>
                              {t.lastTimedLabel}: {formatTimestamp(summary.lastUpdatedAt, language)}
                            </span>
                          </span>
                        ) : (
                          <span>{t.notTimedYet}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right leading-tight">
                      <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                        {formatSecondsDuration(summary.totalSeconds)}
                      </div>
                      {summary.hasMeasuredSegments && totalDiffSec !== 0 && (
                        <div
                          className={`text-[9px] font-mono font-bold tabular-nums ${
                            totalDiffSec > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {totalDiffSec > 0 ? `+${totalDiffSec}s` : `${totalDiffSec}s`} vs{' '}
                          {formatSecondsDuration(summary.defaultTotalSeconds)}
                        </div>
                      )}
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Segment Overrides vs Defaults Breakdown */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-200/70 dark:border-zinc-800 space-y-2.5 bg-white/70 dark:bg-zinc-900/60">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-zinc-800">
                      <div className="col-span-6">{t.segmentComparisonHeader}</div>
                      <div className="col-span-2 text-right">{t.defaultLabel}</div>
                      <div className="col-span-2 text-right">{t.overrideLabel}</div>
                      <div className="col-span-2 text-right">{t.differenceLabel}</div>
                    </div>

                    {/* Per-Segment Rows */}
                    <div className="divide-y divide-slate-200/50 dark:divide-zinc-800/70">
                      {summary.segments.map((seg, sIdx) => {
                        const fromName = STATIONS[seg.fromStationId]?.name || seg.fromStationId;
                        const toName = STATIONS[seg.toStationId]?.name || seg.toStationId;
                        const diffSec = seg.durationSeconds - seg.defaultDurationSeconds;

                        return (
                          <div
                            key={`${seg.fromStationId}-${seg.toStationId}-${sIdx}`}
                            className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center text-[11px]"
                          >
                            <div className="col-span-6 min-w-0 pr-1">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[10.5px]">
                                {fromName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{toName}</span>
                              </div>
                              {seg.isMeasured && seg.updatedAt && (
                                <div className="text-[9px] text-emerald-600/90 dark:text-emerald-400/90 font-mono truncate">
                                  {formatTimestamp(seg.updatedAt, language)}
                                </div>
                              )}
                            </div>

                            <div className="col-span-2 text-right font-mono text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {seg.defaultDurationSeconds}s
                            </div>

                            <div
                              className={`col-span-2 text-right font-mono text-[10.5px] tabular-nums ${
                                seg.isMeasured
                                  ? 'font-extrabold text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {seg.durationSeconds}s
                            </div>

                            <div
                              className={`col-span-2 text-right font-mono text-[10px] font-bold tabular-nums ${
                                !seg.isMeasured
                                  ? 'text-slate-300 dark:text-slate-600'
                                  : diffSec > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : diffSec < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {!seg.isMeasured
                                ? '—'
                                : diffSec > 0
                                ? `+${diffSec}s`
                                : `${diffSec}s`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary & Single-Line Reset Action */}
                    <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 px-1">
                        <span>
                          {t.defaultLabel}: {formatSecondsDuration(summary.defaultTotalSeconds)} (~
                          {summary.defaultTotalMinutes} {t.min})
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {t.overrideLabel}: {formatSecondsDuration(summary.totalSeconds)} (~
                          {summary.totalMinutes} {t.min})
                        </span>
                      </div>

                      {summary.hasMeasuredSegments && (
                        isConfirming ? (
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-2">
                            <div className="flex items-start gap-2 text-[11px] text-rose-900 dark:text-rose-200">
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-extrabold">{t.confirmResetLineTitle}</div>
                                <div className="text-[10px] opacity-90">{t.confirmResetLineMessage}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isResetting}
                                onClick={() => {
                                  haptic.light();
                                  setConfirmingLineId(null);
                                }}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {t.cancel}
                              </button>
                              <button
                                type="button"
                                disabled={isResetting}
                                onClick={() => handleConfirmReset(line.id)}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                              >
                                {isResetting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                                <span>{t.confirmResetLineBtn}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              haptic.warning();
                              setConfirmingLineId(line.id);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>
                              {t.resetLineBtn} ({line.badge})
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
