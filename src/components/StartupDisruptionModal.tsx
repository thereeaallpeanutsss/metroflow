import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { Disruption } from '../types/metro';
import { METRO_LINES, STATIONS } from '../data/metroData';
import { haptic } from '../utils/haptics';

interface StartupDisruptionModalProps {
  language: Language;
  disruptions: Disruption[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLines: () => void;
  startupOverviewEnabled: boolean;
  onToggleStartupOverview: (enabled: boolean) => void;
}

export const StartupDisruptionModal: React.FC<StartupDisruptionModalProps> = ({
  language,
  disruptions,
  isOpen,
  onClose,
  onNavigateToLines,
  startupOverviewEnabled,
  onToggleStartupOverview,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  const activeDisruptions = disruptions.filter(
    (d) => d.isActive && (d.resolvedReports || 0) < 10
  );
  const hasDisruptions = activeDisruptions.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            haptic.light();
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`p-5 pb-4 border-b ${
              hasDisruptions
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
                    hasDisruptions
                      ? 'bg-amber-500 text-white shadow-amber-500/25'
                      : 'bg-emerald-500 text-white shadow-emerald-500/25'
                  }`}
                >
                  {hasDisruptions ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {language === 'de' ? 'Aktuelle Betriebslage' : 'Current Operational Status'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {hasDisruptions
                      ? language === 'de'
                        ? `${activeDisruptions.length} gemeldete Störung(en) im Netz`
                        : `${activeDisruptions.length} active disruption(s) reported`
                      : language === 'de'
                      ? 'Alle Linien verkehren regulär'
                      : 'All transit lines running normally'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  haptic.light();
                  onClose();
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
            {hasDisruptions ? (
              <>
                <p className="text-slate-600 dark:text-slate-300">
                  {language === 'de'
                    ? 'Auf folgenden Abschnitten liegen aktuell Störungsmeldungen von Fahrgästen vor:'
                    : 'The following rail sections currently have reported disruptions:'}
                </p>

                <div className="space-y-2.5">
                  {activeDisruptions.map((disruption) => {
                    const line = METRO_LINES[disruption.lineId as keyof typeof METRO_LINES];
                    const fromSt = STATIONS[disruption.fromStationId];
                    const toSt = STATIONS[disruption.toStationId];

                    return (
                      <div
                        key={disruption.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {line && (
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: line.color }}
                              >
                                {line.badge}
                              </span>
                            )}
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {disruption.title}
                            </span>
                          </div>

                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                            +{disruption.confirmations || 1}
                          </span>
                        </div>

                        {(fromSt || toSt) && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>{fromSt?.name || disruption.fromStationId}</span>
                            <span>➔</span>
                            <span>{toSt?.name || disruption.toStationId}</span>
                          </div>
                        )}

                        {disruption.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                            "{disruption.description}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'de' ? 'Freie Fahrt auf allen Linien!' : 'All Clear on Rail Network!'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    {language === 'de'
                      ? 'Alle 6 U-Bahn-Linien und 7 IC-Express-Verbindungen verkehren derzeit planmäßig ohne bekannte Störungen.'
                      : 'All 6 Metro lines and 7 IC Express connections are currently running on schedule without disruptions.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Startup preference toggle */}
            <div className="flex items-center justify-between px-1">
              <label
                htmlFor="toggle-startup-modal"
                className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {language === 'de'
                    ? 'Beim nächsten App-Start anzeigen'
                    : 'Show this overview on next app start'}
                </span>
              </label>
              <input
                id="toggle-startup-modal"
                type="checkbox"
                checked={startupOverviewEnabled}
                onChange={(e) => {
                  haptic.selection();
                  onToggleStartupOverview(e.target.checked);
                }}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {hasDisruptions && (
                <button
                  onClick={() => {
                    haptic.medium();
                    onClose();
                    onNavigateToLines();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{language === 'de' ? 'Details in Linien' : 'View in Lines'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  haptic.medium();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition text-center"
              >
                {language === 'de' ? 'Verstanden' : 'Got it'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
