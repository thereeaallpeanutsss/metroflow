/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { TabBar, TabBarStyle } from './components/TabBar';
import { TripPlanner } from './components/TripPlanner';
import { InteractiveMap } from './components/InteractiveMap';
import { LineDirectory } from './components/LineDirectory';
import { OptionsMenu } from './components/OptionsMenu';
import { OfflineIndicator } from './components/OfflineIndicator';
import { findRoutesWithStopover } from './utils/routeFinder';
import { RouteOption, LineId, SavedJourney, RoutePreference, Disruption, RecentRoute } from './types/metro';
import { STATIONS, METRO_LINES } from './data/metroData';
import { Language, translations } from './utils/i18n';
import {
  fetchDisruptions,
  reportDisruption,
  confirmDisruption,
  updateDisruption,
  deleteDisruption,
  getUserConfirmedIds,
  getUserResolvedIds,
  reportDisruptionResolved,
  getLocalCachedDisruptions,
  subscribeToDisruptions,
  NewDisruptionPayload,
} from './services/disruptionsService';
import {
  getRecentRoutes,
  getLastPlannedEntry,
  saveRecentRoute,
  deleteRecentRoute,
  clearRecentRoutes,
} from './services/recentRoutesService';
import { HomePage } from './components/HomePage';
import { StartupDisruptionModal } from './components/StartupDisruptionModal';
import { ReportDisruptionModal } from './components/ReportDisruptionModal';
import { AppTab } from './components/TabBar';
import { Article } from './types/article';
import {
  fetchArticles,
  publishArticleToServer,
  updateArticleOnServer,
  deleteArticleFromServer,
  getLocalCachedArticles,
  subscribeToArticles,
} from './services/articlesService';
import { haptic } from './utils/haptics';
import { BookmarkCheck, Train, TrainFront, ChevronUp, ChevronDown } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Admin verification state (unlocked via passcode "abc123")
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('metroflow_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAdmin = (status: boolean) => {
    setIsAdmin(status);
    try {
      localStorage.setItem('metroflow_is_admin', String(status));
    } catch {}
  };

  // Metro Network News & Tutorial Articles
  const [articles, setArticles] = useState<Article[]>(getLocalCachedArticles);

  useEffect(() => {
    let isMounted = true;
    // Initial fetch
    fetchArticles().then((fetched) => {
      if (isMounted && fetched && fetched.length > 0) {
        setArticles(fetched);
      }
    });

    // Real-time Firestore sync
    const unsubscribe = subscribeToArticles((liveArticles) => {
      if (isMounted && liveArticles && liveArticles.length > 0) {
        setArticles(liveArticles);
      }
    });

    // Background interval sync (every 6s)
    const interval = setInterval(async () => {
      const fetched = await fetchArticles();
      if (isMounted && fetched && fetched.length > 0) {
        setArticles(fetched);
      }
    }, 6000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handlePublishArticle = async (data: Omit<Article, 'id' | 'publishedAt'>) => {
    const created = await publishArticleToServer(data, 'abc123');
    setArticles((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
    showToast(language === 'de' ? 'Artikel erfolgreich veröffentlicht!' : 'Article published successfully!');
  };

  const handleEditArticle = async (id: string, data: Partial<Omit<Article, 'id' | 'publishedAt'>>) => {
    const updated = await updateArticleOnServer(id, data, 'abc123');
    setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
    showToast(language === 'de' ? 'Artikel erfolgreich aktualisiert!' : 'Article updated successfully!');
  };

  const handleDeleteArticle = async (id: string) => {
    await deleteArticleFromServer(id, 'abc123');
    setArticles((prev) => prev.filter((a) => a.id !== id));
    showToast(language === 'de' ? 'Artikel entfernt.' : 'Article removed.');
  };

  // Language setting (de / en)
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('metroflow_language');
      return saved === 'en' ? 'en' : 'de';
    } catch {
      return 'de';
    }
  });

  // Theme setting (dark / light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('metroflow_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Sync theme class on <html> and <body>
  useEffect(() => {
    try {
      localStorage.setItem('metroflow_theme', theme);
    } catch {}

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Sync language
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('metroflow_language', lang);
    } catch {}
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Menu bar design style: 'ios26' (default floating glass dock) or 'classic' (edge-to-edge bar)
  const [tabBarStyle, setTabBarStyle] = useState<TabBarStyle>(() => {
    try {
      const saved = localStorage.getItem('metroflow_tab_bar_style');
      return saved === 'classic' ? 'classic' : 'ios26';
    } catch {
      return 'ios26';
    }
  });

  const handleSetTabBarStyle = (style: TabBarStyle) => {
    setTabBarStyle(style);
    try {
      localStorage.setItem('metroflow_tab_bar_style', style);
    } catch {}
  };

  // Station route selection: empty by default when opening app (no stations preselected)
  const [originId, setOriginId] = useState<string | null>(null);
  const [stopoverId, setStopoverId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);

  // Manual route calculation: routes calculated only upon pressing button
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState<boolean>(false);

  // Recent routes: quick access to the last 3 routes (saved across app reopens)
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>(getRecentRoutes);
  const [lastPlannedEntry, setLastPlannedEntry] = useState<RecentRoute | null>(getLastPlannedEntry);

  // Route preference (fewest-transfers, prioritize-metro, prioritize-ic, fastest)
  const [preference, setPreference] = useState<RoutePreference>(() => {
    try {
      const saved = localStorage.getItem('metroflow_route_preference');
      return (saved as RoutePreference) || 'fastest';
    } catch {
      return 'fastest';
    }
  });

  const handleSetPreference = (pref: RoutePreference) => {
    setPreference(pref);
    try {
      localStorage.setItem('metroflow_route_preference', pref);
    } catch {}
  };

  // Disruptions live state (persisted locally and synced with server)
  const [disruptions, setDisruptions] = useState<Disruption[]>(getLocalCachedDisruptions);
  const [avoidDisruptions, setAvoidDisruptions] = useState<boolean>(false);
  const [userConfirmedIds, setUserConfirmedIds] = useState<string[]>(getUserConfirmedIds);
  const [userResolvedIds, setUserResolvedIds] = useState<string[]>(getUserResolvedIds);

  // Network layer toggles on map
  const [showMetroLayer, setShowMetroLayer] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('metroflow_show_metro_layer');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMetroLayer = () => {
    setShowMetroLayer((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('metroflow_show_metro_layer', String(next));
      } catch {}
      return next;
    });
  };

  const [showICLayer, setShowICLayer] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('metroflow_show_ic_layer');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleICLayer = () => {
    setShowICLayer((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('metroflow_show_ic_layer', String(next));
      } catch {}
      return next;
    });
  };

  // Expandable/Collapsible Line Legend on Map pinned in bottom left
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(false);

  // Route planning from transit map enabled toggle
  const [mapRoutePlanningEnabled, setMapRoutePlanningEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('metroflow_map_route_planning_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMapRoutePlanning = (enabled: boolean) => {
    setMapRoutePlanningEnabled(enabled);
    try {
      localStorage.setItem('metroflow_map_route_planning_enabled', String(enabled));
    } catch {}
  };

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [activeLineFilter, setActiveLineFilter] = useState<LineId | 'ALL'>('ALL');

  // Saved Journeys
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>(() => {
    try {
      const stored = localStorage.getItem('metroflow_saved_journeys');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Startup Disruption Overview Setting (default enabled)
  const [startupOverviewEnabled, setStartupOverviewEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('metroflow_startup_overview_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleStartupOverview = (enabled: boolean) => {
    setStartupOverviewEnabled(enabled);
    try {
      localStorage.setItem('metroflow_startup_overview_enabled', String(enabled));
    } catch {}
  };

  const [showStartupOverview, setShowStartupOverview] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Trigger startup disruption overview once after initial render
  useEffect(() => {
    if (!startupOverviewEnabled) return;
    try {
      const alreadyShown = sessionStorage.getItem('metroflow_startup_overview_shown');
      if (!alreadyShown) {
        const timer = setTimeout(() => {
          setShowStartupOverview(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [startupOverviewEnabled]);

  const handleCloseStartupOverview = () => {
    setShowStartupOverview(false);
    try {
      sessionStorage.setItem('metroflow_startup_overview_shown', 'true');
    } catch {}
  };

  const handleNavigateFromStartupToLines = () => {
    setShowStartupOverview(false);
    try {
      sessionStorage.setItem('metroflow_startup_overview_shown', 'true');
    } catch {}
    setActiveTab('lines');
  };

  // Manual Data Refresh (Check for new disruptions & articles)
  const handleRefreshData = async () => {
    setIsRefreshingData(true);
    haptic.selection();
    try {
      const [freshDisruptions, freshArticles] = await Promise.all([
        fetchDisruptions(),
        fetchArticles(),
      ]);
      setDisruptions(freshDisruptions);
      setUserConfirmedIds(getUserConfirmedIds());
      setUserResolvedIds(getUserResolvedIds());
      if (freshArticles && freshArticles.length > 0) {
        setArticles(freshArticles);
      }
      haptic.success();
      const count = freshDisruptions.filter((d) => d.isActive).length;
      showToast(
        language === 'de'
          ? `Daten online aktualisiert (${count} Störung${count === 1 ? '' : 'en'}, ${freshArticles.length} Artikel)`
          : `Data updated online (${count} disruption${count === 1 ? '' : 's'}, ${freshArticles.length} articles)`
      );
    } catch {
      haptic.warning();
      showToast(language === 'de' ? 'Aktualisierung fehlgeschlagen' : 'Update failed');
    } finally {
      setIsRefreshingData(false);
    }
  };

  const t = translations[language];

  // Fetch disruptions and set up real-time listener + polling interval (every 6s) to sync live reports
  useEffect(() => {
    let isMounted = true;
    const syncDisruptions = async () => {
      const data = await fetchDisruptions();
      if (isMounted) {
        setDisruptions(data);
        setUserConfirmedIds(getUserConfirmedIds());
        setUserResolvedIds(getUserResolvedIds());
      }
    };

    syncDisruptions();

    const unsubscribe = subscribeToDisruptions((liveDisruptions) => {
      if (isMounted) {
        setDisruptions(liveDisruptions);
        setUserConfirmedIds(getUserConfirmedIds());
        setUserResolvedIds(getUserResolvedIds());
      }
    });

    const interval = setInterval(syncDisruptions, 6000);
    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Recalculate routes ONLY when preference or disruption avoidance changes AND a route has already been calculated
  useEffect(() => {
    if (hasCalculatedRoute && originId && destinationId && originId !== destinationId) {
      const calculated = findRoutesWithStopover(
        originId,
        stopoverId,
        destinationId,
        preference,
        avoidDisruptions ? disruptions : [],
        disruptions
      );
      setRoutes(calculated);
      setActiveRoute(calculated[0] || null);
    }
  }, [preference, avoidDisruptions, disruptions]);

  // Explicit calculation upon button press (does NOT calculate automatically when entering destination)
  const handleCalculateRoute = () => {
    if (!originId || !destinationId) {
      haptic.warning();
      return;
    }
    if (originId === destinationId) {
      haptic.error();
      showToast(
        language === 'de'
          ? 'Start und Ziel dürfen nicht identisch sein.'
          : 'Origin and destination must be different.'
      );
      return;
    }

    const calculated = findRoutesWithStopover(
      originId,
      stopoverId,
      destinationId,
      preference,
      avoidDisruptions ? disruptions : [],
      disruptions
    );
    setRoutes(calculated);
    const topRoute = calculated[0] || null;
    setActiveRoute(topRoute);
    setHasCalculatedRoute(true);

    if (topRoute) {
      // Crisp iOS two-beat tactile confirmation on calculated route
      haptic.routeCalculated();

      // Save to recent routes (persisted across app reopens, last 3 quickly accessible)
      const originSt = STATIONS[originId];
      const destSt = STATIONS[destinationId];
      const stopoverSt = stopoverId ? STATIONS[stopoverId] : null;

      if (originSt && destSt) {
        const updated = saveRecentRoute({
          originId,
          destinationId,
          stopoverId: stopoverId || undefined,
          originName: originSt.name,
          destinationName: destSt.name,
          stopoverName: stopoverSt?.name,
          durationMinutes: topRoute.totalDurationMinutes,
          transfersCount: topRoute.transfersCount,
          linesUsed: topRoute.linesUsed,
        });
        setRecentRoutes(updated);
        setLastPlannedEntry(getLastPlannedEntry());
      }
    } else {
      haptic.warning();
    }
  };

  const handleSetOrigin = (stId: string | null) => {
    haptic.light();
    setOriginId(stId);
    setAvoidDisruptions(false);
    if (stId && destinationId && stId !== destinationId) {
      const calculated = findRoutesWithStopover(
        stId,
        stopoverId,
        destinationId,
        preference,
        [],
        disruptions
      );
      setRoutes(calculated);
      const topRoute = calculated[0] || null;
      setActiveRoute(topRoute);
      setHasCalculatedRoute(true);
    } else {
      setHasCalculatedRoute(false);
    }
  };

  const handleSetDestination = (stId: string | null) => {
    haptic.light();
    setDestinationId(stId);
    setAvoidDisruptions(false);
    if (originId && stId && originId !== stId) {
      const calculated = findRoutesWithStopover(
        originId,
        stopoverId,
        stId,
        preference,
        [],
        disruptions
      );
      setRoutes(calculated);
      const topRoute = calculated[0] || null;
      setActiveRoute(topRoute);
      setHasCalculatedRoute(true);
      if (topRoute) {
        const originSt = STATIONS[originId];
        const destSt = STATIONS[stId];
        const stopoverSt = stopoverId ? STATIONS[stopoverId] : null;
        if (originSt && destSt) {
          const updated = saveRecentRoute({
            originId,
            destinationId: stId,
            stopoverId: stopoverId || undefined,
            originName: originSt.name,
            destinationName: destSt.name,
            stopoverName: stopoverSt?.name,
            durationMinutes: topRoute.totalDurationMinutes,
            transfersCount: topRoute.transfersCount,
            linesUsed: topRoute.linesUsed,
          });
          setRecentRoutes(updated);
          setLastPlannedEntry(getLastPlannedEntry());
        }
      }
    } else {
      setHasCalculatedRoute(false);
    }
  };

  const handleSetStopover = (stId: string | null) => {
    haptic.light();
    setStopoverId(stId);
    setAvoidDisruptions(false);
    if (originId && destinationId && originId !== destinationId) {
      const calculated = findRoutesWithStopover(
        originId,
        stId,
        destinationId,
        preference,
        [],
        disruptions
      );
      setRoutes(calculated);
      setActiveRoute(calculated[0] || null);
      setHasCalculatedRoute(true);
    } else {
      setHasCalculatedRoute(false);
    }
  };

  const handleSwapStations = () => {
    haptic.medium();
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
    if (destinationId && temp && destinationId !== temp) {
      const calculated = findRoutesWithStopover(
        destinationId,
        stopoverId,
        temp,
        preference,
        [],
        disruptions
      );
      setRoutes(calculated);
      setActiveRoute(calculated[0] || null);
      setHasCalculatedRoute(true);
    } else {
      setHasCalculatedRoute(false);
    }
  };

  const handleViewOnMap = () => {
    haptic.medium();
    setActiveTab('map');
  };

  const handleNavigateToPlanner = () => {
    haptic.medium();
    if (originId && destinationId && originId !== destinationId) {
      if (!activeRoute || routes.length === 0) {
        const calculated = findRoutesWithStopover(
          originId,
          stopoverId,
          destinationId,
          preference,
          avoidDisruptions ? disruptions : [],
          disruptions
        );
        setRoutes(calculated);
        setActiveRoute(calculated[0] || null);
      }
      setHasCalculatedRoute(true);
    }
    setActiveTab('plan');
  };

  const handleSelectRecentRoute = (recent: RecentRoute) => {
    haptic.light();
    setOriginId(recent.originId);
    setStopoverId(recent.stopoverId || null);
    setDestinationId(recent.destinationId);
    setAvoidDisruptions(false);
    setActiveTab('plan');

    // Calculate directly for restored recent route
    const calculated = findRoutesWithStopover(
      recent.originId,
      recent.stopoverId || null,
      recent.destinationId,
      preference,
      [],
      disruptions
    );
    setRoutes(calculated);
    setActiveRoute(calculated[0] || null);
    setHasCalculatedRoute(true);
    haptic.routeCalculated();
    showToast(`${recent.originName} ➔ ${recent.destinationName}`);
  };

  const handleRestoreLastEntry = () => {
    haptic.medium();
    const last = lastPlannedEntry || recentRoutes[0];
    if (last) {
      handleSelectRecentRoute(last);
    }
  };

  const handleDeleteRecentRoute = (id: string) => {
    haptic.light();
    const updated = deleteRecentRoute(id);
    setRecentRoutes(updated);
    setLastPlannedEntry(getLastPlannedEntry());
    showToast(language === 'de' ? 'Aus Verlauf entfernt' : 'Removed from history');
  };

  const handleClearRecentRoutes = () => {
    haptic.heavy();
    clearRecentRoutes();
    setRecentRoutes([]);
    setLastPlannedEntry(null);
    showToast(language === 'de' ? 'Verlauf geleert' : 'Recents cleared');
  };

  // Report a disruption
  const handleReportDisruption = async (payload: NewDisruptionPayload) => {
    haptic.success();
    const created = await reportDisruption(payload);
    setDisruptions((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
    setUserConfirmedIds(getUserConfirmedIds());
    showToast(t.reportSuccess);
  };

  // Confirm a disruption (+1 upvote)
  const handleConfirmDisruption = async (id: string) => {
    haptic.medium();
    const newCount = await confirmDisruption(id);
    setDisruptions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, confirmations: newCount } : d))
    );
    setUserConfirmedIds(getUserConfirmedIds());
    showToast(language === 'de' ? 'Störung bestätigt (+1)' : 'Disruption confirmed (+1)');
  };

  // Report that disruption is gone (disappears after 10 reports)
  const handleReportResolved = async (id: string) => {
    haptic.success();
    const res = await reportDisruptionResolved(id);
    setUserResolvedIds(getUserResolvedIds());
    if (res.removed) {
      setDisruptions((prev) => prev.filter((d) => d.id !== id));
      showToast(
        language === 'de'
          ? 'Störung wurde nach 10 Meldungen automatisch entfernt!'
          : 'Disruption removed after 10 reports!'
      );
    } else {
      setDisruptions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, resolvedReports: res.resolvedReports } : d))
      );
      showToast(
        language === 'de'
          ? `Als behoben gemeldet (${res.resolvedReports}/10)`
          : `Reported resolved (${res.resolvedReports}/10)`
      );
    }
  };

  // Admin Disruption Management (Edit & Delete across all devices)
  const [editingDisruption, setEditingDisruption] = useState<Disruption | null>(null);
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState<boolean>(false);

  const handleOpenEditDisruption = (disruption: Disruption) => {
    haptic.medium();
    setEditingDisruption(disruption);
    setIsDisruptionModalOpen(true);
  };

  const handleSaveEditDisruption = async (id: string, updates: Partial<Disruption>) => {
    haptic.success();
    const updated = await updateDisruption(id, updates);
    setDisruptions((prev) => prev.map((d) => (d.id === id ? updated : d)));
    setEditingDisruption(null);
    setIsDisruptionModalOpen(false);
    showToast(t.disruptionUpdated);
  };

  const handleDeleteDisruption = async (id: string) => {
    haptic.medium();
    await deleteDisruption(id);
    setDisruptions((prev) => prev.filter((d) => d.id !== id));
    showToast(t.disruptionDeleted);
  };

  // Save planned journey
  const handleSaveJourney = () => {
    if (!activeRoute || !originId || !destinationId) return;

    const originStation = STATIONS[originId];
    const destStation = STATIONS[destinationId];
    const stopoverStation = stopoverId ? STATIONS[stopoverId] : null;

    if (!originStation || !destStation) return;

    const exists = savedJourneys.some(
      (j) =>
        j.originId === originId &&
        j.destinationId === destinationId &&
        j.stopoverId === (stopoverId || undefined)
    );

    if (exists) {
      haptic.light();
      const filtered = savedJourneys.filter(
        (j) =>
          !(
            j.originId === originId &&
            j.destinationId === destinationId &&
            j.stopoverId === (stopoverId || undefined)
          )
      );
      setSavedJourneys(filtered);
      try {
        localStorage.setItem('metroflow_saved_journeys', JSON.stringify(filtered));
      } catch {}
      showToast(language === 'de' ? 'Route aus Favoriten entfernt' : 'Route removed from saved');
      return;
    }

    haptic.success();
    const newJourney: SavedJourney = {
      id: `saved-${Date.now()}`,
      timestamp: Date.now(),
      originId,
      destinationId,
      stopoverId: stopoverId || undefined,
      originName: originStation.name,
      destinationName: destStation.name,
      stopoverName: stopoverStation?.name,
      durationMinutes: activeRoute.totalDurationMinutes,
      transfersCount: activeRoute.transfersCount,
      linesUsed: activeRoute.linesUsed,
    };

    const updated = [newJourney, ...savedJourneys];
    setSavedJourneys(updated);
    try {
      localStorage.setItem('metroflow_saved_journeys', JSON.stringify(updated));
    } catch {}
    showToast(t.routeSaved);
  };

  const handleDeleteSavedJourney = (journeyId: string) => {
    haptic.light();
    const updated = savedJourneys.filter((j) => j.id !== journeyId);
    setSavedJourneys(updated);
    try {
      localStorage.setItem('metroflow_saved_journeys', JSON.stringify(updated));
    } catch {}
  };

  const handleLoadSavedJourney = (journey: SavedJourney) => {
    haptic.medium();
    setOriginId(journey.originId);
    setStopoverId(journey.stopoverId || null);
    setDestinationId(journey.destinationId);
    setActiveTab('plan');

    const calculated = findRoutesWithStopover(
      journey.originId,
      journey.stopoverId || null,
      journey.destinationId,
      preference,
      [],
      disruptions
    );
    setRoutes(calculated);
    setActiveRoute(calculated[0] || null);
    setHasCalculatedRoute(true);
    haptic.routeCalculated();
    showToast(`${journey.originName} ➔ ${journey.destinationName}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <div
      className={`${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } min-h-screen flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200`}
    >
      {/* Offline connectivity warning banner */}
      <OfflineIndicator language={language} />

      {/* Floating Save Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-950 px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Cupertino Header */}
      <Header
        language={language}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full max-w-4xl mx-auto flex flex-col ${
          activeTab === 'map'
            ? 'px-0 md:px-6 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-16 md:pb-6'
            : 'px-4 md:px-6 pt-[calc(3.5rem+env(safe-area-inset-top)+1.25rem)] pb-24 md:pb-8'
        } overflow-x-hidden`}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              <HomePage
                language={language}
                isAdmin={isAdmin}
                articles={articles}
                disruptions={disruptions}
                onNavigateToTab={setActiveTab}
                onPublishArticle={handlePublishArticle}
                onEditArticle={handleEditArticle}
                onDeleteArticle={handleDeleteArticle}
              />
            </motion.div>
          )}

          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              <TripPlanner
                language={language}
                originId={originId}
                destinationId={destinationId}
                stopoverId={stopoverId}
                routes={routes}
                activeRoute={activeRoute}
                savedJourneys={savedJourneys}
                recentRoutes={recentRoutes}
                lastPlannedEntry={lastPlannedEntry}
                preference={preference}
                disruptions={disruptions}
                avoidDisruptions={avoidDisruptions}
                onToggleAvoidDisruptions={setAvoidDisruptions}
                onSetPreference={handleSetPreference}
                onSelectRoute={(route) => setActiveRoute(route)}
                onCalculateRoute={handleCalculateRoute}
                hasCalculatedRoute={hasCalculatedRoute}
                onSetOrigin={handleSetOrigin}
                onSetDestination={handleSetDestination}
                onSetStopover={handleSetStopover}
                onSwapStations={handleSwapStations}
                onViewOnMap={handleViewOnMap}
                onSaveJourney={handleSaveJourney}
                onSelectRecentRoute={handleSelectRecentRoute}
                onDeleteRecentRoute={handleDeleteRecentRoute}
                onClearRecentRoutes={handleClearRecentRoutes}
                onRestoreLastEntry={handleRestoreLastEntry}
              />
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col h-[calc(100dvh-7.5rem)] md:min-h-[580px] rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-slate-200 dark:border-slate-800 shadow-none md:shadow-2xl relative"
            >
              <InteractiveMap
                language={language}
                theme={theme}
                selectedOriginId={originId}
                selectedDestinationId={destinationId}
                selectedStopoverId={stopoverId}
                activeRoute={activeRoute}
                activeLineFilter={activeLineFilter}
                onSelectLineFilter={setActiveLineFilter}
                isLegendExpanded={isLegendExpanded}
                onToggleLegendExpanded={() => setIsLegendExpanded((prev) => !prev)}
                showICLayer={showICLayer}
                onToggleICLayer={handleToggleICLayer}
                showMetroLayer={showMetroLayer}
                onToggleMetroLayer={handleToggleMetroLayer}
                onSelectStation={() => {}}
                onSetOrigin={(stId) => {
                  handleSetOrigin(stId);
                }}
                onSetDestination={(stId) => {
                  handleSetDestination(stId);
                }}
                onSetStopover={(stId) => {
                  handleSetStopover(stId);
                }}
                disruptions={disruptions}
                userConfirmedIds={userConfirmedIds}
                userResolvedIds={userResolvedIds}
                onConfirmDisruption={handleConfirmDisruption}
                onReportResolved={handleReportResolved}
                routePlanningEnabled={mapRoutePlanningEnabled}
                onNavigateToPlanner={handleNavigateToPlanner}
                isAdmin={isAdmin}
                onEditDisruption={handleOpenEditDisruption}
                onDeleteDisruption={handleDeleteDisruption}
              />
            </motion.div>
          )}

          {activeTab === 'lines' && (
            <motion.div
              key="lines"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              <LineDirectory
                language={language}
                disruptions={disruptions}
                userConfirmedIds={userConfirmedIds}
                userResolvedIds={userResolvedIds}
                onConfirmDisruption={handleConfirmDisruption}
                onReportResolved={handleReportResolved}
                onReportDisruption={handleReportDisruption}
                isAdmin={isAdmin}
                onEditDisruption={handleOpenEditDisruption}
                onDeleteDisruption={handleDeleteDisruption}
                onSelectStation={() => {
                  setActiveTab('map');
                }}
                onSetOrigin={(stId) => {
                  handleSetOrigin(stId);
                  setActiveTab('plan');
                }}
                onSetDestination={(stId) => {
                  handleSetDestination(stId);
                  setActiveTab('plan');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              <OptionsMenu
                language={language}
                onSetLanguage={handleSetLanguage}
                theme={theme}
                onSetTheme={setTheme}
                savedJourneys={savedJourneys}
                onLoadSavedJourney={handleLoadSavedJourney}
                onDeleteSavedJourney={handleDeleteSavedJourney}
                mapRoutePlanningEnabled={mapRoutePlanningEnabled}
                onToggleMapRoutePlanning={handleToggleMapRoutePlanning}
                isAdmin={isAdmin}
                onToggleAdmin={handleToggleAdmin}
                tabBarStyle={tabBarStyle}
                onSetTabBarStyle={handleSetTabBarStyle}
                startupOverviewEnabled={startupOverviewEnabled}
                onToggleStartupOverview={handleToggleStartupOverview}
                onRefreshData={handleRefreshData}
                isRefreshingData={isRefreshingData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Startup Disruption Overview Modal */}
      <StartupDisruptionModal
        language={language}
        disruptions={disruptions}
        isOpen={showStartupOverview}
        onClose={handleCloseStartupOverview}
        onNavigateToLines={handleNavigateFromStartupToLines}
        startupOverviewEnabled={startupOverviewEnabled}
        onToggleStartupOverview={handleToggleStartupOverview}
      />

      {/* Admin Disruption Edit / Create Modal */}
      <ReportDisruptionModal
        language={language}
        isOpen={isDisruptionModalOpen}
        onClose={() => {
          setIsDisruptionModalOpen(false);
          setEditingDisruption(null);
        }}
        onSubmit={handleReportDisruption}
        disruptionToEdit={editingDisruption}
        onEditSubmit={handleSaveEditDisruption}
      />

      {/* Bottom iOS Navigation Bar */}
      <TabBar
        language={language}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        tabBarStyle={tabBarStyle}
      />
    </div>
  );
}
