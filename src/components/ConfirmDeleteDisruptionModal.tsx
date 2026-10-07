import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Disruption } from '../types/metro';
import { Language, translations } from '../utils/i18n';
import { METRO_LINES, STATIONS } from '../data/metroData';
import { haptic } from '../utils/haptics';

interface ConfirmDeleteDisruptionModalProps {
  language: Language;
  disruption: Disruption | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const ConfirmDeleteDisruptionModal: React.FC<ConfirmDeleteDisruptionModalProps> = ({
  language,
  disruption,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const t = translations[language];

  if (!isOpen || !disruption) return null;

  const line = METRO_LINES[disruption.lineId];
  const fromName = STATIONS[disruption.fromStationId]?.name || disruption.fromStationId;
  const toName = STATIONS[disruption.toStationId]?.name || disruption.toStationId;

  const handleConfirm = async () => {
    haptic.medium();
    await onConfirm();
  };

  const handleCancel = () => {
    haptic.light();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        {/* Backdrop click to dismiss */}
        <div className="absolute inset-0" onClick={handleCancel} />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-slate-900 dark:text-slate-100 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {t.deleteDisruption}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'de' ? 'Administrator-Aktion' : 'Administrator Action'}
                </p>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning Message */}
          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{t.confirmDeleteDisruption}</span>
            </div>

            {/* Disruption snapshot details */}
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-100 dark:border-rose-900/40 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                {line && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] text-white shrink-0 font-bold"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.badge}
                  </span>
                )}
                <span className="truncate">{disruption.title}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {fromName} ↔ {toName}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'de'
                ? 'Diese Störung wird sofort auf allen verbundenen Geräten entfernt.'
                : 'This disruption will be permanently removed from all connected devices.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              {language === 'de' ? 'Abbrechen' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'de' ? 'Löschen' : 'Delete'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
