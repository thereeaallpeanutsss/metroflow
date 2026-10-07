import React, { useState } from 'react';
import { LineId, Station, Disruption, LineNetworkType } from '../types/metro';
import { METRO_LINES, STATIONS } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
import { ReportDisruptionModal } from './ReportDisruptionModal';
import { NewDisruptionPayload } from '../services/disruptionsService';
import { haptic } from '../utils/haptics';
import {
  Search,
  Train,
  TrainFront,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Construction,
  ChevronRight,
  MapPin,
  ArrowRight,
  Plus,
  RefreshCw,
  Info,
  ThumbsUp,
  ZapOff,
  ShoppingBag,
  Ban,
  User,
  ShieldCheck,
  Pencil,
  Trash2,
} from 'lucide-react';

interface LineDirectoryProps {
  language: Language;
  disruptions: Disruption[];
  userConfirmedIds: string[];
  userResolvedIds?: string[];
  onConfirmDisruption: (id: string) => Promise<void>;
  onReportResolved?: (id: string) => Promise<void>;
  onReportDisruption: (payload: NewDisruptionPayload) => Promise<void>;
  onSelectStation: (stationId: string) => void;
  onSetOrigin: (stationId: string) => void;
  onSetDestination: (stationId: string) => void;
  isAdmin?: boolean;
  onEditDisruption?: (disruption: Disruption) => void;
  onDeleteDisruption?: (id: string) => Promise<void>;
}

export const LineDirectory: React.FC<LineDirectoryProps> = ({
  language,
  disruptions,
  userConfirmedIds,
  userResolvedIds = [],
  onConfirmDisruption,
  onReportResolved,
  onReportDisruption,
  onSelectStation,
  onSetOrigin,
  onSetDestination,
  isAdmin = false,
  onEditDisruption,
  onDeleteDisruption,
}) => {
  const t = translations[language];

  // Network filter: Metro or IC
  const [networkType, setNetworkType] = useState<LineNetworkType>('metro');
  const [selectedLineId, setSelectedLineId] = useState<LineId>('U-Grün');
  const [filterType, setFilterType] = useState<'all' | 'airport' | 'ic' | 'accessible'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const activeLine = METRO_LINES[selectedLineId];

  // Filter lines by selected network type
  const availableLines = Object.values(METRO_LINES).filter(
    (line) => line.networkType === networkType
  );

  // When switching network type, auto-select first line in that category
  const handleSelectNetwork = (type: LineNetworkType) => {
    haptic.selection();
    setNetworkType(type);
    const firstLine = Object.values(METRO_LINES).find((l) => l.networkType === type);
    if (firstLine) {
      setSelectedLineId(firstLine.id);
    }
  };

  // Station directory filtering
  const allStations = Object.values(STATIONS);
  const filteredStations = allStations.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'airport') return st.hasAirport;
    if (filterType === 'ic') return st.hasIC;
    if (filterType === 'accessible') return st.isAccessible;

    return true;
  });

  const handleSimulateDisruption = async () => {
    haptic.medium();
    await onReportDisruption({
      lineId: 'U-Grün',
      type: 'missing_tracks',
      title:
        language === 'de'
          ? 'Fehlende Gleise: Daniel Tower ↔ Badesee'
          : 'Missing tracks: Daniel Tower ↔ Badesee',
      description:
        language === 'de'
          ? 'Gleise vor dem Tunnel wurden abgebaut. Bitte Umfahrung über U-Rot nutzen.'
          : 'Tracks before tunnel are missing. Please use bypass via U-Rot.',
      fromStationId: 'daniel-tower',
      toStationId: 'badesee',
      affectedStations: ['daniel-tower', 'badesee'],
      reportedBy: 'Alex (Minecart Guide)',
    });
  };

  const getDisruptionTypeIcon = (type: string) => {
    switch (type) {
      case 'inactive_redstone':
        return <ZapOff className="w-4 h-4 text-rose-500" />;
      case 'empty_minecart':
        return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      case 'closure':
        return <Ban className="w-4 h-4 text-red-500" />;
      case 'construction':
        return <Construction className="w-4 h-4 text-orange-500" />;
      case 'missing_tracks':
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-24">
      {/* ----------------- CURRENT DISRUPTIONS & SERVICE STATUS (TOP SECTION) ----------------- */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.disruptionsTitle}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Live-Status für U-Bahn & IC-Fernverkehr
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                haptic.light();
                setIsReportModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-amber-500/25 flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.reportDisruption}</span>
            </button>
          </div>
        </div>

        {/* Disruption Feed */}
        {disruptions.length === 0 ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t.allLinesOperational}</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                {t.normalService}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
              {t.noDisruptions}
            </p>

            <div className="pt-2 pl-6 flex items-center justify-between border-t border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[10px] text-slate-400">
                Gleisprobleme bemerkt? Melde sie sofort an alle Fahrgäste.
              </span>
              <button
                onClick={handleSimulateDisruption}
                className="text-[10px] text-slate-400 hover:text-blue-500 underline whitespace-nowrap ml-2"
              >
                {t.simulateDisruption}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {disruptions.map((disrupt) => {
              const hasConfirmed = userConfirmedIds.includes(disrupt.id);
              const line = METRO_LINES[disrupt.lineId];
              const fromName = STATIONS[disrupt.fromStationId]?.name || disrupt.fromStationId;
              const toName = STATIONS[disrupt.toStationId]?.name || disrupt.toStationId;

              return (
                <div
                  key={disrupt.id}
                  className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs space-y-2 text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                      {getDisruptionTypeIcon(disrupt.type)}
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

                  {/* Section between stations */}
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-6">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      {fromName} ↔ {toName}
                    </span>
                    {disrupt.affectedStations && disrupt.affectedStations.length > 2 && (
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        ({disrupt.affectedStations.length} Stationen)
                      </span>
                    )}
                  </div>

                  {/* Description note */}
                  {disrupt.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-6 italic">
                      "{disrupt.description}"
                    </p>
                  )}

                  {/* Reporter tag & Confirmation action */}
                  <div className="pt-2 pl-6 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/60 dark:border-amber-800/40">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {disrupt.reportedBy && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{disrupt.reportedBy}</span>
                        </span>
                      )}
                      <span>•</span>
                      <span>Vor wenigen Minuten</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Confirmation Button */}
                      <button
                        onClick={() => {
                          haptic.medium();
                          onConfirmDisruption(disrupt.id);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition active:scale-95 border ${
                          hasConfirmed
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700'
                        }`}
                      >
                        {hasConfirmed ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{t.confirmed} ({disrupt.confirmations})</span>
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>{t.confirmDisruption} ({disrupt.confirmations})</span>
                          </>
                        )}
                      </button>

                      {/* Report Disruption Gone / Resolved (disappears after 10 reports) */}
                      {onReportResolved && (
                        <button
                          onClick={() => {
                            haptic.success();
                            onReportResolved(disrupt.id);
                          }}
                          disabled={userResolvedIds.includes(disrupt.id)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition active:scale-95 border ${
                            userResolvedIds.includes(disrupt.id)
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 opacity-90'
                              : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          }`}
                          title={
                            language === 'de'
                              ? 'Wenn 10 Nutzer melden, dass die Störung behoben ist, wird sie automatisch gelöscht.'
                              : 'When 10 users report this disruption is resolved, it will be automatically removed.'
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {userResolvedIds.includes(disrupt.id)
                              ? t.disruptionGoneReported
                              : t.reportDisruptionGone}{' '}
                            ({disrupt.resolvedReports || 0}/10)
                          </span>
                        </button>
                      )}

                      {/* Admin Management Buttons: Edit & Delete */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-amber-200 dark:border-amber-800/60">
                          {onEditDisruption && (
                            <button
                              onClick={() => {
                                haptic.medium();
                                onEditDisruption(disrupt);
                              }}
                              className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-300 dark:border-slate-700 transition"
                              title={t.editDisruption}
                            >
                              <Pencil className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>{t.editDisruption}</span>
                            </button>
                          )}
                          {onDeleteDisruption && (
                            <button
                              onClick={async () => {
                                if (window.confirm(t.confirmDeleteDisruption)) {
                                  haptic.medium();
                                  await onDeleteDisruption(disrupt.id);
                                }
                              }}
                              className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 active:scale-95 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-900 transition"
                              title={t.deleteDisruption}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t.deleteDisruption}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-1 px-1">
              <span className="text-[10px] text-slate-400">
                {disruptions.length} {disruptions.length === 1 ? 'Meldung aktiv' : 'Meldungen aktiv'}
              </span>
              <span className="text-[10px] text-slate-400">
                Wird nach 10 Behoben-Meldungen automatisch entfernt
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Disruption Reporting Modal */}
      <ReportDisruptionModal
        language={language}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={onReportDisruption}
        preselectedLineId={selectedLineId}
      />

      {/* Network Type Selector: Metro vs IC Trains */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => handleSelectNetwork('metro')}
              className={`py-2 px-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition active:scale-95 border ${
                networkType === 'metro'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <TrainFront className="w-4 h-4" />
              <span>{t.metroTab} (6)</span>
            </button>

            <button
              onClick={() => handleSelectNetwork('ic')}
              className={`py-2 px-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition active:scale-95 border ${
                networkType === 'ic'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Train className="w-4 h-4" />
              <span>{t.icTab} (7)</span>
            </button>
          </div>
        </div>

        {/* Line Pill Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
          {availableLines.map((line) => {
            const isSelected = selectedLineId === line.id;
            return (
              <button
                key={line.id}
                onClick={() => {
                  haptic.selection();
                  setSelectedLineId(line.id);
                }}
                className={`py-2 px-2.5 rounded-2xl flex items-center gap-2 transition active:scale-95 border ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: line.color }}
                />
                <div className="text-left truncate">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {line.badge}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {line.shortName}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Line Details Card */}
        {activeLine && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: activeLine.color }}
                >
                  {activeLine.badge}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeLine.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  ~{activeLine.frequencyMinutes} {t.min}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeLine.description}
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/40">
              {t.terminals}{' '}
              <strong className="text-slate-900 dark:text-white">{activeLine.terminals[0]}</strong> ↔{' '}
              <strong className="text-slate-900 dark:text-white">{activeLine.terminals[1]}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Stations along Selected Line */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>{activeLine.shortName}</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {activeLine.stations.length} {t.stationsCount}
          </span>
        </h3>

        <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800/50">
          {activeLine.stations.map((stId, idx) => {
            const st = STATIONS[stId];
            if (!st) return null;
            return (
              <div
                key={stId}
                className="py-2.5 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{st.name}</span>
                      {st.hasAirport && <span className="text-xs">✈</span>}
                      {st.hasIC && <span className="text-xs">🚆</span>}
                      {st.hasICTransferRequired && <span className="text-xs">⚙️</span>}
                      {st.isAccessible && <span className="text-xs">♿</span>}
                      {st.isTimTrain && (
                        <span className="w-3.5 h-3.5 rounded-full border border-purple-400 text-[8px] flex items-center justify-center font-bold text-purple-600 dark:text-purple-300">
                          T
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {st.lines.slice(0, 4).map((lId) => (
                        <span
                          key={lId}
                          className="px-1 py-0.2 rounded text-[8px] font-bold text-white"
                          style={{ backgroundColor: METRO_LINES[lId]?.color }}
                        >
                          {METRO_LINES[lId]?.badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      haptic.light();
                      onSetOrigin(st.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-500 transition"
                    title={t.startHere}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      haptic.light();
                      onSetDestination(st.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-rose-500 transition"
                    title={t.setAsDestination}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Stations Directory & Quick Search */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t.allStations} ({allStations.length})
        </h3>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => {
              haptic.selection();
              setFilterType('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alle ({allStations.length})
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setFilterType('airport');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              filterType === 'airport'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>✈ {t.airportsFilter} (2)</span>
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setFilterType('ic');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              filterType === 'ic'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🚆 {t.icFilter}</span>
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setFilterType('accessible');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              filterType === 'accessible'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>♿ {t.accessibleFilter}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* List of stations */}
        <div className="space-y-1 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 pr-1">
          {filteredStations.map((st) => (
            <div
              key={st.id}
              className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{st.name}</span>
                  {st.hasAirport && <span className="text-[10px]">✈</span>}
                  {st.hasIC && <span className="text-[10px]">🚆</span>}
                  {st.hasICTransferRequired && <span className="text-[10px]">⚙️</span>}
                  {st.isAccessible && <span className="text-[10px]">♿</span>}
                  {st.isTimTrain && (
                    <span className="w-3.5 h-3.5 rounded-full border border-purple-400 text-[7px] flex items-center justify-center font-bold text-purple-600 dark:text-purple-300">
                      T
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {st.description}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => {
                    haptic.light();
                    onSetOrigin(st.id);
                  }}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    haptic.light();
                    onSetDestination(st.id);
                  }}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20"
                >
                  Ziel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
