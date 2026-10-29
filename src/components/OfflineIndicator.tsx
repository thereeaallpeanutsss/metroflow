import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

interface OfflineIndicatorProps {
  language?: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language = 'de' }) => {
  const isOnline = useOnlineStatus();
  // State: whether user acknowledged the initial modal alert
  const [modalDismissed, setModalDismissed] = useState(false);
  // State: whether user minimized the floating top badge
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const t = translations[language];

  // When back online, reset dismiss states so if they go offline again, the warning re-triggers
  useEffect(() => {
    if (isOnline) {
      setModalDismissed(false);
      setBadgeDismissed(false);
    } else {
      haptic.warning();
    }
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <>
      {/* Prominent Offline Warning Modal Window - Appears immediately when offline */}
      {!modalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0 shadow-lg shadow-amber-500/30">
                <WifiOff className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === 'de' ? 'Hinweis • Offline-Betrieb' : 'Notice • Offline Mode'}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'de' ? 'Keine Internetverbindung' : 'No Internet Connection'}
                </h3>
              </div>
              <button
                onClick={() => {
                  haptic.light();
                  setModalDismissed(true);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium space-y-2">
              <p>
                {language === 'de'
                  ? 'Du bist derzeit offline. Die App ist weiterhin uneingeschränkt nutzbar (Fahrpläne, Offline-Netzkarte & Routenberechnung funktionieren vollständig).'
                  : 'You are currently offline. The app remains fully functional (timetables, transit map & trip planner operate offline).'}
              </p>
              <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {language === 'de'
                    ? 'Achtung: Gemeldete Streckenstörungen sind eventuell nicht mehr aktuell!'
                    : 'Warning: Reported disruptions might not be up to date!'}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setModalDismissed(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'de' ? 'Verstanden, weiter nutzen' : 'Understood, continue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating persistent warning banner when modal is acknowledged */}
      {modalDismissed && !badgeDismissed && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg shadow-xl rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 text-amber-950 dark:text-amber-50 p-2.5 backdrop-blur-xl border border-amber-400/80 dark:border-amber-500/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <WifiOff className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-semibold truncate">
                {language === 'de'
                  ? 'Offline: Störungen evtl. nicht aktuell (App nutzbar)'
                  : 'Offline: Disruptions may be outdated (app usable)'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  haptic.light();
                  setModalDismissed(false);
                }}
                className="text-[10px] font-bold underline px-1.5 py-0.5 rounded hover:bg-black/10"
              >
                {language === 'de' ? 'Details' : 'Info'}
              </button>
              <button
                onClick={() => {
                  haptic.light();
                  setBadgeDismissed(true);
                }}
                className="p-1 rounded hover:bg-black/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

