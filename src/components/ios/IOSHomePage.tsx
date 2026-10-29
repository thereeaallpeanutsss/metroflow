import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Map,
  Layers,
  Sparkles,
  BookOpen,
  PlusCircle,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Send,
  ShieldCheck,
  ChevronRight,
  Pin,
  Pencil,
  Search,
  MapPin,
  Train,
  ArrowRight,
} from 'lucide-react';
import { Language, translations } from '../../utils/i18n';
import { Article, ArticleCategory } from '../../types/article';
import { Disruption } from '../../types/metro';
import { STATIONS, METRO_LINES } from '../../data/metroData';
import { haptic } from '../../utils/haptics';

interface IOSHomePageProps {
  language: Language;
  isAdmin: boolean;
  articles: Article[];
  disruptions: Disruption[];
  onNavigateToTab: (tab: 'plan' | 'map' | 'lines' | 'options') => void;
  onPublishArticle: (data: Omit<Article, 'id' | 'publishedAt'>) => Promise<void>;
  onEditArticle: (id: string, data: Partial<Omit<Article, 'id' | 'publishedAt'>>) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
  onSelectStationForTrip?: (stId: string) => void;
}

export const IOSHomePage: React.FC<IOSHomePageProps> = ({
  language,
  isAdmin,
  articles,
  disruptions,
  onNavigateToTab,
  onPublishArticle,
  onEditArticle,
  onDeleteArticle,
  onSelectStationForTrip,
}) => {
  const t = translations[language];

  // Search state inside iOS quick capsule
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Selected article for expanded full-view sheet
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all');

  // Modal state: compose new OR edit existing
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<ArticleCategory>('news');
  const [formAuthor, setFormAuthor] = useState('ÄÄPIZRM Verkehrsbetriebe');
  const [formPinned, setFormPinned] = useState(false);
  const [formTags, setFormTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeDisruptionsCount = disruptions.filter((d) => d.isActive).length;
  const isAllClear = activeDisruptionsCount === 0;

  // Station search results
  const searchResults = searchQuery.trim()
    ? Object.values(STATIONS).filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      ).slice(0, 5)
    : [];

  const handleOpenComposeModal = () => {
    haptic.medium();
    setEditingArticleId(null);
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormCategory('news');
    setFormAuthor('ÄÄPIZRM Verkehrsbetriebe');
    setFormPinned(false);
    setFormTags('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (article: Article) => {
    haptic.medium();
    setEditingArticleId(article.id);
    setFormTitle(article.title);
    setFormSummary(article.summary);
    setFormContent(article.content);
    setFormCategory(article.category);
    setFormAuthor(article.author || 'ÄÄPIZRM Verkehrsbetriebe');
    setFormPinned(!!article.pinned);
    setFormTags(article.tags ? article.tags.join(', ') : '');
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    haptic.medium();
    setIsSubmitting(true);
    try {
      const tagsList = formTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (editingArticleId) {
        await onEditArticle(editingArticleId, {
          title: formTitle.trim(),
          summary: formSummary.trim(),
          content: formContent.trim(),
          category: formCategory,
          author: formAuthor.trim() || 'ÄÄPIZRM Verkehrsbetriebe',
          pinned: formPinned,
          tags: tagsList,
        });
      } else {
        await onPublishArticle({
          title: formTitle.trim(),
          summary: formSummary.trim(),
          content: formContent.trim(),
          category: formCategory,
          author: formAuthor.trim() || 'ÄÄPIZRM Verkehrsbetriebe',
          readTimeMinutes: Math.max(1, Math.ceil(formContent.trim().split(/\s+/).length / 150)),
          pinned: formPinned,
          tags: tagsList,
        });
      }
      setIsFormModalOpen(false);
      setEditingArticleId(null);
    } catch {
      haptic.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory === 'all') return true;
    return a.category === selectedCategory;
  });

  const allLines = Object.values(METRO_LINES);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-28">
      {/* iOS Greeting & Apple Maps Capsule Search */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {language === 'de' ? 'ÄÄPIZRM 044 Netz' : 'ÄÄPIZRM 044 Network'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'de' ? 'Wohin möchtest du?' : 'Where to today?'}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>iOS Neo</span>
          </div>
        </div>

        {/* Apple Maps Capsule Search Bar */}
        <div className="relative">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all shadow-sm ${
              isSearchFocused
                ? 'border-blue-500 shadow-md ring-3 ring-blue-500/20'
                : 'border-slate-200/90 dark:border-zinc-800'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder={
                language === 'de'
                  ? 'Station oder Verbindung suchen...'
                  : 'Search station or route...'
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

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {isSearchFocused && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 4 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 z-30 p-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-1"
              >
                {searchResults.map((station) => (
                  <button
                    key={station.id}
                    onMouseDown={() => {
                      haptic.selection();
                      onSelectStationForTrip?.(station.id);
                      onNavigateToTab('plan');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {station.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {station.lines.map((lId) => (
                        <span
                          key={lId}
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white"
                          style={{ backgroundColor: METRO_LINES[lId]?.color }}
                        >
                          {METRO_LINES[lId]?.badge}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* iOS News & Community Feed Section (Placed at top of page) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>{t.latestNews}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'de'
                ? 'Offizielle Mitteilungen & Wissenswertes zum 044 Schienennetz'
                : 'Official announcements & guides for the 044 transit network'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenComposeModal}
              className="py-1.5 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.publishArticle}</span>
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { id: 'all', label: language === 'de' ? 'Alle Beiträge' : 'All Articles' },
              { id: 'news', label: language === 'de' ? 'Nachrichten' : 'News' },
              { id: 'tutorial', label: language === 'de' ? 'Anleitungen' : 'Guides' },
              { id: 'update', label: language === 'de' ? 'Updates' : 'Updates' },
              { id: 'maintenance', label: language === 'de' ? 'Wartung' : 'Maintenance' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                haptic.selection();
                setSelectedCategory(cat.id);
              }}
              className={`py-1 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Articles Inset Grouped List */}
        <div className="space-y-2.5">
          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">
                {language === 'de'
                  ? 'Keine Artikel in dieser Kategorie vorhanden.'
                  : 'No articles found in this category.'}
              </p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <motion.div
                key={article.id}
                whileHover={{ scale: 1.005 }}
                className="p-4 rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition cursor-pointer space-y-2"
                onClick={() => {
                  haptic.light();
                  setSelectedArticle(article);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.pinned && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1 border border-amber-500/20">
                          <Pin className="w-2.5 h-2.5" />
                          <span>{t.pinnedArticle}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                        {article.category.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(article.publishedAt).toLocaleDateString(
                          language === 'de' ? 'de-DE' : 'en-US'
                        )}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {article.summary || article.content.substring(0, 140)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
                    {isAdmin && (
                      <div
                        className="flex items-center gap-1 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenEditModal(article)}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                          title={t.editArticle}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingArticleId(article.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title={t.deleteArticle}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* iOS Action Hub: Planner & Map Quick Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => {
            haptic.selection();
            onNavigateToTab('plan');
          }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 flex items-center justify-between text-left group transition active:scale-[0.98] cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-white pt-1">{t.planner}</h3>
            <p className="text-xs text-white/80">
              {language === 'de'
                ? 'Schnellste Route mit Umstiegen & IC-Optionen'
                : 'Fastest route with transfers & IC options'}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        <button
          onClick={() => {
            haptic.selection();
            onNavigateToTab('map');
          }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between text-left group transition active:scale-[0.98] cursor-pointer"
        >
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-white pt-1">{t.map}</h3>
            <p className="text-xs text-white/80">
              {language === 'de'
                ? 'Interaktiver Netzplan mit Live-Verschiebung'
                : 'Interactive vector map with smooth inspection'}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </section>

      {/* iOS Transit Status Hub Card (Moved to very bottom of page) */}
      <section className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isAllClear
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isAllClear ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'de' ? 'Betriebslage im Schienennetz' : 'Rail Network Status'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAllClear
                  ? language === 'de'
                    ? 'Alle 11 U-Bahn- und IC-Linien verkehren störungsfrei.'
                    : 'All 11 Metro and IC rail lines running on time.'
                  : `${activeDisruptionsCount} ${
                      language === 'de' ? 'aktive Streckenstörung(en)' : 'active line disruption(s)'
                    }`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              haptic.light();
              onNavigateToTab('lines');
            }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline shrink-0"
          >
            <span>{language === 'de' ? 'Details' : 'Details'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Line Matrix (Tap any line to view) */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2 pt-1">
          {allLines.map((line) => {
            const hasDisruption = disruptions.some((d) => d.lineId === line.id && d.isActive);
            return (
              <button
                key={line.id}
                onClick={() => {
                  haptic.selection();
                  onNavigateToTab('lines');
                }}
                className="relative py-2 px-1.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-800/40 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                title={`${line.name} • ${line.terminals.join(' ↔ ')}`}
              >
                <span
                  className="w-7 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: line.color }}
                >
                  {line.badge}
                </span>
                <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-full">
                  {line.networkType === 'ic' ? 'IC Rail' : 'U-Bahn'}
                </span>
                {hasDisruption && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-zinc-900" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Expanded Article Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {selectedArticle.category.toUpperCase()}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedArticle.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span>{selectedArticle.author || 'ÄÄPIZRM'}</span>
                <span>•</span>
                <span>
                  {new Date(selectedArticle.publishedAt).toLocaleDateString(
                    language === 'de' ? 'de-DE' : 'en-US'
                  )}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap select-text">
                {selectedArticle.content}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="py-2 px-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs"
                >
                  {language === 'de' ? 'Schließen' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Compose / Edit Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingArticleId ? t.editArticle : t.newArticleTitle}
                </h3>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.articleTitle}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.articleSummary}
                  </label>
                  <input
                    type="text"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.articleContent}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.articleCategory}
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ArticleCategory)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="news">News</option>
                      <option value="tutorial">Guide / Anleitung</option>
                      <option value="announcement">Announcement / Hinweis</option>
                      <option value="lore">Lore / Historie</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="formPinned"
                      checked={formPinned}
                      onChange={(e) => setFormPinned(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="formPinned" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.pinnedArticle}
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? '...' : editingArticleId ? t.saveChanges : t.publishArticle}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingArticleId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-3"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.deleteArticle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.deleteArticleConfirm}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingArticleId(null)}
                  className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const id = deletingArticleId;
                    setDeletingArticleId(null);
                    await onDeleteArticle(id);
                  }}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md"
                >
                  {t.deleteArticle}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
