import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { haptic } from '../utils/haptics';
import { Share, PlusSquare, Smartphone, X, Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone on iOS or Android, do not show
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          haptic.medium();
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium backdrop-blur-md transition-all active:scale-95 shadow-sm"
        title="App auf Homescreen installieren"
      >
        {isInstallable ? (
          <>
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>App installieren</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>iOS Web App</span>
          </>
        )}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => {
                haptic.light();
                setShowGuide(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-xl font-bold text-white tracking-wider">M</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">MetroFlow auf iOS</h3>
                <p className="text-xs text-slate-400">Als native Web App hinzufügen</p>
              </div>
            </div>

            <div className="space-y-3.5 my-5 text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">1. Teilen tippen</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tippe in der Safari-Symbolleiste unten auf das <strong className="text-slate-200">Teilen-Symbol</strong> (Quadrat mit Pfeil).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">2. Zum Home-Bildschirm</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Scrolle nach unten und wähle <strong className="text-slate-200">„Zum Home-Bildschirm“</strong> aus.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                haptic.medium();
                setShowGuide(false);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/30"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
};
