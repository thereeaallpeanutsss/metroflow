import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Rocket,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Language } from '../utils/i18n';
import { UIThemeMode } from '../types/metro';
import { haptic } from '../utils/haptics';
import { CURRENT_VERSION, VERSION_HISTORY, VersionEntry, ReleaseType } from '../data/versionHistory';

interface VersionHistoryViewProps {
  language: Language;
  onBack: () => void;
  uiTheme?: UIThemeMode;
}

export const VersionHistoryView: React.FC<VersionHistoryViewProps> = ({
  language,
  onBack,
  uiTheme = 'default',
}) => {
  const getReleaseTypeBadge = (type: ReleaseType) => {
    switch (type) {
      case 'major':
        return {
          label: language === 'de' ? 'Hauptversion (Major)' : 'Major Release',
          className:
            'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          icon: Rocket,
        };
      case 'minor':
        return {
          label: language === 'de' ? 'Feature-Update (Minor)' : 'Feature Update',
          className:
            'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
          icon: Sparkles,
        };
      case 'patch':
      default:
        return {
          label: language === 'de' ? 'Patch & Detail-Fix' : 'Patch & Bug Fix',
          className:
            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          icon: Wrench,
        };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-28 pt-2 px-1">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            haptic.light();
            onBack();
          }}
          className="flex items-center gap-2 py-2 px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'de' ? 'Zurück zu Einstellungen' : 'Back to Settings'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold shadow-xs">
          <Tag className="w-3.5 h-3.5" />
          <span>v{CURRENT_VERSION}</span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          <Layers className="w-4 h-4" />
          <span>{language === 'de' ? 'App-Entwicklungsgeschichte' : 'Development Changelog'}</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {language === 'de' ? 'Versionsverlauf & Updates' : 'Version History & Updates'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {language === 'de'
            ? 'Hier findest du alle Versionen und Neuerungen seit der ersten Veröffentlichung von MetroFlow. Das Schema x.y.z beschreibt: x = Hauptversion, y = Feature-Updates, z = Detailverbesserungen & Fehlerbehebungen.'
            : 'Explore all releases, feature additions, and fixes since MetroFlow was launched. The semantic scheme x.y.z denotes: x = Major release, y = Minor features, z = Patches & fixes.'}
        </p>
      </div>

      {/* Timeline List of all Versions */}
      <div className="space-y-4">
        {VERSION_HISTORY.map((entry, index) => {
          const badge = getReleaseTypeBadge(entry.type);
          const BadgeIcon = badge.icon;
          const isLatest = index === 0;

          return (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              className={`p-5 rounded-3xl border transition-all ${
                isLatest
                  ? 'bg-white dark:bg-slate-900 border-blue-500/40 shadow-xl ring-2 ring-blue-500/20'
                  : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-md'
              }`}
            >
              {/* Header: Version number, Release Type, Date */}
              <div className="flex items-start justify-between gap-3 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    v{entry.version}
                  </span>

                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs animate-pulse">
                      {language === 'de' ? 'Aktuelle Version' : 'Latest Release'}
                    </span>
                  )}

                  <span
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                  >
                    <BadgeIcon className="w-3 h-3 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{entry.date}</span>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="pt-3 space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'de' ? entry.titleDe : entry.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === 'de' ? entry.summaryDe : entry.summary}
                </p>
              </div>

              {/* Detailed Bullet Points */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === 'de' ? 'Änderungen in dieser Version:' : 'Changes in this release:'}
                </span>

                <ul className="space-y-1.5">
                  {(language === 'de' ? entry.changesDe : entry.changes).map(
                    (change, changeIdx) => (
                      <li
                        key={changeIdx}
                        className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-snug"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{change}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Dismiss / Back Button */}
      <div className="pt-2 text-center">
        <button
          onClick={() => {
            haptic.light();
            onBack();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-98 cursor-pointer shadow-sm"
        >
          {language === 'de' ? 'Zurück zu Einstellungen' : 'Back to Settings'}
        </button>
      </div>
    </div>
  );
};
