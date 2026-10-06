import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, AlertTriangle, X } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

interface OfflineIndicatorProps {
  language?: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language = 'de' }) => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const t = translations[language];

  if (isOnline) {
    if (dismissed) setDismissed(false);
    return null;
  }

  if (dismissed) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-amber-950 px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md border border-amber-400">
        <WifiOff className="w-3.5 h-3.5" />
        <span>{t.offlineStatus}</span>
        <button
          onClick={() => {
            haptic.light();
            setDismissed(false);
          }}
          className="underline text-[10px] ml-1 font-bold"
        >
          {language === 'de' ? 'Details' : 'Info'}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg shadow-2xl rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 text-amber-950 dark:text-amber-50 p-3 backdrop-blur-xl border border-amber-400/80 dark:border-amber-500/80 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2">
          <div className="p-1 rounded-lg bg-amber-600/30 dark:bg-amber-950/40 text-amber-950 dark:text-white shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t.offlineMode}</span>
            </div>
            <p className="text-[11px] leading-snug font-medium text-amber-950/90 dark:text-amber-100/90">
              {t.offlineDisruptionWarning}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            haptic.light();
            setDismissed(true);
          }}
          className="p-1 rounded-lg hover:bg-amber-600/30 dark:hover:bg-amber-800/40 text-amber-950 dark:text-white transition shrink-0"
          title={t.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
