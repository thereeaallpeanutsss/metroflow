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
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Send,
  ShieldCheck,
  ChevronRight,
  Pin,
  TrainFront,
  Pencil,
  Save,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { Article, ArticleCategory } from '../types/article';
import { Disruption } from '../types/metro';
import { haptic } from '../utils/haptics';

interface HomePageProps {
  language: Language;
  isAdmin: boolean;
  articles: Article[];
  disruptions: Disruption[];
  onNavigateToTab: (tab: 'plan' | 'map' | 'lines' | 'options') => void;
  onPublishArticle: (data: Omit<Article, 'id' | 'publishedAt'>) => Promise<void>;
  onEditArticle: (id: string, data: Partial<Omit<Article, 'id' | 'publishedAt'>>) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
}

export const HomePage: React.FC<HomePageProps> = ({
  language,
  isAdmin,
  articles,
  disruptions,
  onNavigateToTab,
  onPublishArticle,
  onEditArticle,
  onDeleteArticle,
}) => {
  const t = translations[language];

  // Selected article for expanded full-view modal
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all');

  // Modal state: compose new OR edit existing
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // Single-language Form state (no separate German/English inputs)
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<ArticleCategory>('news');
  const [formAuthor, setFormAuthor] = useState('ÄÄPIZRM Verkehrsbetriebe');
  const [formPinned, setFormPinned] = useState(false);
  const [formTags, setFormTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active disruptions count
  const activeDisruptionsCount = disruptions.filter((d) => d.isActive).length;

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

  const handleCloseFormModal = () => {
    haptic.light();
    setIsFormModalOpen(false);
    setEditingArticleId(null);
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

      const wordCount = formContent.trim().split(/\s+/).length;
      const readTime = Math.max(1, Math.round(wordCount / 160));

      const payload = {
        title: formTitle.trim(),
        summary: formSummary.trim() || formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        author: formAuthor.trim() || 'ÄÄPIZRM Verkehrsbetriebe',
        readTimeMinutes: readTime,
        pinned: formPinned,
        tags: tagsList.length > 0 ? tagsList : undefined,
      };

      if (editingArticleId) {
        await onEditArticle(editingArticleId, payload);
        if (selectedArticle?.id === editingArticleId) {
          setSelectedArticle((prev) => (prev ? { ...prev, ...payload } : null));
        }
      } else {
        await onPublishArticle(payload);
      }

      haptic.success();
      setIsFormModalOpen(false);
      setEditingArticleId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArticle = (articleId: string) => {
    haptic.warning();
    setDeletingArticleId(articleId);
  };

  const handleConfirmDeleteArticle = async () => {
    if (!deletingArticleId) return;
    haptic.success();
    const id = deletingArticleId;
    setDeletingArticleId(null);
    await onDeleteArticle(id);
    if (selectedArticle?.id === id) {
      setSelectedArticle(null);
    }
  };

  // Filtered and sorted articles (pinned first, then date descending)
  const filteredArticles = articles
    .filter((a) => (selectedCategory === 'all' ? true : a.category === selectedCategory))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.publishedAt - a.publishedAt;
    });

  const getCategoryBadge = (category: ArticleCategory) => {
    switch (category) {
      case 'tutorial':
        return {
          label: language === 'de' ? 'Anleitung & Guide' : 'Tutorial & Guide',
          bg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        };
      case 'update':
        return {
          label: language === 'de' ? 'Netz-Update' : 'Network Update',
          bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'maintenance':
        return {
          label: language === 'de' ? 'Wartung / Bau' : 'Maintenance',
          bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 'news':
      default:
        return {
          label: language === 'de' ? 'Nachricht' : 'News',
          bg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        };
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* 1. Hero Welcome Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        {/* Decorative background grid and blurs */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>ÄÄPIZRM 044 MetroFlow Portal</span>
          </div>

          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {t.welcomeGreeting}
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed">
              {t.welcomeSubtitle}
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                haptic.medium();
                onNavigateToTab('plan');
              }}
              className="py-2.5 px-4 rounded-2xl bg-white text-slate-900 hover:bg-blue-50 active:scale-95 text-xs font-bold shadow-lg shadow-black/20 flex items-center gap-2 transition"
            >
              <Compass className="w-4 h-4 text-blue-600" />
              <span>{t.quickPlanTrip}</span>
            </button>

            <button
              onClick={() => {
                haptic.medium();
                onNavigateToTab('map');
              }}
              className="py-2.5 px-4 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md active:scale-95 text-white text-xs font-bold border border-white/30 flex items-center gap-2 transition"
            >
              <Map className="w-4 h-4 text-emerald-300" />
              <span>{t.quickViewMap}</span>
            </button>

            <button
              onClick={() => {
                haptic.medium();
                onNavigateToTab('lines');
              }}
              className="py-2.5 px-4 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md active:scale-95 text-white text-xs font-bold border border-white/30 flex items-center gap-2 transition"
            >
              <Layers className="w-4 h-4 text-purple-300" />
              <span>{language === 'de' ? 'Liniennetz' : 'Lines & Timetable'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Network News & Articles Section (Placed DIRECTLY BELOW Welcome Section per user request) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>{t.latestNews}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'de'
                ? 'Offizielle Mitteilungen, Fahrgast-Guides und Netz-Updates'
                : 'Official announcements, passenger guides, and network updates'}
            </p>
          </div>

          {/* Admin Publish Article Action Button */}
          {isAdmin && (
            <button
              onClick={handleOpenComposeModal}
              className="py-2 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2 transition self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.publishArticle}</span>
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'tutorial', 'news', 'update', 'maintenance'] as const).map((cat) => {
            const isSelected = selectedCategory === cat;
            const labels: Record<string, { de: string; en: string }> = {
              all: { de: 'Alle Artikel', en: 'All Articles' },
              tutorial: { de: 'Anleitungen', en: 'Tutorials' },
              news: { de: 'Nachrichten', en: 'News' },
              update: { de: 'Netz-Updates', en: 'Updates' },
              maintenance: { de: 'Wartung', en: 'Maintenance' },
            };
            return (
              <button
                key={cat}
                onClick={() => {
                  haptic.light();
                  setSelectedCategory(cat);
                }}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {labels[cat][language]}
              </button>
            );
          })}
        </div>

        {/* Articles List / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article) => {
            const badge = getCategoryBadge(article.category);
            const title = article.title;
            const summary = article.summary;

            const dateStr = new Date(article.publishedAt).toLocaleDateString(
              language === 'de' ? 'de-DE' : 'en-US',
              {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }
            );

            return (
              <motion.article
                key={article.id}
                whileHover={{ y: -2 }}
                onClick={() => {
                  haptic.light();
                  setSelectedArticle(article);
                }}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-lg hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2.5">
                  {/* Category, Date, Pinned Tag & Admin Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      {article.pinned && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" />
                          <span>{t.pinnedArticle}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {article.readTimeMinutes} {t.readTime}
                        </span>
                      </span>

                      {/* Admin Quick Edit Button on Card */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(article);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title={t.editArticle}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                    {title}
                  </h3>

                  {/* Summary Preview */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {summary}
                  </p>
                </div>

                {/* Footer of Card */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{article.author}</span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform text-xs">
                    <span>{t.readMore}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 3. Network Operational Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Transit status card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${
              activeDisruptionsCount === 0
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            {activeDisruptionsCount === 0 ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.networkStatus}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {activeDisruptionsCount === 0
                ? t.allLinesOperating
                : `${activeDisruptionsCount} ${t.disruptionsActiveNotice}`}
            </div>
          </div>
        </div>

        {/* Lines count card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <TrainFront className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'de' ? 'Streckennetz' : 'Rail Network'}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              6 U-Bahn • 7 IC-Express • Tim-Train
            </div>
          </div>
        </div>

        {/* Offline ready card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'de' ? 'Verfügbarkeit' : 'Offline Engine'}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              100% Offline-fähig
            </div>
          </div>
        </div>
      </section>

      {/* 4. Expanded Full Article Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        getCategoryBadge(selectedArticle.category).bg
                      }`}
                    >
                      {getCategoryBadge(selectedArticle.category).label}
                    </span>
                    {selectedArticle.pinned && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Pin className="w-3 h-3" />
                        <span>{t.pinnedArticle}</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {selectedArticle.title}
                  </h2>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(selectedArticle.publishedAt).toLocaleDateString(
                          language === 'de' ? 'de-DE' : 'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {selectedArticle.readTimeMinutes} {t.readTime}
                      </span>
                    </span>
                    <span>•</span>
                    <span>{selectedArticle.author}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    haptic.light();
                    setSelectedArticle(null);
                  }}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {/* Summary Callout */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100 font-medium">
                  {selectedArticle.summary}
                </div>

                {/* Formatted Content */}
                <div className="space-y-3 whitespace-pre-line leading-relaxed">
                  {selectedArticle.content}
                </div>

                {/* Tags */}
                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {selectedArticle.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Edit and Delete options for Admins */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          const toEdit = selectedArticle;
                          setSelectedArticle(null);
                          handleOpenEditModal(toEdit);
                        }}
                        className="py-2 px-3 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{t.editArticle}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteArticle(selectedArticle.id)}
                        className="py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.deleteArticle}</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    haptic.light();
                    setSelectedArticle(null);
                  }}
                  className="py-2 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-800 dark:text-slate-100 transition"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Admin Single-Language Compose / Edit Article Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/60 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden"
            >
              {/* Modal Title */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white">
                    {editingArticleId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingArticleId ? t.editArticle : t.newArticleTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'de'
                        ? 'Wird sofort auf der Startseite für alle Fahrgäste aktualisiert.'
                        : 'Updated live to the Home page for all transit passengers.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseFormModal}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Single-Language Form Body (No separate language text fields) */}
              <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    {t.articleTitle} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="z.B. Neuer U-Bahn-Fahrplan ab kommenden Montag"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category & Author */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      {t.articleCategory}
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ArticleCategory)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="news">{language === 'de' ? 'Nachricht' : 'News'}</option>
                      <option value="tutorial">{language === 'de' ? 'Anleitung / Guide' : 'Tutorial / Guide'}</option>
                      <option value="update">{language === 'de' ? 'Netz-Update' : 'Network Update'}</option>
                      <option value="maintenance">{language === 'de' ? 'Wartung / Bau' : 'Maintenance'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Autor / Absender
                    </label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      placeholder="ÄÄPIZRM Verkehrsbetriebe"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Summary (Single field) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    {t.articleSummary} *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Kurze Zusammenfassung für die Vorschau-Karten..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Content (Single field) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    {t.articleContent} *
                  </label>
                  <textarea
                    rows={7}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Ausführlicher Artikeltext mit Absätzen und Informationen..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Pinned & Tags */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={(e) => setFormPinned(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {language === 'de' ? 'Ganz oben anheften (Wichtig)' : 'Pin to top (Important)'}
                    </span>
                  </label>

                  <div className="flex-1 max-w-xs space-y-1">
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="Tags (kommagetrennt, z.B. U1, Fahrplan)"
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseFormModal}
                    className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-semibold transition"
                  >
                    {t.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formTitle.trim() || !formContent.trim()}
                    className="py-2.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
                  >
                    {editingArticleId ? <Save className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{editingArticleId ? t.saveChanges : t.publishArticle}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Article Confirmation Modal (Custom dialog instead of window.confirm for iframe safety) */}
      <AnimatePresence>
        {deletingArticleId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-slate-900 dark:text-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.deleteArticle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t.deleteArticleConfirm}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setDeletingArticleId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteArticle}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition"
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
