import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineId, Station, Disruption, LineNetworkType } from '../../types/metro';
import { METRO_LINES, STATIONS } from '../../data/metroData';
import { Language, translations } from '../../utils/i18n';
import { ReportDisruptionModal } from '../ReportDisruptionModal';
import { ConfirmDeleteDisruptionModal } from '../ConfirmDeleteDisruptionModal';
import { NewDisruptionPayload } from '../../services/disruptionsService';
import { haptic } from '../../utils/haptics';
import {
  Search,
  Train,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  MapPin,
  ArrowRight,
  Plus,
  ThumbsUp,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
  Sparkles,
  Map,
} from 'lucide-react';

interface IOSLineDirectoryProps {
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

export const IOSLineDirectory: React.FC<IOSLineDirectoryProps> = ({
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

  // Selected line for inspection sheet
  const [selectedLineId, setSelectedLineId] = useState<LineId | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for report / delete disruption
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [disruptionToDelete, setDisruptionToDelete] = useState<Disruption | null>(null);
  const [editingDisruption, setEditingDisruption] = useState<Disruption | null>(null);

  const selectedLine = selectedLineId ? METRO_LINES[selectedLineId] : null;

  const metroLines = Object.values(METRO_LINES).filter((l) => l.networkType === 'metro');
  const icLines = Object.values(METRO_LINES).filter((l) => l.networkType === 'ic');

  const filteredMetro = metroLines.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.terminals.some((term) => term.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredIC = icLines.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.terminals.some((term) => term.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeDisruptions = disruptions.filter((d) => d.isActive);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-28">
      {/* Header & Report Button */}
      <div className="flex items-end justify-between px-1">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {language === 'de' ? 'Liniennetz & Fahrplan' : 'Lines & Timetable'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.lines}
          </h1>
        </div>

        <button
          onClick={() => {
            haptic.medium();
            setIsReportModalOpen(true);
          }}
          className="py-2 px-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.reportDisruption}</span>
        </button>
      </div>

      {/* iOS Search Bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            language === 'de' ? 'Linie oder Endstation suchen...' : 'Search line or terminus...'
          }
          className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Group 1: U-Bahn Lines */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {language === 'de' ? 'U-Bahn Linien (044)' : 'Metro Lines (044)'}
          </h2>
          <span className="text-[11px] text-slate-400">{filteredMetro.length} Linien</span>
        </div>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
          {filteredMetro.map((line) => {
            const hasDisruption = disruptions.some((d) => d.lineId === line.id && d.isActive);
            return (
              <button
                key={line.id}
                onClick={() => {
                  haptic.selection();
                  setSelectedLineId(line.id);
                }}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="w-10 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.badge}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {line.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {line.terminals.join(' ↔ ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {line.frequencyMinutes && (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                      Alle {line.frequencyMinutes} Min.
                    </span>
                  )}
                  {hasDisruption ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Group 2: InterCity & Regional Lines */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {language === 'de' ? 'InterCity & Fernbahn' : 'InterCity & Long Distance'}
          </h2>
          <span className="text-[11px] text-slate-400">{filteredIC.length} Linien</span>
        </div>

        <div className="rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
          {filteredIC.map((line) => {
            const hasDisruption = disruptions.some((d) => d.lineId === line.id && d.isActive);
            return (
              <button
                key={line.id}
                onClick={() => {
                  haptic.selection();
                  setSelectedLineId(line.id);
                }}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="w-12 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.badge}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {line.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {line.terminals.join(' ↔ ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {hasDisruption ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Group 3: Active Live Disruptions List (if any) */}
      {activeDisruptions.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t.disruptionsTitle}</span>
            </h2>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {activeDisruptions.length} aktiv
            </span>
          </div>

          <div className="space-y-2">
            {activeDisruptions.map((disrupt) => {
              const line = METRO_LINES[disrupt.lineId];
              return (
                <div
                  key={disrupt.id}
                  className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-slate-900 dark:text-white space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {line && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.badge}
                        </span>
                      )}
                      <span className="text-xs font-bold">{disrupt.title}</span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingDisruption(disrupt);
                            setIsReportModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-blue-500"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDisruptionToDelete(disrupt)}
                          className="p-1 rounded text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {disrupt.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-amber-500/20">
                    <span>
                      Zwischen: {STATIONS[disrupt.fromStationId]?.name} ↔{' '}
                      {STATIONS[disrupt.toStationId]?.name}
                    </span>
                    <button
                      onClick={() => onConfirmDisruption(disrupt.id)}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{disrupt.confirmations} Bestätigungen</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Selected Line Detail Inspection Sheet */}
      <AnimatePresence>
        {selectedLine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg max-h-[85vh] flex flex-col p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-12 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md"
                    style={{ backgroundColor: selectedLine.color }}
                  >
                    {selectedLine.badge}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedLine.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedLine.terminals.join(' ↔ ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLineId(null)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Station List along this Line */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1">
                  {selectedLine.stations.length} Stationen auf dieser Linie
                </span>
                {selectedLine.stations.map((stId, sIdx) => {
                  const station = STATIONS[stId];
                  if (!station) return null;
                  return (
                    <div
                      key={stId}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 text-[10px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                            {station.name}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {station.lines
                              .filter((l) => l !== selectedLine.id)
                              .map((otherLineId) => (
                                <span
                                  key={otherLineId}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white"
                                  style={{ backgroundColor: METRO_LINES[otherLineId]?.color }}
                                >
                                  {METRO_LINES[otherLineId]?.badge}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick Route Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => {
                            haptic.medium();
                            onSetOrigin(station.id);
                            setSelectedLineId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => {
                            haptic.medium();
                            onSetDestination(station.id);
                            setSelectedLineId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold hover:bg-rose-100 transition"
                        >
                          Ziel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLineId(null)}
                  className="py-2 px-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs"
                >
                  {language === 'de' ? 'Fertig' : 'Done'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report / Edit Disruption Modal */}
      <ReportDisruptionModal
        language={language}
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setEditingDisruption(null);
        }}
        onSubmit={async (payload) => {
          await onReportDisruption(payload);
          setIsReportModalOpen(false);
        }}
        disruptionToEdit={editingDisruption}
        onEditSubmit={async (id, data) => {
          if (editingDisruption && onEditDisruption) {
            onEditDisruption({ ...editingDisruption, ...data });
          }
          setIsReportModalOpen(false);
          setEditingDisruption(null);
        }}
      />

      {/* Delete Disruption Modal */}
      {disruptionToDelete && (
        <ConfirmDeleteDisruptionModal
          language={language}
          isOpen={Boolean(disruptionToDelete)}
          disruption={disruptionToDelete}
          onClose={() => setDisruptionToDelete(null)}
          onConfirm={async () => {
            if (onDeleteDisruption) {
              await onDeleteDisruption(disruptionToDelete.id);
            }
            setDisruptionToDelete(null);
          }}
        />
      )}
    </div>
  );
};
