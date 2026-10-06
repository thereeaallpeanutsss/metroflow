import React, { useState, useMemo } from 'react';
import { LineId, DisruptionType } from '../types/metro';
import { METRO_LINES, STATIONS } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
import { NewDisruptionPayload } from '../services/disruptionsService';
import { haptic } from '../utils/haptics';
import {
  X,
  AlertTriangle,
  ZapOff,
  ShoppingBag,
  Construction,
  Ban,
  ArrowRight,
  Send,
  Train,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface ReportDisruptionModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: NewDisruptionPayload) => Promise<void>;
  preselectedLineId?: LineId;
}

export const ReportDisruptionModal: React.FC<ReportDisruptionModalProps> = ({
  language,
  isOpen,
  onClose,
  onSubmit,
  preselectedLineId = 'U-Grün',
}) => {
  const t = translations[language];

  const [selectedLineId, setSelectedLineId] = useState<LineId>(preselectedLineId);
  const [selectedType, setSelectedType] = useState<DisruptionType>('missing_tracks');
  const [fromStationId, setFromStationId] = useState<string>('');
  const [toStationId, setToStationId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLine = METRO_LINES[selectedLineId];

  // Set default from/to stations when line changes
  React.useEffect(() => {
    if (selectedLine && selectedLine.stations.length >= 2) {
      setFromStationId(selectedLine.stations[0]);
      setToStationId(selectedLine.stations[1]);
    }
  }, [selectedLineId]);

  // Compute the affected stations between fromStationId and toStationId on the selected line
  const affectedStations = useMemo(() => {
    if (!selectedLine || !fromStationId || !toStationId) return [];
    const stations = selectedLine.stations;
    const idxFrom = stations.indexOf(fromStationId);
    const idxTo = stations.indexOf(toStationId);

    if (idxFrom !== -1 && idxTo !== -1) {
      const start = Math.min(idxFrom, idxTo);
      const end = Math.max(idxFrom, idxTo);
      return stations.slice(start, end + 1);
    }
    return [fromStationId, toStationId];
  }, [selectedLine, fromStationId, toStationId]);

  if (!isOpen) return null;

  const disruptionTypes: {
    type: DisruptionType;
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    badgeBg: string;
  }[] = [
    {
      type: 'missing_tracks',
      label: t.missingTracks,
      desc: t.missingTracksDesc,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      color: 'border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
      badgeBg: 'bg-amber-500 text-white',
    },
    {
      type: 'inactive_redstone',
      label: t.inactiveRedstone,
      desc: t.inactiveRedstoneDesc,
      icon: <ZapOff className="w-5 h-5 text-rose-500" />,
      color: 'border-rose-500/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200',
      badgeBg: 'bg-rose-600 text-white',
    },
    {
      type: 'empty_minecart',
      label: t.emptyMinecart,
      desc: t.emptyMinecartDesc,
      icon: <ShoppingBag className="w-5 h-5 text-purple-500" />,
      color: 'border-purple-500/40 bg-purple-50/70 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200',
      badgeBg: 'bg-purple-600 text-white',
    },
    {
      type: 'construction',
      label: t.construction,
      desc: t.constructionDesc,
      icon: <Construction className="w-5 h-5 text-orange-500" />,
      color: 'border-orange-500/40 bg-orange-50/70 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200',
      badgeBg: 'bg-orange-500 text-white',
    },
    {
      type: 'closure',
      label: t.closure,
      desc: t.closureDesc,
      icon: <Ban className="w-5 h-5 text-red-500" />,
      color: 'border-red-500/40 bg-red-50/70 dark:bg-red-950/20 text-red-900 dark:text-red-200',
      badgeBg: 'bg-red-600 text-white',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromStationId || !toStationId) {
      setErrorMessage(
        language === 'de'
          ? 'Bitte wähle die beiden betroffenen Stationen aus.'
          : 'Please select both affected stations.'
      );
      return;
    }
    if (fromStationId === toStationId) {
      setErrorMessage(
        language === 'de'
          ? 'Start- und Endstation der Störung dürfen nicht identisch sein.'
          : 'Start and end station cannot be identical.'
      );
      return;
    }

    const typeConfig = disruptionTypes.find((dt) => dt.type === selectedType);
    const fromName = STATIONS[fromStationId]?.name || fromStationId;
    const toName = STATIONS[toStationId]?.name || toStationId;
    const generatedTitle = `${typeConfig?.label || selectedType}: ${fromName} ↔ ${toName}`;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        lineId: selectedLineId,
        type: selectedType,
        title: generatedTitle,
        description: notes.trim(),
        fromStationId,
        toStationId,
        affectedStations,
        reportedBy: reporterName.trim() || undefined,
      });
      haptic.success();
      onClose();
    } catch (err) {
      haptic.error();
      setErrorMessage(t.reportFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {t.reportDisruptionTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.reportDisruptionSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Line Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t.affectedLine}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/40">
              {Object.values(METRO_LINES).map((line) => {
                const isSelected = selectedLineId === line.id;
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setSelectedLineId(line.id);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-left flex items-center gap-1.5 transition text-xs font-semibold border ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-600 shadow-sm ring-1 ring-blue-500'
                        : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="truncate">{line.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Disruption Type Selection (Minecraft lore included) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t.disruptionType}
            </label>
            <div className="space-y-1.5">
              {disruptionTypes.map((dt) => {
                const isSelected = selectedType === dt.type;
                return (
                  <button
                    key={dt.type}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setSelectedType(dt.type);
                    }}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition border ${
                      isSelected
                        ? `${dt.color} ring-2 ring-blue-500/50 shadow-sm`
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{dt.icon}</div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{dt.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                          {dt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Station Segment Selection */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {t.betweenStations}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {affectedStations.length} {language === 'de' ? 'Stationen betroffen' : 'stations affected'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.fromStation}
                </label>
                <select
                  value={fromStationId}
                  onChange={(e) => setFromStationId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {selectedLine?.stations.map((stId) => (
                    <option key={stId} value={stId}>
                      {STATIONS[stId]?.name || stId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.toStation}
                </label>
                <select
                  value={toStationId}
                  onChange={(e) => setToStationId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {selectedLine?.stations.map((stId) => (
                    <option key={stId} value={stId}>
                      {STATIONS[stId]?.name || stId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Affected Station Pills Preview */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {affectedStations.map((stId, i) => (
                <React.Fragment key={stId}>
                  <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                    {STATIONS[stId]?.name || stId}
                  </span>
                  {i < affectedStations.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 4. Optional Description & Reporter Name */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.optionalNotes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.reporterName}
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder={t.reporterPlaceholder}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? '...' : t.submitReport}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
