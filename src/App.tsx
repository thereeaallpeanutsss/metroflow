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
import { findRoutesWithStopover, buildRideSteps, setGlobalTravelTimeOverrides } from './utils/routeFinder';
import {
  RouteOption,
  LineId,
  SavedJourney,
  RoutePreference,
  Disruption,
  RecentRoute,
  TravelTimeOverridesMap,
  ActiveRideState,
  MeasuredSegmentLog,
} from './types/metro';
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
import { IOSHeader } from './components/ios/IOSHeader';
import { IOSHomePage } from './components/ios/IOSHomePage';
import { IOSTripPlanner } from './components/ios/IOSTripPlanner';
import { IOSLineDirectory } from './components/ios/IOSLineDirectory';
import { IOSSettingsView } from './components/ios/IOSSettingsView';
import {
  fetchArticles,
  publishArticleToServer,
  updateArticleOnServer,
  deleteArticleFromServer,
  getLocalCachedArticles,
  subscribeToArticles,
} from './services/articlesService';
import {
  fetchTravelTimes,
  subscribeToTravelTimes,
  saveLineTravelTimes,
  getLocalCachedTravelTimes,
} from './services/travelTimesService';
import { RideModeModal } from './components/RideModeModal';
import { haptic } from './utils/haptics';
import { BookmarkCheck, Train, TrainFront, ChevronUp, ChevronDown, Sparkles, X } from 'lucide-react';
import { CURRENT_VERSION } from './data/versionHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // First-launch update notification banner
  const [showUpdateNotification, setShowUpdateNotification] = useState<boolean>(() => {
    try {
      const lastSeen = localStorage.getItem('metroflow_last_seen_version');
      return lastSeen !== CURRENT_VERSION;
    } catch {
      return false;
    }
  });
  const [openVersionHistoryFromBanner, setOpenVersionHistoryFromBanner] = useState(false);

  const handleDismissUpdateNotification = () => {
    try {
      localStorage.setItem('metroflow_last_seen_version', CURRENT_VERSION);
    } catch {}
    setShowUpdateNotification(false);
  };

  const handleViewVersionHistoryFromNotification = () => {
    try {
      localStorage.setItem('metroflow_last_seen_version', CURRENT_VERSION);
    } catch {}
    setShowUpdateNotification(false);
    setOpenVersionHistoryFromBanner(true);
    setActiveTab('options');
  };

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

  // UI Design Theme: 'default' (classic MetroFlow), 'ios' (iOS-inspired), or 'minecraft' (Minecraft pixel theme)
  const [uiTheme, setUiTheme] = useState<'default' | 'ios' | 'minecraft'>(() => {
    try {
      const adminSaved = localStorage.getItem('metroflow_is_admin') === 'true';
      // When opening the app the first time or if not admin, default UI is original ('default')
      if (!adminSaved) {
        return 'default';
      }
      // Only when in admin mode and having switched the UI before closing the app:
      const saved = localStorage.getItem('metroflow_ui_theme');
      if (saved === 'ios' || saved === 'minecraft' || saved === 'default') {
        return saved;
      }
      return 'default';
    } catch {
      return 'default';
    }
  });

  const handleSetUiTheme = (themeMode: 'default' | 'ios' | 'minecraft') => {
    setUiTheme(themeMode);
    try {
      localStorage.setItem('metroflow_ui_theme', themeMode);
    } catch {}
    // If switching to iOS theme, default to the iOS menu bar if not explicitly set
    if (themeMode === 'ios') {
      const savedBar = localStorage.getItem('metroflow_tab_bar_style');
      if (!savedBar) {
        setTabBarStyle('ios26');
      }
    }
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

  // Global Admin-Measured Segment Travel Times
  const [travelTimeOverrides, setTravelTimeOverrides] = useState<TravelTimeOverridesMap>(() => {
    const initial = getLocalCachedTravelTimes();
    setGlobalTravelTimeOverrides(initial);
    return initial;
  });

  useEffect(() => {
    let isMounted = true;
    fetchTravelTimes().then((map) => {
      if (isMounted) {
        setGlobalTravelTimeOverrides(map);
        setTravelTimeOverrides(map);
      }
    });

    const unsubscribe = subscribeToTravelTimes((liveMap) => {
      if (isMounted) {
        setGlobalTravelTimeOverrides(liveMap);
        setTravelTimeOverrides(liveMap);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Active Journey Tracker (Ride Mode) State
  const [activeRide, setActiveRide] = useState<ActiveRideState | null>(null);
  const [isStatusWindowOpen, setIsStatusWindowOpen] = useState<boolean>(false);

  const handleStartRide = (route: RouteOption) => {
    const steps = buildRideSteps(route, travelTimeOverrides);
    if (steps.length === 0) return;
    haptic.routeCalculated();
    setActiveRide({
      id: `ride-${Date.now()}`,
      route,
      steps,
      currentStepIndex: 0,
      isMinimized: false,
      startedAt: Date.now(),
      loggingEnabled: false,
      loggingStatus: 'idle',
      segmentTimerStartedAt: null,
      measuredSegments: [],
      showComparisonModal: false,
    });
  };

  const handleMinimizeRide = () => {
    setActiveRide((prev) => (prev ? { ...prev, isMinimized: true } : null));
  };

  const handleOpenActiveRide = () => {
    setActiveRide((prev) => (prev ? { ...prev, isMinimized: false } : null));
  };

  const handleEndRide = () => {
    setActiveRide(null);
  };

  const handleConfirmSaveTravelTimes = async (logs: MeasuredSegmentLog[]) => {
    if (!isAdmin || logs.length === 0) return;
    const updatedMap = await saveLineTravelTimes(
      logs.map((l) => ({
        lineId: l.lineId,
        fromStationId: l.fromStationId,
        toStationId: l.toStationId,
        durationSeconds: l.newDurationSeconds,
      })),
      'abc123'
    );
    setGlobalTravelTimeOverrides(updatedMap);
    setTravelTimeOverrides(updatedMap);
    setActiveRide(null);
    haptic.success();
    showToast(translations[language].travelTimesUpdatedSuccess);
  };

  // Disruptions live state (persisted locally and synced with server)
  const [disruptions, setDisruptions] = useState<Disruption[]>(getLocalCachedDisruptions);
  const [avoidDisruptions, setAvoidDisruptions] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('metroflow_avoid_disruptions');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [userConfirmedIds, setUserConfirmedIds] = useState<string[]>(getUserConfirmedIds);
  const [userResolvedIds, setUserResolvedIds] = useState<string[]>(getUserResolvedIds);

  const handleToggleAvoidDisruptions = (avoid: boolean) => {
    setAvoidDisruptions(avoid);
    try {
      localStorage.setItem('metroflow_avoid_disruptions', String(avoid));
    } catch {}
  };

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

  // Highlight glow effect around lines and stations on map (OFF by default for max FPS)
  const [mapHighlightGlowEnabled, setMapHighlightGlowEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('metroflow_map_highlight_glow') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMapHighlightGlow = (enabled: boolean) => {
    setMapHighlightGlowEnabled(enabled);
    try {
      localStorage.setItem('metroflow_map_highlight_glow', String(enabled));
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

  // Manual Data Refresh (Check for new disruptions, articles & travel times)
  const handleRefreshData = async () => {
    setIsRefreshingData(true);
    haptic.selection();
    try {
      const [freshDisruptions, freshArticles, freshTravelTimes] = await Promise.all([
        fetchDisruptions(),
        fetchArticles(),
        fetchTravelTimes(),
      ]);
      setDisruptions(freshDisruptions);
      setUserConfirmedIds(getUserConfirmedIds());
      setUserResolvedIds(getUserResolvedIds());
      if (freshArticles && freshArticles.length > 0) {
        setArticles(freshArticles);
      }
      setGlobalTravelTimeOverrides(freshTravelTimes);
      setTravelTimeOverrides(freshTravelTimes);
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
    const areDisruptionsEqual = (a: Disruption[], b: Disruption[]) => {
      if (a.length !== b.length) return false;
      return JSON.stringify(a) === JSON.stringify(b);
    };

    const syncDisruptions = async () => {
      const data = await fetchDisruptions();
      if (isMounted) {
        setDisruptions((prev) => (areDisruptionsEqual(prev, data) ? prev : data));
        setUserConfirmedIds(getUserConfirmedIds());
        setUserResolvedIds(getUserResolvedIds());
      }
    };

    syncDisruptions();

    const unsubscribe = subscribeToDisruptions((liveDisruptions) => {
      if (isMounted) {
        setDisruptions((prev) => (areDisruptionsEqual(prev, liveDisruptions) ? prev : liveDisruptions));
        setUserConfirmedIds(getUserConfirmedIds());
        setUserResolvedIds(getUserResolvedIds());
      }
    });

    const interval = setInterval(syncDisruptions, 15000);
    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Recalculate routes ONLY when preference, disruption avoidance, or global travel times change AND a route has already been calculated
  useEffect(() => {
    if (hasCalculatedRoute && originId && destinationId && originId !== destinationId) {
      const calculated = findRoutesWithStopover(
        originId,
        stopoverId,
        destinationId,
        preference,
        avoidDisruptions ? disruptions : [],
        disruptions,
        travelTimeOverrides
      );
      setRoutes(calculated);
      setActiveRoute((prevActive) => {
        if (!prevActive) return calculated[0] || null;
        const matched = calculated.find(
          (r) =>
            r.linesUsed.join('-') === prevActive.linesUsed.join('-') &&
            r.pathStationIds.join('-') === prevActive.pathStationIds.join('-')
        );
        return matched || calculated[0] || null;
      });
    }
  }, [preference, avoidDisruptions, disruptions, travelTimeOverrides]);

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
      disruptions,
      travelTimeOverrides
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
    if (stId && destinationId && stId !== destinationId) {
      const calculated = findRoutesWithStopover(
        stId,
        stopoverId,
        destinationId,
        preference,
        avoidDisruptions ? disruptions : [],
        disruptions,
        travelTimeOverrides
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
    if (originId && stId && originId !== stId) {
      const calculated = findRoutesWithStopover(
        originId,
        stopoverId,
        stId,
        preference,
        avoidDisruptions ? disruptions : [],
        disruptions,
        travelTimeOverrides
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
    if (originId && destinationId && originId !== destinationId) {
      const calculated = findRoutesWithStopover(
        originId,
        stId,
        destinationId,
        preference,
        avoidDisruptions ? disruptions : [],
        disruptions,
        travelTimeOverrides
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
        avoidDisruptions ? disruptions : [],
        disruptions,
        travelTimeOverrides
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
          disruptions,
          travelTimeOverrides
        );
        setRoutes(calculated);
        setActiveRoute(calculated[0] || null);
      }
      setHasCalculatedRoute(true);
    }
    setActiveTab('plan');
  };

  const handleResetRoute = () => {
    haptic.light();
    setOriginId(null);
    setDestinationId(null);
    setStopoverId(null);
    setRoutes([]);
    setActiveRoute(null);
    setHasCalculatedRoute(false);
  };

  const handleSelectRecentRoute = (recent: RecentRoute) => {
    haptic.light();
    setOriginId(recent.originId);
    setStopoverId(recent.stopoverId || null);
    setDestinationId(recent.destinationId);
    setActiveTab('plan');

    // Calculate directly for restored recent route
    const calculated = findRoutesWithStopover(
      recent.originId,
      recent.stopoverId || null,
      recent.destinationId,
      preference,
      avoidDisruptions ? disruptions : [],
      disruptions,
      travelTimeOverrides
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
      disruptions,
      travelTimeOverrides
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
        uiTheme === 'minecraft'
          ? theme === 'dark'
            ? 'theme-minecraft theme-minecraft-dark dark bg-[#14161a] text-[#f1f5f9] font-mono'
            : 'theme-minecraft theme-minecraft-light bg-[#f2ede4] text-[#24211d] font-mono'
          : theme === 'dark'
          ? uiTheme === 'ios'
            ? 'dark bg-black text-slate-100 font-sans'
            : 'dark bg-slate-950 text-slate-100 font-sans'
          : uiTheme === 'ios'
          ? 'bg-[#F2F2F7] text-slate-900 font-sans'
          : 'bg-slate-50 text-slate-900 font-sans'
      } min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200`}
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

      {/* Top Header: iOS Overhaul Header vs Classic Header */}
      {uiTheme === 'ios' ? (
        <IOSHeader
          language={language}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activeTab={activeTab}
          onNavigateToTab={setActiveTab}
          disruptions={disruptions}
          hasMinimizedActiveRide={Boolean(activeRide && activeRide.isMinimized)}
          onOpenActiveRide={handleOpenActiveRide}
          onStatusWindowOpenChange={setIsStatusWindowOpen}
        />
      ) : (
        <Header
          language={language}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activeTab={activeTab}
          disruptions={disruptions}
          onNavigateToTab={setActiveTab}
          hasMinimizedActiveRide={Boolean(activeRide && activeRide.isMinimized)}
          onOpenActiveRide={handleOpenActiveRide}
          onStatusWindowOpenChange={setIsStatusWindowOpen}
        />
      )}

      {/* First-launch Update Conducted Notification Banner */}
      <AnimatePresence>
        {showUpdateNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed top-[calc(4rem+env(safe-area-inset-top))] left-3 right-3 sm:left-auto sm:right-6 sm:w-[410px] z-50 pointer-events-auto"
          >
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-2xl border border-white/25 flex items-start gap-3 backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                    {language === 'de' ? 'Update durchgeführt' : 'App Updated'}
                  </span>
                  <span className="font-mono text-xs font-black text-amber-200">
                    v{CURRENT_VERSION}
                  </span>
                </div>
                <p className="text-xs text-white/95 mt-1 font-medium leading-relaxed">
                  {language === 'de'
                    ? `MetroFlow wurde auf Version ${CURRENT_VERSION} aktualisiert!`
                    : `MetroFlow has been updated to version ${CURRENT_VERSION}!`}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleViewVersionHistoryFromNotification}
                    className="text-xs font-bold py-1.5 px-3 rounded-xl bg-white text-blue-700 hover:bg-white/90 transition shadow-sm cursor-pointer active:scale-95"
                  >
                    {language === 'de' ? 'Was ist neu?' : "What's new?"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissUpdateNotification}
                    className="text-xs font-medium py-1.5 px-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    {language === 'de' ? 'Schließen' : 'Dismiss'}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissUpdateNotification}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                title={language === 'de' ? 'Schließen' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full max-w-5xl mx-auto flex flex-col ${
          activeTab === 'map'
            ? 'px-0 md:px-6 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-16 md:pb-6'
            : 'px-4 md:px-6 pt-[calc(3.5rem+env(safe-area-inset-top)+1.25rem)] pb-24 md:pb-8'
        } overflow-x-hidden`}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key={`home-${uiTheme}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              {uiTheme === 'ios' ? (
                <IOSHomePage
                  language={language}
                  isAdmin={isAdmin}
                  articles={articles}
                  disruptions={disruptions}
                  onNavigateToTab={setActiveTab}
                  onPublishArticle={handlePublishArticle}
                  onEditArticle={handleEditArticle}
                  onDeleteArticle={handleDeleteArticle}
                  onSelectStationForTrip={handleSetOrigin}
                />
              ) : (
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
              )}
            </motion.div>
          )}

          {activeTab === 'plan' && (
            <motion.div
              key={`plan-${uiTheme}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              {uiTheme === 'ios' ? (
                <IOSTripPlanner
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
                  onToggleAvoidDisruptions={handleToggleAvoidDisruptions}
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
                  isAdmin={isAdmin}
                  activeRideId={activeRide?.route.id || null}
                  onStartRide={handleStartRide}
                  onOpenActiveRide={handleOpenActiveRide}
                />
              ) : (
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
                  onToggleAvoidDisruptions={handleToggleAvoidDisruptions}
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
                  isAdmin={isAdmin}
                  activeRideId={activeRide?.route.id || null}
                  onStartRide={handleStartRide}
                  onOpenActiveRide={handleOpenActiveRide}
                />
              )}
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
                highlightGlowEnabled={mapHighlightGlowEnabled}
                onNavigateToPlanner={handleNavigateToPlanner}
                onResetRoute={handleResetRoute}
                isAdmin={isAdmin}
                onEditDisruption={handleOpenEditDisruption}
                onDeleteDisruption={handleDeleteDisruption}
                activeRide={activeRide}
                onOpenActiveRide={handleOpenActiveRide}
                travelTimeOverrides={travelTimeOverrides}
              />
            </motion.div>
          )}

          {activeTab === 'lines' && (
            <motion.div
              key={`lines-${uiTheme}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              {uiTheme === 'ios' ? (
                <IOSLineDirectory
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
                  travelTimeOverrides={travelTimeOverrides}
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
              ) : (
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
                  travelTimeOverrides={travelTimeOverrides}
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
              )}
            </motion.div>
          )}

          {activeTab === 'options' && (
            <motion.div
              key={`options-${uiTheme}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex-1 flex flex-col"
            >
              {uiTheme === 'ios' ? (
                <IOSSettingsView
                  language={language}
                  onSetLanguage={handleSetLanguage}
                  theme={theme}
                  onSetTheme={setTheme}
                  uiTheme={uiTheme}
                  onSetUiTheme={handleSetUiTheme}
                  savedJourneys={savedJourneys}
                  onLoadSavedJourney={handleLoadSavedJourney}
                  onDeleteSavedJourney={handleDeleteSavedJourney}
                  mapRoutePlanningEnabled={mapRoutePlanningEnabled}
                  onToggleMapRoutePlanning={handleToggleMapRoutePlanning}
                  mapHighlightGlowEnabled={mapHighlightGlowEnabled}
                  onToggleMapHighlightGlow={handleToggleMapHighlightGlow}
                  isAdmin={isAdmin}
                  onToggleAdmin={handleToggleAdmin}
                  tabBarStyle={tabBarStyle}
                  onSetTabBarStyle={handleSetTabBarStyle}
                  startupOverviewEnabled={startupOverviewEnabled}
                  onToggleStartupOverview={handleToggleStartupOverview}
                  onRefreshData={handleRefreshData}
                  isRefreshingData={isRefreshingData}
                  openVersionHistoryDirectly={openVersionHistoryFromBanner}
                  onCloseVersionHistoryDirectly={() => setOpenVersionHistoryFromBanner(false)}
                />
              ) : (
                <OptionsMenu
                  language={language}
                  onSetLanguage={handleSetLanguage}
                  theme={theme}
                  onSetTheme={setTheme}
                  uiTheme={uiTheme}
                  onSetUiTheme={handleSetUiTheme}
                  savedJourneys={savedJourneys}
                  onLoadSavedJourney={handleLoadSavedJourney}
                  onDeleteSavedJourney={handleDeleteSavedJourney}
                  mapRoutePlanningEnabled={mapRoutePlanningEnabled}
                  onToggleMapRoutePlanning={handleToggleMapRoutePlanning}
                  mapHighlightGlowEnabled={mapHighlightGlowEnabled}
                  onToggleMapHighlightGlow={handleToggleMapHighlightGlow}
                  isAdmin={isAdmin}
                  onToggleAdmin={handleToggleAdmin}
                  tabBarStyle={tabBarStyle}
                  onSetTabBarStyle={handleSetTabBarStyle}
                  startupOverviewEnabled={startupOverviewEnabled}
                  onToggleStartupOverview={handleToggleStartupOverview}
                  onRefreshData={handleRefreshData}
                  isRefreshingData={isRefreshingData}
                  openVersionHistoryDirectly={openVersionHistoryFromBanner}
                  onCloseVersionHistoryDirectly={() => setOpenVersionHistoryFromBanner(false)}
                />
              )}
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

      {/* Active Journey Tracker / Ride Mode Modal */}
      <AnimatePresence>
        {activeRide && !activeRide.isMinimized && (
          <RideModeModal
            language={language}
            rideState={activeRide}
            isAdmin={isAdmin}
            travelTimeOverrides={travelTimeOverrides}
            onMinimize={handleMinimizeRide}
            onEndRide={handleEndRide}
            onViewOnMap={handleViewOnMap}
            onUpdateRideState={setActiveRide}
            onConfirmSaveTravelTimes={handleConfirmSaveTravelTimes}
          />
        )}
      </AnimatePresence>

      {/* Bottom iOS Navigation Bar (hidden while Active Ride, Alert/Time, or Startup Disruption windows are open) */}
      {!(Boolean(activeRide && !activeRide.isMinimized) || isStatusWindowOpen || showStartupOverview) && (
        <TabBar
          language={language}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          tabBarStyle={tabBarStyle}
        />
      )}
    </div>
  );
}
