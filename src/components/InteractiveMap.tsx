import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Station, LineId, RouteOption, Disruption, ActiveRideState, TravelTimeOverridesMap, IsochroneResult } from '../types/metro';
import { STATIONS, METRO_LINES } from '../data/metroData';
import { buildLegTrackPath } from '../utils/trackPaths';
import { getLineTotalTravelTime, computeStationIsochrone } from '../utils/routeFinder';
import { Language, translations, getDisruptionTypeLabel } from '../utils/i18n';
import { ConfirmDeleteDisruptionModal } from './ConfirmDeleteDisruptionModal';
import { haptic } from '../utils/haptics';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  MapPin,
  ArrowRight,
  Info,
  PlusCircle,
  Train,
  Eye,
  EyeOff,
  AlertTriangle,
  ZapOff,
  ShoppingBag,
  Ban,
  Construction,
  ThumbsUp,
  ShieldCheck,
  X,
  ExternalLink,
  Sparkles,
  TrainFront,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Search,
  Navigation,
  Clock,
  Radar,
} from 'lucide-react';

function getIsochroneTierColor(seconds: number): string {
  if (seconds <= 300) return '#10B981'; // 0-5 min: Emerald
  if (seconds <= 600) return '#06B6D4'; // 5-10 min: Cyan
  if (seconds <= 900) return '#F59E0B'; // 10-15 min: Amber
  return '#8B5CF6'; // >15 min: Violet
}

function formatSecondsVerbose(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins === 0) return `${rem}s`;
  if (rem === 0) return `${mins} min`;
  return `${mins}:${rem.toString().padStart(2, '0')} min`;
}

function formatSecondsCompactBadge(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return '0s';
  if (s < 60) return `${s}s`;
  const mins = s / 60;
  return `${Number.isInteger(mins) ? mins : mins.toFixed(1)}m`;
}

interface InteractiveMapProps {
  language: Language;
  theme: 'dark' | 'light';
  selectedOriginId: string | null;
  selectedDestinationId: string | null;
  selectedStopoverId?: string | null;
  selectedStopoverIds?: string[];
  activeRoute: RouteOption | null;
  activeLineFilter: LineId | 'ALL';
  onSelectLineFilter?: (lineId: LineId | 'ALL') => void;
  isLegendExpanded?: boolean;
  onToggleLegendExpanded?: () => void;
  showICLayer: boolean;
  onToggleICLayer: () => void;
  showMetroLayer?: boolean;
  onToggleMetroLayer?: () => void;
  onSelectStation: (stationId: string) => void;
  onSetOrigin: (stationId: string) => void;
  onSetDestination: (stationId: string) => void;
  onSetStopover?: (stationId: string) => void;
  disruptions?: Disruption[];
  avoidDisruptions?: boolean;
  userConfirmedIds?: string[];
  userResolvedIds?: string[];
  onConfirmDisruption?: (id: string) => void;
  onReportResolved?: (id: string) => Promise<void>;
  routePlanningEnabled?: boolean;
  highlightGlowEnabled?: boolean;
  onNavigateToPlanner?: () => void;
  onResetRoute?: () => void;
  isAdmin?: boolean;
  onEditDisruption?: (disruption: Disruption) => void;
  onDeleteDisruption?: (disruptionId: string) => Promise<void>;
  activeRide?: ActiveRideState | null;
  onOpenActiveRide?: () => void;
  travelTimeOverrides?: TravelTimeOverridesMap;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  language,
  theme,
  selectedOriginId,
  selectedDestinationId,
  selectedStopoverId,
  selectedStopoverIds,
  activeRoute,
  activeLineFilter,
  onSelectLineFilter,
  isLegendExpanded: controlledLegendExpanded,
  onToggleLegendExpanded,
  showICLayer,
  onToggleICLayer,
  showMetroLayer = true,
  onToggleMetroLayer,
  onSelectStation,
  onSetOrigin,
  onSetDestination,
  onSetStopover,
  disruptions = [],
  avoidDisruptions = false,
  userConfirmedIds = [],
  userResolvedIds = [],
  onConfirmDisruption,
  onReportResolved,
  routePlanningEnabled = true,
  highlightGlowEnabled = false,
  onNavigateToPlanner,
  onResetRoute,
  isAdmin = false,
  onEditDisruption,
  onDeleteDisruption,
  activeRide = null,
  onOpenActiveRide,
  travelTimeOverrides,
}) => {
  const t = translations[language];

  const effectiveStopoverIds = useMemo(() => {
    if (selectedStopoverIds && selectedStopoverIds.length > 0) {
      return selectedStopoverIds;
    }
    return selectedStopoverId ? [selectedStopoverId] : [];
  }, [selectedStopoverIds, selectedStopoverId]);

  // Detect mobile width to provide an optimized, centered initial view
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Live viewport refs for zero-React-rerender 60-120fps pan & zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [clickedStationId, setClickedStationId] = useState<string | null>(null);
  const [clickedLineId, setClickedLineId] = useState<LineId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [disruptionToDelete, setDisruptionToDelete] = useState<Disruption | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [internalLegendExpanded, setInternalLegendExpanded] = useState(false);

  // Responsive collapsibility for map info cards (expanded by default per user request)
  const [isStationCardCollapsed, setIsStationCardCollapsed] = useState(false);
  const [isLineCardCollapsed, setIsLineCardCollapsed] = useState(false);
  const [isDisruptionCardCollapsed, setIsDisruptionCardCollapsed] = useState(false);

  // Isochrone Reachability Explorer State
  const [isochroneEnabled, setIsochroneEnabled] = useState(false);
  const [isochroneOriginId, setIsochroneOriginId] = useState<string | null>(null);
  const [isochroneBudgetSeconds, setIsochroneBudgetSeconds] = useState<number>(600);

  // Independent smoothly draggable info card state
  const isInfoCardDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);

  const clickedLine = clickedLineId ? METRO_LINES[clickedLineId] : null;

  const isExpanded = controlledLegendExpanded !== undefined ? controlledLegendExpanded : internalLegendExpanded;
  const handleToggleLegend = () => {
    haptic.selection();
    if (onToggleLegendExpanded) {
      onToggleLegendExpanded();
    } else {
      setInternalLegendExpanded((prev) => !prev);
    }
  };
  const handleSelectFilter = (lId: LineId | 'ALL') => {
    haptic.selection();
    if (onSelectLineFilter) {
      onSelectLineFilter(lId);
    }
  };
  const showFloatingIsochroneHud = Boolean(
    isochroneEnabled && isochroneOriginId && !clickedStationId && !selectedDisruption && !clickedLineId
  );
  const hasBottomSheet = Boolean(clickedStationId || selectedDisruption || clickedLineId || showFloatingIsochroneHud);

  const containerRef = useRef<HTMLDivElement>(null);

  const BASE_MAP_X = -20;
  const BASE_MAP_Y = 8;
  const BASE_MAP_W = 1115;
  const BASE_MAP_H = 702;
  const MAP_CENTER_X = BASE_MAP_X + BASE_MAP_W / 2; // 537.5
  const MAP_CENTER_Y = BASE_MAP_Y + BASE_MAP_H / 2; // 359

  const [containerSize, setContainerSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: 600,
  });
  const containerSizeRef = useRef(containerSize);
  containerSizeRef.current = containerSize;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const next = { width: rect.width, height: rect.height };
        containerSizeRef.current = next;
        setContainerSize(next);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const computeSvgViewBox = (width: number, height: number, z: number, p: { x: number; y: number }) => {
    const baseScale = Math.min(width / BASE_MAP_W, height / BASE_MAP_H) || 1;
    const effectiveScale = baseScale * z;
    const svgPanX = p.x / effectiveScale;
    const svgPanY = p.y / effectiveScale;

    const visibleW = BASE_MAP_W / z;
    const visibleH = BASE_MAP_H / z;

    const centerX = MAP_CENTER_X - svgPanX;
    const centerY = MAP_CENTER_Y - svgPanY;

    const minX = centerX - visibleW / 2;
    const minY = centerY - visibleH / 2;

    return `${minX.toFixed(2)} ${minY.toFixed(2)} ${visibleW.toFixed(2)} ${visibleH.toFixed(2)}`;
  };

  // Initial / React-synced viewBox string
  const svgViewBox = useMemo(() => {
    return computeSvgViewBox(containerSize.width, containerSize.height, zoom, pan);
  }, [containerSize.width, containerSize.height, zoom, pan.x, pan.y]);

  // Boundary constraints so user can never drag or pinch far away from the contents of the map
  const clampPan = (px: number, py: number, currentZoom: number) => {
    const container = containerRef.current;
    const w = container?.clientWidth || containerSizeRef.current.width || windowWidth;
    const h = container?.clientHeight || containerSizeRef.current.height || 600;

    // Keep at least a generous portion of the network within viewport, allowing full panning to edges on mobile
    const extraMobileX = isMobile ? w * 0.45 : w * 0.22;
    const extraMobileY = isMobile ? h * 0.35 : h * 0.22;
    const maxPanX = Math.max(80, (w * currentZoom - w) / 2 + extraMobileX);
    const maxPanY = Math.max(80, (h * currentZoom - h) / 2 + extraMobileY);

    return {
      x: Math.min(Math.max(px, -maxPanX), maxPanX),
      y: Math.min(Math.max(py, -maxPanY), maxPanY),
    };
  };

  // Animation frame coalescing: updates SVG viewBox directly on DOM node for zero-React-rerender 60-120fps
  const rafIdRef = useRef<number | null>(null);
  const pendingViewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const wheelSyncTimerRef = useRef<number | null>(null);

  const applyViewportDirect = (nextZoom: number, nextPan: { x: number; y: number }) => {
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    if (svgRef.current) {
      svgRef.current.setAttribute(
        'viewBox',
        computeSvgViewBox(containerSizeRef.current.width, containerSizeRef.current.height, nextZoom, nextPan)
      );
    }
  };

  const syncViewportToReact = () => {
    setZoom(zoomRef.current);
    setPan(panRef.current);
  };

  const scheduleViewportUpdate = (nextZoom: number, nextPan: { x: number; y: number }) => {
    // Update live refs immediately so rapid consecutive wheel/move events accumulate accurately
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    pendingViewportRef.current = { zoom: nextZoom, pan: nextPan };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingViewportRef.current) {
          applyViewportDirect(pendingViewportRef.current.zoom, pendingViewportRef.current.pan);
          pendingViewportRef.current = null;
        }
      });
    }
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (wheelSyncTimerRef.current !== null) {
        window.clearTimeout(wheelSyncTimerRef.current);
      }
    };
  }, []);

  // Zoom centered on the center of what is on your screen (or pointer focal point)
  const zoomToPoint = (
    nextZoomOrFn: number | ((prev: number) => number),
    focalPoint?: { x: number; y: number },
    immediateSync: boolean = true
  ) => {
    const prevZoom = zoomRef.current;
    const prevPan = panRef.current;
    const nextZoomRaw = typeof nextZoomOrFn === 'function' ? nextZoomOrFn(prevZoom) : nextZoomOrFn;
    const minZoom = 0.75;
    const maxZoom = 3.2;
    const nextZoom = Math.min(Math.max(nextZoomRaw, minZoom), maxZoom);

    if (nextZoom === prevZoom) return;

    const zoomRatio = nextZoom / prevZoom;
    const fx = focalPoint ? focalPoint.x : 0;
    const fy = focalPoint ? focalPoint.y : 0;
    const newX = prevPan.x * zoomRatio + fx * (1 - zoomRatio);
    const newY = prevPan.y * zoomRatio + fy * (1 - zoomRatio);
    const nextPan = clampPan(newX, newY, nextZoom);

    if (immediateSync) {
      applyViewportDirect(nextZoom, nextPan);
      setZoom(nextZoom);
      setPan(nextPan);
    } else {
      scheduleViewportUpdate(nextZoom, nextPan);
    }
  };

  // Touch handling for pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartFocalRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => {
    haptic.selection();
    zoomToPoint((prev) => prev + 0.25, undefined, true);
  };
  const handleZoomOut = () => {
    haptic.selection();
    zoomToPoint((prev) => prev - 0.25, undefined, true);
  };
  const handleReset = () => {
    haptic.medium();
    applyViewportDirect(1, { x: 0, y: 0 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setClickedStationId(null);
    setClickedLineId(null);
    setSelectedDisruption(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const focalX = e.clientX - rect.left - rect.width / 2;
      const focalY = e.clientY - rect.top - rect.height / 2;
      zoomToPoint((prev) => prev * factor, { x: focalX, y: focalY }, false);
    } else {
      zoomToPoint((prev) => prev * factor, undefined, false);
    }
    if (wheelSyncTimerRef.current !== null) {
      window.clearTimeout(wheelSyncTimerRef.current);
    }
    wheelSyncTimerRef.current = window.setTimeout(() => {
      syncViewportToReact();
    }, 150);
  };

  const isInteractiveUI = (target: EventTarget | null) => {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(target.closest('.info-window-sheet, .map-floating-ui, button, input, [role="button"], [role="dialog"]'));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isInfoCardDraggingRef.current || isInteractiveUI(e.target)) {
      isDraggingRef.current = false;
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isInfoCardDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    if (!isDraggingRef.current) return;
    scheduleViewportUpdate(
      zoomRef.current,
      clampPan(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y, zoomRef.current)
    );
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingViewportRef.current) {
      applyViewportDirect(pendingViewportRef.current.zoom, pendingViewportRef.current.pan);
      pendingViewportRef.current = null;
    }
    syncViewportToReact();
  };

  // Touch Events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isInfoCardDraggingRef.current || isInteractiveUI(e.target)) {
      isDraggingRef.current = false;
      return;
    }
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
      };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoomRef.current;
      touchStartPanRef.current = { ...panRef.current };
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchStartFocalRef.current = {
          x: midX - rect.left - rect.width / 2,
          y: midY - rect.top - rect.height / 2,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isInfoCardDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    if (e.touches.length === 1 && isDraggingRef.current) {
      scheduleViewportUpdate(
        zoomRef.current,
        clampPan(e.touches[0].clientX - dragStartRef.current.x, e.touches[0].clientY - dragStartRef.current.y, zoomRef.current)
      );
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const minZoom = isMobile ? 0.85 : 0.75;
      const maxZoom = 3.2;
      const nextZoom = Math.min(Math.max(touchStartZoomRef.current * scale, minZoom), maxZoom);

      const ratio = nextZoom / touchStartZoomRef.current;
      const focal = touchStartFocalRef.current || { x: 0, y: 0 };
      const startPan = touchStartPanRef.current;

      const container = containerRef.current;
      let currFocal = focal;
      if (container) {
        const rect = container.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        currFocal = {
          x: midX - rect.left - rect.width / 2,
          y: midY - rect.top - rect.height / 2,
        };
      }

      const newPanX = currFocal.x - ratio * (focal.x - startPan.x);
      const newPanY = currFocal.y - ratio * (focal.y - startPan.y);

      scheduleViewportUpdate(nextZoom, clampPan(newPanX, newPanY, nextZoom));
    }
  };

  const handleTouchEnd = () => {
    const wasPinching = touchStartDistRef.current !== null;
    if (!isDraggingRef.current && !wasPinching) return;
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingViewportRef.current) {
      applyViewportDirect(pendingViewportRef.current.zoom, pendingViewportRef.current.pan);
      pendingViewportRef.current = null;
    }
    syncViewportToReact();
  };

  const handleStationClick = (e: React.MouseEvent | React.TouchEvent, stationId: string) => {
    e.stopPropagation();
    haptic.light();
    setClickedStationId(stationId);
    setClickedLineId(null);
    // Open station info window expanded by default per user request
    setIsStationCardCollapsed(false);
    onSelectStation(stationId);
  };

  const handleLineClick = (e: React.MouseEvent | React.TouchEvent, lineId: LineId) => {
    e.stopPropagation();
    haptic.selection();
    setClickedLineId((prev) => (prev === lineId ? null : lineId));
    setClickedStationId(null);
    setSelectedDisruption(null);
    // Open line info window expanded by default per user request
    setIsLineCardCollapsed(false);
  };

  // Check if a station is on active journey
  const isStationOnRoute = (stId: string) => {
    if (!activeRoute) return false;
    return activeRoute.pathStationIds.includes(stId);
  };

  const isTransferStation = (stId: string) => {
    if (!activeRoute) return false;
    return activeRoute.transfers.some((t) => t.stationId === stId);
  };

  // Base background opacity when a route is active
  const baseLineOpacity = activeRoute ? 0.2 : 0.9;

  // Isochrone reachability computation for selected station
  const isochroneResult: IsochroneResult | null = useMemo(() => {
    if (!isochroneEnabled || !isochroneOriginId) return null;
    return computeStationIsochrone(
      isochroneOriginId,
      avoidDisruptions ? disruptions.filter((d) => d.isActive) : [],
      travelTimeOverrides
    );
  }, [isochroneEnabled, isochroneOriginId, avoidDisruptions, disruptions, travelTimeOverrides]);

  const isochroneMaxSeconds = isochroneResult?.maxTimeSeconds || 0;
  const effectiveIsochroneBudgetSeconds = isochroneResult
    ? Math.min(Math.max(0, isochroneBudgetSeconds), isochroneMaxSeconds)
    : 0;

  const reachableStationSet = useMemo(() => {
    const set = new Set<string>();
    if (!isochroneResult) return set;
    Object.entries(isochroneResult.stationTimes).forEach(([stId, sec]) => {
      if (sec <= effectiveIsochroneBudgetSeconds) {
        set.add(stId);
      }
    });
    return set;
  }, [isochroneResult, effectiveIsochroneBudgetSeconds]);

  const reachableIsochroneEdges = useMemo(() => {
    if (!isochroneResult) return [];
    return isochroneResult.edges
      .filter((edge) => edge.arrivalSeconds <= effectiveIsochroneBudgetSeconds)
      .map((edge) => ({
        ...edge,
        pathD: buildLegTrackPath(edge.lineId, [edge.fromStationId, edge.toStationId]),
        color: getIsochroneTierColor(edge.arrivalSeconds),
      }))
      .filter((item) => Boolean(item.pathD));
  }, [isochroneResult, effectiveIsochroneBudgetSeconds]);

  const handleToggleIsochroneForStation = (stationId: string) => {
    haptic.medium();
    if (isochroneEnabled && isochroneOriginId === stationId) {
      setIsochroneEnabled(false);
    } else {
      const preview = computeStationIsochrone(
        stationId,
        avoidDisruptions ? disruptions.filter((d) => d.isActive) : [],
        travelTimeOverrides
      );
      setIsochroneOriginId(stationId);
      setIsochroneEnabled(true);
      setIsochroneBudgetSeconds((prev) => {
        if (preview.maxTimeSeconds <= 0) return 0;
        const clamped = Math.min(Math.max(prev, 300), preview.maxTimeSeconds);
        return prev === 0 ? Math.min(600, preview.maxTimeSeconds) : clamped;
      });
    }
  };

  // Highlight lines passing through the clicked station (or active route or clickedLineId)
  const isLineHighlighted = (lineId: string) => {
    if (isochroneEnabled && isochroneResult) {
      return false;
    }
    if (clickedLineId) {
      return clickedLineId === lineId;
    }
    if (clickedStationId) {
      const st = STATIONS[clickedStationId];
      return st ? st.lines.includes(lineId) : false;
    }
    if (activeRoute) {
      return activeRoute.linesUsed.includes(lineId);
    }
    return false;
  };

  const getLineOpacity = (lineId: string, base: number = baseLineOpacity) => {
    if (clickedLineId) {
      return clickedLineId === lineId ? 1 : 0.08;
    }
    if (isochroneEnabled && isochroneResult) {
      return 0.14;
    }
    if (clickedStationId) {
      const st = STATIONS[clickedStationId];
      if (st && st.lines.includes(lineId)) {
        return 1;
      }
      return 0.12;
    }
    if (activeRoute) {
      return activeRoute.linesUsed.includes(lineId) ? 1 : 0.2;
    }
    if (activeLineFilter !== 'ALL') {
      return activeLineFilter === lineId ? 1 : 0.08;
    }
    return base;
  };

  const clickedStation = clickedStationId ? STATIONS[clickedStationId] : null;

  // Memoize disruptions for clicked station & line to avoid re-filtering during drag/zoom frames
  const clickedStationDisruptions = useMemo(() => {
    if (!clickedStation) return [];
    return disruptions.filter(
      (d) =>
        d.isActive &&
        (d.fromStationId === clickedStation.id ||
          d.toStationId === clickedStation.id ||
          (d.affectedStations && d.affectedStations.includes(clickedStation.id)) ||
          clickedStation.lines.includes(d.lineId))
    );
  }, [clickedStation, disruptions]);

  const clickedLineDisruptions = useMemo(() => {
    if (!clickedLine) return [];
    return disruptions.filter((d) => d.isActive && d.lineId === clickedLine.id);
  }, [clickedLine, disruptions]);

  const matchingStations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return Object.values(STATIONS)
      .filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.id.toLowerCase().includes(q) ||
          st.lines.some((l) => l.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searchQuery]);

  // Filter stations to show based on showMetroLayer and showICLayer, or if on active journey / isochrone
  const visibleStations = useMemo(() => {
    const isICLine = (l: string) =>
      l.startsWith('IC') ||
      ['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(l);
    return Object.values(STATIONS).filter((st) => {
      if (activeRoute && activeRoute.pathStationIds.includes(st.id)) return true;
      if (isochroneEnabled && isochroneResult && (reachableStationSet.has(st.id) || st.id === isochroneOriginId)) {
        return true;
      }
      if (st.id === 'kuhl-town') return true;
      const hasMetro = st.lines.some((l) => !isICLine(l));
      const hasIC = st.lines.some(isICLine);

      if (showMetroLayer && showICLayer) return true;
      if (showMetroLayer && !showICLayer) return hasMetro;
      if (!showMetroLayer && showICLayer) return hasIC;
      return false;
    });
  }, [activeRoute, showMetroLayer, showICLayer, isochroneEnabled, isochroneResult, reachableStationSet, isochroneOriginId]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[480px] overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        setClickedStationId(null);
        setClickedLineId(null);
        setSelectedDisruption(null);
      }}
    >
      {/* Background transit grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${theme === 'dark' ? '#ffffff' : '#000000'} 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Map Controls */}
      <div className="map-floating-ui absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col gap-1.5 sm:gap-2.5 items-end">
        {/* Card 1: Zoom & Reset */}
        <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden p-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-xl transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 my-0.5" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-xl transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 my-0.5" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-xl transition"
            title={t.resetView}
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Card 2: Layers & Legend (Structured Card to prevent any button overlap) */}
        <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden p-1">
          {/* Metro Network Layer Toggle */}
          {onToggleMetroLayer && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.stopPropagation();
                haptic.light();
                onToggleMetroLayer();
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition flex items-center justify-center ${
                showMetroLayer
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={showMetroLayer ? t.metroLayerOn : t.metroLayerOff}
            >
              <TrainFront className="w-4 h-4" />
            </motion.button>
          )}

          <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 my-0.5" />

          {/* IC Train Layer Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              haptic.light();
              onToggleICLayer();
            }}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition flex items-center justify-center ${
              showICLayer
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={showICLayer ? t.icLayerOn : t.icLayerOff}
          >
            <Train className="w-4 h-4" />
          </motion.button>

          <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 my-0.5" />

          {/* Legend / Info Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              haptic.selection();
              setShowLegend(!showLegend);
            }}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition flex items-center justify-center ${
              showLegend
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t.symbolExplanation}
          >
            <Info className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Top-Left Search Bar & Network Header Overlay */}
      <div className="map-floating-ui absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-col gap-2 max-w-[270px] sm:max-w-xs w-full pointer-events-auto">
        {/* Station Search Input */}
        <div className="relative flex items-center bg-white/[0.97] dark:bg-slate-900/[0.97] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/50">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchingStations.length > 0) {
                const target = matchingStations[0];
                haptic.selection();
                setClickedStationId(target.id);
                setIsStationCardCollapsed(false);
                onSelectStation(target.id);
                setSearchQuery('');
                setIsSearchFocused(false);
                const targetZoom = Math.max(zoomRef.current, 1.45);
                const baseScale = Math.min(containerSizeRef.current.width / BASE_MAP_W, containerSizeRef.current.height / BASE_MAP_H) || 1;
                const effectiveScale = baseScale * targetZoom;
                const targetCenterX = isMobile ? 550 : MAP_CENTER_X;
                const targetCenterY = MAP_CENTER_Y;
                const nextPan = clampPan(- (target.x - targetCenterX) * effectiveScale, - (target.y - targetCenterY) * effectiveScale, targetZoom);
                applyViewportDirect(targetZoom, nextPan);
                setZoom(targetZoom);
                setPan(nextPan);
              } else if (e.key === 'Escape') {
                setIsSearchFocused(false);
              }
            }}
            placeholder={language === 'de' ? 'Station suchen & hervorheben...' : 'Search & highlight station...'}
            className="bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none w-full font-medium"
            onClick={(e) => e.stopPropagation()}
          />
          {searchQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 ml-1 transition"
              title="Löschen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {isSearchFocused && matchingStations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="bg-white/[0.97] dark:bg-slate-900/[0.97] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 space-y-1 overflow-hidden max-h-60 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {matchingStations.map((station) => (
                <button
                  key={station.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.selection();
                    setClickedStationId(station.id);
                    setIsStationCardCollapsed(false);
                    onSelectStation(station.id);
                    setSearchQuery('');
                    setIsSearchFocused(false);
                    // Center smoothly on selected station
                    const targetZoom = Math.max(zoomRef.current, 1.45);
                    const baseScale = Math.min(containerSizeRef.current.width / BASE_MAP_W, containerSizeRef.current.height / BASE_MAP_H) || 1;
                    const effectiveScale = baseScale * targetZoom;
                    const targetCenterX = isMobile ? 550 : MAP_CENTER_X;
                    const targetCenterY = MAP_CENTER_Y;
                    const nextPan = clampPan(- (station.x - targetCenterX) * effectiveScale, - (station.y - targetCenterY) * effectiveScale, targetZoom);
                    applyViewportDirect(targetZoom, nextPan);
                    setZoom(targetZoom);
                    setPan(nextPan);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {station.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        {station.hasAirport && <span>✈</span>}
                        {station.hasIC && <span>🚆</span>}
                        {station.isAccessible && <span>♿</span>}
                        <span>{station.lines.length} {language === 'de' ? 'Linien' : 'lines'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {station.lines.slice(0, 3).map((lId) => (
                      <span
                        key={lId}
                        className="px-1 py-0.5 rounded text-[8px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color || '#475569' }}
                      >
                        {METRO_LINES[lId]?.badge || lId}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Header Overlay Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          <div className="text-[9px] sm:text-[10px] tracking-wider uppercase text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between">
            <span>ÄÄPIZRM 044</span>
            {clickedStation && (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold truncate ml-1">
                ● {clickedStation.name}
              </span>
            )}
            {clickedLine && (
              <span className="text-[9px] font-semibold truncate ml-1" style={{ color: clickedLine.color }}>
                ● {clickedLine.badge}
              </span>
            )}
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wide truncate">
            {t.map} {showMetroLayer && showICLayer ? '(U-Bahn + IC)' : showMetroLayer ? '(U-Bahn)' : showICLayer ? '(IC-Züge)' : ''}
          </h2>
          <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5 flex-wrap">
            <span>
              {isochroneEnabled && isochroneOriginId
                ? `${t.exploreNearbyTitle}: ${STATIONS[isochroneOriginId]?.name} (≤ ${formatSecondsVerbose(effectiveIsochroneBudgetSeconds)})`
                : clickedLine
                ? (language === 'de' ? `Linie ${clickedLine.badge} hervorgehoben` : `Line ${clickedLine.badge} highlighted`)
                : clickedStation
                ? (language === 'de' ? `Linien an ${clickedStation.name} hervorgehoben` : `Lines at ${clickedStation.name} highlighted`)
                : activeRoute
                ? (language === 'de' ? 'Aktive Verbindung hervorgehoben' : 'Active route highlighted')
                : (language === 'de' ? 'Gesamtnetz' : 'Full network')}
            </span>
            {isochroneEnabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  setIsochroneEnabled(false);
                }}
                className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
              >
                <span>{t.closeIsochrone}</span>
              </button>
            )}
            {(clickedStation || clickedLine) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  setClickedStationId(null);
                  setClickedLineId(null);
                }}
                className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
              >
                <span>{language === 'de' ? 'Alle anzeigen' : 'Show all'}</span>
              </button>
            )}
            {activeRoute && onResetRoute && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.light();
                  onResetRoute();
                  setClickedStationId(null);
                }}
                className="text-[9px] sm:text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
                title={language === 'de' ? 'Route zurücksetzen' : 'Reset route'}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>{language === 'de' ? 'Zurücksetzen' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend Drawer / Popover */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 left-3 right-3 sm:left-auto sm:right-4 sm:w-72 z-30 bg-white/[0.97] dark:bg-slate-900/[0.97] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xl text-xs text-slate-700 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
            <span>{t.symbolExplanation}</span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base px-1"
            >
              ×
            </button>
          </div>
          <div className="space-y-2.5 mt-3">
            {/* Classification from official diagram (IMG_8215) */}
            <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[11px] space-y-1.5">
              <div className="font-bold text-blue-900 dark:text-blue-300">
                {language === 'de' ? 'Offizieller U-Bahn-Plan:' : 'Official Transit Map:'}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {language === 'de' ? 'Einfarbig: U-Bahn Linien' : 'Solid: Metro Lines'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1.5 rounded-full border border-black bg-white shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {language === 'de' ? 'Gestreift: IC-Linien (Express)' : 'Striped: IC Train Lines'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 border-b-2 border-dashed border-slate-900 dark:border-white shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  {language === 'de' ? 'Gestrichelt: Zukunft / In Planung' : 'Dashed: Future / Planned'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-base">✈</span>
              <span>{t.airport}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚆</span>
              <span>{t.icTrains} (Umstieg)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base">♿</span>
              <span>{t.accessible}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-black bg-white shrink-0" />
              <span>{language === 'de' ? 'Knotenpunkt / Umsteigebahnhof' : 'Transfer Station'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-sm border-2 border-black bg-white flex items-center justify-center text-[8px] font-bold shrink-0">
                ×
              </div>
              <span>Carls Hotel (Schlosshotel)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-black shrink-0" />
              <span>Kuhl Town</span>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main SVG Vector Canvas - High Resolution Dynamic ViewBox */}
      <svg
        ref={svgRef}
        viewBox={svgViewBox}
        className="w-full h-full origin-center select-none"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        textRendering="optimizeSpeed"
      >
        <defs>
          {highlightGlowEnabled && (
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={3.5} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}

          {/* Railway tie pattern for IC Train tracks */}
          <pattern id="railPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="0" stroke="#000000" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Transparent canvas click target to dismiss selection when clicking empty space */}
        <rect
          x="-500"
          y="-500"
          width="2020"
          height="1720"
          fill="transparent"
          className="cursor-default"
          onClick={() => {
            setClickedStationId(null);
            setClickedLineId(null);
            setSelectedDisruption(null);
          }}
        />

        {/* ----------------- WATERWAY: SOUTH CANAL / RIVER ----------------- */}
        <path
          d="
            M 315 362
            L 415 362
            Q 438 362, 438 388
            L 438 395
            Q 438 405, 465 405
            L 500 405
            Q 525 405, 545 385
            L 560 375
            L 665 375
          "
          fill="none"
          stroke={theme === 'dark' ? '#1E3A5F' : '#CFE7F5'}
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={theme === 'dark' ? 0.45 : 0.95}
          className="pointer-events-none"
        />

        {/* ----------------- BASE METRO LINES (BACKGROUND) ----------------- */}
        {(showMetroLayer || isochroneEnabled || (activeRoute && activeRoute.linesUsed.some((l) => !l.startsWith('IC') && !['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(l))) || (clickedStation && clickedStation.lines.some((l) => !l.startsWith('IC') && !['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(l))) || (clickedLineId && !clickedLineId.startsWith('IC') && !['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(clickedLineId))) && (
          <g id="metro-train-layer" className="transition-opacity duration-300">
            {/* 1. GREEN LINE (U-Grün / U1) - Villen Viertel Nord ↔ Daniel Tower ↔ Strand ↔ Traphgon Airport */}
            <g
              id="line-group-U-Grün"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Grün')}
            >
              <path
                d="
                  M 505 175
                  L 340 175
                  L 340 335
                  L 340 518
                  L 340 568
                  L 405 568
                  L 405 532
                  L 455 532
                  L 455 604
                  L 405 604
                  L 405 678
                  L 515 678
                  L 635 678
                  L 755 678
                  L 830 678
                  L 830 642
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 505 175
                  L 340 175
                  L 340 335
                  L 340 518
                  L 340 568
                  L 405 568
                  L 405 532
                  L 455 532
                  L 455 604
                  L 405 604
                  L 405 678
                  L 515 678
                  L 635 678
                  L 755 678
                  L 830 678
                  L 830 642
                "
                fill="none"
                stroke={METRO_LINES['U-Grün'].color}
                strokeWidth={isLineHighlighted('U-Grün') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Grün')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Grün') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

            {/* 2. RED LINE (U-Rot / U2) - North End ↔ Daniel Tower ↔ Gare du Nord ↔ Mosslands Explorers */}
            <g
              id="line-group-U-Rot"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Rot')}
            >
              <path
                d="
                  M 405 280
                  L 346 280
                  L 346 335
                  L 346 388
                  L 405 388
                  L 405 415
                  L 370 415
                  L 370 445
                  L 455 445
                  L 520 445
                  L 570 445
                  L 570 410
                  L 570 400
                  L 635 400
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 405 280
                  L 346 280
                  L 346 335
                  L 346 388
                  L 405 388
                  L 405 415
                  L 370 415
                  L 370 445
                  L 455 445
                  L 520 445
                  L 570 445
                  L 570 410
                  L 570 400
                  L 635 400
                "
                fill="none"
                stroke={METRO_LINES['U-Rot'].color}
                strokeWidth={isLineHighlighted('U-Rot') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Rot')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Rot') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

            {/* 3. ORANGE LINE (U-Orange / U4) - Daniel Tower ↔ South Canal Quarter ↔ City Center */}
            <g
              id="line-group-U-Orange"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Orange')}
            >
              <path
                d="
                  M 340 335
                  L 485 335
                  L 485 346
                  L 505 346
                  L 570 346
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 340 335
                  L 485 335
                  L 485 346
                  L 505 346
                  L 570 346
                "
                fill="none"
                stroke={METRO_LINES['U-Orange'].color}
                strokeWidth={isLineHighlighted('U-Orange') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Orange')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Orange') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

            {/* 4. TIM TRAIN (Lila) - North End ↔ Squishmallow City ↔ City Center ↔ Dog Care */}
            <g
              id="line-group-Tim-Train"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'Tim-Train')}
            >
              <path
                d="
                  M 405 280
                  L 505 280
                  L 516 280
                  L 516 338
                  L 570 338
                  L 570 352
                  L 625 352
                  L 670 352
                  L 715 352
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 405 280
                  L 505 280
                  L 516 280
                  L 516 338
                  L 570 338
                  L 570 352
                  L 625 352
                  L 670 352
                  L 715 352
                "
                fill="none"
                stroke={METRO_LINES['Tim-Train'].color}
                strokeWidth={isLineHighlighted('Tim-Train') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('Tim-Train')}
                filter={highlightGlowEnabled && isLineHighlighted('Tim-Train') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

            {/* 5. BLACK LINE (U-Schwarz / U3) - City Center ↔ Gare du Nord ↔ Central Station ↔ Traphgon Airport */}
            <g
              id="line-group-U-Schwarz"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Schwarz')}
            >
              <path
                d="
                  M 570 352
                  L 505 352
                  L 455 352
                  L 455 370
                  L 455 445
                  L 455 532
                  L 455 568
                  L 635 568
                  L 824 568
                  L 824 642
                  L 830 642
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 570 352
                  L 505 352
                  L 455 352
                  L 455 370
                  L 455 445
                  L 455 532
                  L 455 568
                  L 635 568
                  L 824 568
                  L 824 642
                  L 830 642
                "
                fill="none"
                stroke={theme === 'dark' ? '#E2E8F0' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Schwarz') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Schwarz')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Schwarz') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

            {/* 6. LIME GREEN LINE (U-Hellgrün / U6) - Lake Road ↔ Gare du Nord ↔ Place de La Geigèr */}
            <g
              id="line-group-U-Hellgrün"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Hellgrün')}
            >
              <path
                d="
                  M 395 486
                  L 395 451
                  L 455 451
                  L 485 451
                  L 485 486
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 395 486
                  L 395 451
                  L 455 451
                  L 485 451
                  L 485 486
                "
                fill="none"
                stroke={METRO_LINES['U-Hellgrün'].color}
                strokeWidth={isLineHighlighted('U-Hellgrün') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Hellgrün')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Hellgrün') ? 'url(#routeGlow)' : undefined}
                className="transition-opacity duration-200"
              />
            </g>

          </g>
        )}

        {/* ----------------- INTER CITY TRAINS (IC-ZÜGE) LAYER (Gestreifte Linien) ----------------- */}
        {(showICLayer || isochroneEnabled || (activeRoute && activeRoute.linesUsed.some((l) => l.startsWith('IC') || ['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(l))) || (clickedStation && clickedStation.lines.some((l) => l.startsWith('IC') || ['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(l))) || (clickedLineId && (clickedLineId.startsWith('IC') || ['U-Türkis', 'U-Pink', 'U-Dunkelblau', 'U-Hellblau', 'U-Violett'].includes(clickedLineId)))) && (
          <g id="ic-train-layer" className="transition-opacity duration-300">
            {/* IC Nordwest: Blue Lagoon / Willow Creek ↔ Villen Viertel West ↔ Gare du Nord */}
            <g
              id="line-group-IC-Nordwest"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'IC-Nordwest')}
            >
              <path
                d="
                  M 340 25
                  L 340 175
                  M 245 105
                  L 340 105
                  M 340 175
                  L 340 182
                  L 468 182
                  L 468 438
                  L 455 438
                  L 455 445
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 340 25
                  L 340 175
                  M 245 105
                  L 340 105
                  M 340 175
                  L 340 182
                  L 468 182
                  L 468 438
                  L 455 438
                  L 455 445
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('IC-Nordwest') ? 8.5 : 7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-Nordwest')}
                filter={highlightGlowEnabled && isLineHighlighted('IC-Nordwest') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 340 25
                  L 340 175
                  M 245 105
                  L 340 105
                  M 340 175
                  L 340 182
                  L 468 182
                  L 468 438
                  L 455 438
                  L 455 445
                "
                fill="none"
                stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-Nordwest')}
              />
            </g>

            {/* IC Stonebrook: Stonebrook ↔ Gare du Nord */}
            <g
              id="line-group-IC-Stonebrook"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'IC-Stonebrook')}
            >
              <path
                d="
                  M 195 425
                  L 440 425
                  L 440 445
                  L 455 445
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 195 425
                  L 440 425
                  L 440 445
                  L 455 445
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('IC-Stonebrook') ? 8.5 : 7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-Stonebrook')}
                filter={highlightGlowEnabled && isLineHighlighted('IC-Stonebrook') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 195 425
                  L 440 425
                  L 440 445
                  L 455 445
                "
                fill="none"
                stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-Stonebrook')}
              />
            </g>

            {/* IC 8 / U-Pink: Gare du Nord ↔ Coral Bay */}
            <g
              id="line-group-U-Pink"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Pink')}
            >
              <path
                d="
                  M 455 445
                  L 468 445
                  L 468 428
                  L 830 428
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 445
                  L 468 445
                  L 468 428
                  L 830 428
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Pink') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Pink')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Pink') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 445
                  L 468 445
                  L 468 428
                  L 830 428
                "
                fill="none"
                stroke="#EC4899"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Pink')}
              />
            </g>

            {/* IC 7 / U-Türkis: Gare du Nord ↔ Zoo ↔ Tinnifer Aquatic Center */}
            <g
              id="line-group-U-Türkis"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Türkis')}
            >
              <path
                d="
                  M 455 445
                  L 485 445
                  L 485 460
                  L 635 460
                  L 715 460
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 445
                  L 485 445
                  L 485 460
                  L 635 460
                  L 715 460
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Türkis') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Türkis')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Türkis') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 445
                  L 485 445
                  L 485 460
                  L 635 460
                  L 715 460
                "
                fill="none"
                stroke="#0F766E"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Türkis')}
              />
            </g>

            {/* IC Camp Carl Nord (Line 1): Gare du Nord ↔ Camp Carl */}
            <g
              id="line-group-IC-CampCarl-Nord"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'IC-CampCarl-Nord')}
            >
              <path
                d="
                  M 455 448
                  L 472 448
                  L 472 510
                  L 640 510
                  L 640 515
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 448
                  L 472 448
                  L 472 510
                  L 640 510
                  L 640 515
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('IC-CampCarl-Nord') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-CampCarl-Nord')}
                filter={highlightGlowEnabled && isLineHighlighted('IC-CampCarl-Nord') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 448
                  L 472 448
                  L 472 510
                  L 640 510
                  L 640 515
                "
                fill="none"
                stroke="#EAB308"
                strokeWidth="3.2"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-CampCarl-Nord')}
              />
            </g>

            {/* IC Camp Carl Central (Line 2): Central Station ↔ Camp Carl */}
            <g
              id="line-group-IC-CampCarl-Central"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'IC-CampCarl-Central')}
            >
              <path
                d="
                  M 455 532
                  L 480 532
                  L 480 520
                  L 640 520
                  L 640 515
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 532
                  L 480 532
                  L 480 520
                  L 640 520
                  L 640 515
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('IC-CampCarl-Central') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-CampCarl-Central')}
                filter={highlightGlowEnabled && isLineHighlighted('IC-CampCarl-Central') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 532
                  L 480 532
                  L 480 520
                  L 640 520
                  L 640 515
                "
                fill="none"
                stroke="#CA8A04"
                strokeWidth="3.2"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('IC-CampCarl-Central')}
              />
            </g>

            {/* IC 10 / U-Dunkelblau: Central Station ↔ Rathaus ↔ Jurassic Park ↔ Carls Hotel */}
            <g
              id="line-group-U-Dunkelblau"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Dunkelblau')}
            >
              <path
                d="
                  M 455 532
                  L 455 550
                  L 195 550
                  L 45 550
                  L 45 608
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 532
                  L 455 550
                  L 195 550
                  L 45 550
                  L 45 608
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Dunkelblau') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Dunkelblau')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Dunkelblau') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 532
                  L 455 550
                  L 195 550
                  L 45 550
                  L 45 608
                "
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Dunkelblau')}
              />
            </g>

            {/* IC 11 / U-Hellblau: Gare du Nord ↔ Stadium (Retow) ↔ Retow (Terminus) */}
            <g
              id="line-group-U-Hellblau"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Hellblau')}
            >
              <path
                d="
                  M 455 445
                  L 440 445
                  L 440 465
                  L 245 465
                  L 245 624
                  L 195 624
                  L 110 624
                  L 110 678
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 455 445
                  L 440 445
                  L 440 465
                  L 245 465
                  L 245 624
                  L 195 624
                  L 110 624
                  L 110 678
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Hellblau') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Hellblau')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Hellblau') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 455 445
                  L 440 445
                  L 440 465
                  L 245 465
                  L 245 624
                  L 195 624
                  L 110 624
                  L 110 678
                "
                fill="none"
                stroke="#06B6D4"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Hellblau')}
              />
            </g>

            {/* IC 12 / U-Violett: Retow (Terminus) ↔ Sonnenaufgangsstraße ↔ Central Station */}
            <g
              id="line-group-U-Violett"
              className="cursor-pointer"
              onClick={(e) => handleLineClick(e, 'U-Violett')}
            >
              <path
                d="
                  M 110 678
                  L 195 678
                  L 250 678
                  L 250 576
                  L 455 576
                  L 455 532
                "
                fill="none"
                stroke="transparent"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="
                  M 110 678
                  L 195 678
                  L 250 678
                  L 250 576
                  L 455 576
                  L 455 532
                "
                fill="none"
                stroke={theme === 'dark' ? '#CBD5E1' : '#18181B'}
                strokeWidth={isLineHighlighted('U-Violett') ? 8.5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Violett')}
                filter={highlightGlowEnabled && isLineHighlighted('U-Violett') ? 'url(#routeGlow)' : undefined}
              />
              <path
                d="
                  M 110 678
                  L 195 678
                  L 250 678
                  L 250 576
                  L 455 576
                  L 455 532
                "
                fill="none"
                stroke="#7C3AED"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={getLineOpacity('U-Violett')}
              />
            </g>
          </g>
        )}

        {/* ----------------- IN PLANUNG / ZUKUNFT (Gestrichelte Linien) ----------------- */}
        <g id="planned-lines-layer" className="transition-opacity duration-300">
          {/* Plan-Traphgon-T3: Gare du Nord ↔ Traphgon Airport ↔ Terminal 3 / Fernbahnhof */}
          <g
            id="line-group-Plan-Traphgon-T3"
            className="cursor-pointer"
            onClick={(e) => handleLineClick(e, 'Plan-Traphgon-T3')}
          >
            <path
              d="
                M 455 445
                L 470 445
                L 470 452
                L 842 452
                L 842 642
                L 830 642
                M 842 642
                L 905 642
              "
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="
                M 455 445
                L 470 445
                L 470 452
                L 842 452
                L 842 642
                L 830 642
                M 842 642
                L 905 642
              "
              fill="none"
              stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={getLineOpacity('Plan-Traphgon-T3')}
            />
            <path
              d="
                M 455 445
                L 470 445
                L 470 452
                L 842 452
                L 842 642
                L 830 642
                M 842 642
                L 905 642
              "
              fill="none"
              stroke={theme === 'dark' ? '#E2E8F0' : '#18181B'}
              strokeWidth={isLineHighlighted('Plan-Traphgon-T3') ? 5 : 3.5}
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={getLineOpacity('Plan-Traphgon-T3')}
              filter={highlightGlowEnabled && isLineHighlighted('Plan-Traphgon-T3') ? 'url(#routeGlow)' : undefined}
            />
          </g>
        </g>

        {/* ----------------- ISOCHRONE REACHABLE ROUTES & ORIGIN PULSE ----------------- */}
        {isochroneEnabled && isochroneResult && (
          <g id="isochrone-routes-layer" style={{ pointerEvents: 'none' }}>
            {reachableIsochroneEdges.map((edge, idx) => (
              <React.Fragment key={`iso-edge-${edge.fromStationId}-${edge.toStationId}-${edge.lineId}-${idx}`}>
                <path
                  d={edge.pathD}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={highlightGlowEnabled ? '0.38' : '0.2'}
                  filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
                />
                <path
                  d={edge.pathD}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              </React.Fragment>
            ))}

            {isochroneOriginId && STATIONS[isochroneOriginId] && (
              <g>
                <circle
                  cx={STATIONS[isochroneOriginId].x}
                  cy={STATIONS[isochroneOriginId].y}
                  r="19"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-ping"
                  style={{
                    transformOrigin: `${STATIONS[isochroneOriginId].x}px ${STATIONS[isochroneOriginId].y}px`,
                  }}
                />
                <circle
                  cx={STATIONS[isochroneOriginId].x}
                  cy={STATIONS[isochroneOriginId].y}
                  r="15"
                  fill="#10B981"
                  fillOpacity="0.18"
                  stroke="#10B981"
                  strokeWidth="3"
                />
              </g>
            )}
          </g>
        )}

        {/* ----------------- ACTIVE JOURNEY HIGHLIGHT (ONLY THE TRAVELED PATH) ----------------- */}
        {/* Strictly follows the exact geometric lines as presented on the map (rectangular, zero diagonal shortcuts) */}
        {activeRoute && (
          <g id="active-journey-highlight">
            {activeRoute.legs.map((leg, legIdx) => {
              const line = METRO_LINES[leg.lineId];
              const pathD = buildLegTrackPath(leg.lineId, leg.stations);
              if (!pathD) return null;

              return (
                <React.Fragment key={`active-leg-${legIdx}`}>
                  {/* Soft wide glowing halo in line color */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={line?.color || '#38BDF8'}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={highlightGlowEnabled ? '0.45' : '0.26'}
                    filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
                  />
                  {/* Solid crisp underlay track in line color */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={line?.color || '#38BDF8'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                  {/* Crisp animated center stroke with GPU-accelerated smooth flow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="9 7"
                    className="route-flow-line"
                  />
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* ----------------- ACTIVE RIDE LIVE SEGMENT HIGHLIGHT ----------------- */}
        {activeRide && activeRide.steps.length > 0 && (() => {
          const curStep = activeRide.steps[activeRide.currentStepIndex];
          const nextStep = activeRide.steps[activeRide.currentStepIndex + 1];
          const curStation = curStep ? STATIONS[curStep.stationId] : null;
          const nextStation = nextStep ? STATIONS[nextStep.stationId] : null;
          const segLineId = curStep && nextStep
            ? (curStep.isTransferArrival && curStep.transferToLineId ? curStep.transferToLineId : nextStep.lineId)
            : curStep?.lineId;
          const segPathD =
            curStep && nextStep && segLineId
              ? buildLegTrackPath(segLineId, [curStep.stationId, nextStep.stationId])
              : '';

          return (
            <g id="active-ride-current-segment" style={{ pointerEvents: 'none' }}>
              {segPathD && (
                <>
                  <path
                    d={segPathD}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={highlightGlowEnabled ? '0.55' : '0.35'}
                    filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
                  />
                  <path
                    d={segPathD}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={segPathD}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 6"
                    className="route-flow-line"
                  />
                </>
              )}

              {curStation && (
                <g>
                  <circle
                    cx={curStation.x}
                    cy={curStation.y}
                    r="16"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    opacity="0.7"
                    className="animate-ping"
                    style={{ transformOrigin: `${curStation.x}px ${curStation.y}px` }}
                  />
                  <circle
                    cx={curStation.x}
                    cy={curStation.y}
                    r="12"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3.5"
                  />
                </g>
              )}

              {nextStation && (
                <circle
                  cx={nextStation.x}
                  cy={nextStation.y}
                  r="11"
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
              )}
            </g>
          );
        })()}

        {/* ----------------- STATION NODES ----------------- */}
        {visibleStations.map((station) => {
          const isOrigin = selectedOriginId === station.id;
          const isDest = selectedDestinationId === station.id;
          const stopoverPositions = effectiveStopoverIds.reduce<number[]>((acc, sId, idx) => {
            if (sId === station.id) acc.push(idx + 1);
            return acc;
          }, []);
          const isStopover = stopoverPositions.length > 0;
          const isTransfer = isTransferStation(station.id);
          const isOnRoute = isStationOnRoute(station.id);
          const isHovered = hoveredStationId === station.id;
          const isClicked = clickedStationId === station.id;

          const isIsoMode = Boolean(isochroneEnabled && isochroneResult);
          const isIsoOrigin = isIsoMode && isochroneOriginId === station.id;
          const isoTimeSeconds = isIsoMode ? isochroneResult!.stationTimes[station.id] : undefined;
          const isIsoReachable =
            isIsoMode &&
            isoTimeSeconds !== undefined &&
            isoTimeSeconds <= effectiveIsochroneBudgetSeconds;
          const isoColor = isIsoReachable && isoTimeSeconds !== undefined ? getIsochroneTierColor(isoTimeSeconds) : null;

          const nodeOpacity = clickedLineId
            ? station.lines.includes(clickedLineId)
              ? 1
              : 0.18
            : isIsoMode
            ? isIsoReachable || isIsoOrigin || isClicked
              ? 1
              : 0.18
            : activeRoute
            ? isOnRoute
              ? 1
              : 0.35
            : 1;

          // Double-ring major interchange stations from IMG_8214
          const isDoubleRingStation = [
            'villen-viertel-west',
            'north-end',
            'daniel-tower',
            'south-canal-quarter',
            'city-center',
            'gare-du-nord',
            'central-station',
            'camp-carl',
            'coral-bay',
            'traphgon-airp',
            'traphgon-fern-t3',
            'retow-terminus',
          ].includes(station.id);

          // Terminal perpendicular end-bar stations from IMG_8214
          const isTerminalBarStation = [
            'blue-lagoon',
            'willow-creek',
            'villen-viertel-nord',
            'dog-care',
            'mosslands-explorers',
            'stonebrook',
            'tinnifer-aquatic-center',
            'stadium-retow',
            'strand',
          ].includes(station.id);

          const isCarlsHotel = station.id === 'carls-hotel';
          const isKuhlTown = station.id === 'kuhl-town';

          const isSearchMatch =
            searchQuery.trim().length > 1 && matchingStations.some((m) => m.id === station.id);

          return (
            <g
              key={station.id}
              className="cursor-pointer group"
              style={{ opacity: nodeOpacity }}
              onClick={(e) => handleStationClick(e, station.id)}
              onMouseEnter={() => {
                if (!isDraggingRef.current) setHoveredStationId(station.id);
              }}
              onMouseLeave={() => {
                if (!isDraggingRef.current) setHoveredStationId(null);
              }}
            >
              {/* Isochrone Reachable Station Ring & Time Badge */}
              {isIsoReachable && isoColor && !isIsoOrigin && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={12}
                    fill={isoColor}
                    fillOpacity={highlightGlowEnabled ? '0.28' : '0.16'}
                    stroke={isoColor}
                    strokeWidth="2.5"
                    filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
                  />
                  {isoTimeSeconds !== undefined && (
                    <g transform={`translate(${station.x + 12}, ${station.y - 11})`}>
                      <rect
                        x="-12"
                        y="-6"
                        width="24"
                        height="12"
                        rx="4"
                        fill={isoColor}
                        stroke={theme === 'dark' ? '#020617' : '#FFFFFF'}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fontSize="7"
                        fontWeight="800"
                        fill="#FFFFFF"
                        className="select-none pointer-events-none font-sans"
                      >
                        {formatSecondsCompactBadge(isoTimeSeconds)}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Highlight Halo for Selected / Active Journey Nodes / Search Matches */}
              {(isOrigin || isDest || isStopover || isClicked || isHovered || isSearchMatch) && (
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={isOrigin || isDest || isStopover ? 15 : 12}
                  fill={
                    highlightGlowEnabled
                      ? isOrigin
                        ? '#10B981'
                        : isDest
                        ? '#EF4444'
                        : isStopover
                        ? '#38BDF8'
                        : isClicked
                        ? '#38BDF8'
                        : '#F59E0B'
                      : 'none'
                  }
                  fillOpacity={highlightGlowEnabled ? '0.35' : undefined}
                  stroke={
                    isOrigin
                      ? '#10B981'
                      : isDest
                      ? '#EF4444'
                      : isStopover
                      ? '#38BDF8'
                      : isClicked
                      ? '#38BDF8'
                      : '#F59E0B'
                  }
                  strokeWidth="2.5"
                  strokeOpacity={highlightGlowEnabled ? '0.85' : '0.9'}
                  filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
                />
              )}

              {/* Multi-Stopover Sequence Index Pill */}
              {isStopover && (
                <g transform={`translate(${station.x + 11}, ${station.y - 11})`} style={{ pointerEvents: 'none' }}>
                  <circle
                    cx="0"
                    cy="0"
                    r={stopoverPositions.length > 1 ? 8 : 6.5}
                    fill="#0284C7"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="900"
                    fill="#FFFFFF"
                    className="select-none pointer-events-none font-sans"
                  >
                    {stopoverPositions.join(',')}
                  </text>
                </g>
              )}

              {/* Station Geometric Marker (matching IMG_8214 diagram) */}
              {isCarlsHotel ? (
                // Carls Hotel: Box with crossed diagonals 'X'
                <g>
                  <rect
                    x={station.x - 7}
                    y={station.y - 7}
                    width={14}
                    height={14}
                    fill={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                    stroke={theme === 'dark' ? '#E2E8F0' : '#000000'}
                    strokeWidth={2}
                    rx={1.5}
                  />
                  <line
                    x1={station.x - 5}
                    y1={station.y - 5}
                    x2={station.x + 5}
                    y2={station.y + 5}
                    stroke={theme === 'dark' ? '#E2E8F0' : '#000000'}
                    strokeWidth={1.8}
                  />
                  <line
                    x1={station.x + 5}
                    y1={station.y - 5}
                    x2={station.x - 5}
                    y2={station.y + 5}
                    stroke={theme === 'dark' ? '#E2E8F0' : '#000000'}
                    strokeWidth={1.8}
                  />
                </g>
              ) : isKuhlTown ? (
                // Kuhl Town: Solid black dot ●
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={5.5}
                  fill={theme === 'dark' ? '#E2E8F0' : '#000000'}
                  stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={1.5}
                />
              ) : isDoubleRingStation ? (
                // Major Hubs: White circle with black outer ring
                <g>
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={station.id === 'camp-carl' ? 8.5 : 7}
                    fill={isOrigin ? '#10B981' : isDest ? '#EF4444' : theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                    stroke={theme === 'dark' ? '#F8FAFC' : '#000000'}
                    strokeWidth={station.id === 'camp-carl' ? 3.5 : 2.5}
                  />
                  {station.id === 'camp-carl' && (
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={4.5}
                      fill="none"
                      stroke={theme === 'dark' ? '#F8FAFC' : '#000000'}
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              ) : isTerminalBarStation ? (
                // End-of-line perpendicular terminal bar
                <g>
                  {station.id === 'blue-lagoon' && (
                    <line x1={station.x - 10} y1={station.y} x2={station.x + 10} y2={station.y} stroke="#000000" strokeWidth="4" />
                  )}
                  {station.id === 'willow-creek' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#000000" strokeWidth="4" />
                  )}
                  {station.id === 'villen-viertel-nord' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#15803D" strokeWidth="4" />
                  )}
                  {station.id === 'dog-care' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#9333EA" strokeWidth="4" />
                  )}
                  {station.id === 'mosslands-explorers' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#DC2626" strokeWidth="4" />
                  )}
                  {station.id === 'stonebrook' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#000000" strokeWidth="4" />
                  )}
                  {station.id === 'tinnifer-aquatic-center' && (
                    <line x1={station.x} y1={station.y - 9} x2={station.x} y2={station.y + 9} stroke="#0F766E" strokeWidth="4" />
                  )}
                  {station.id === 'stadium-retow' && (
                    <line x1={station.x - 9} y1={station.y} x2={station.x + 9} y2={station.y} stroke="#06B6D4" strokeWidth="4" />
                  )}
                  {station.id === 'strand' && (
                    <line x1={station.x - 9} y1={station.y} x2={station.x + 9} y2={station.y} stroke="#15803D" strokeWidth="4" />
                  )}
                  {/* Subtle clickable hit circle */}
                  <circle cx={station.x} cy={station.y} r={6} fill="transparent" />
                </g>
              ) : (
                // Intermediate station ticks across track
                <g>
                  {['badesee', 'carl-station', 'airport-hotel', 'weisses-haus', 'arena', 'squishmallow-city', 'lake-road', 'place-de-la-geiger', 'south-canal-harbor', 'jurassic-park'].includes(station.id) ? (
                    <line
                      x1={station.x - 8}
                      y1={station.y}
                      x2={station.x + 8}
                      y2={station.y}
                      stroke={theme === 'dark' ? '#F8FAFC' : '#000000'}
                      strokeWidth={2.8}
                    />
                  ) : (
                    <line
                      x1={station.x}
                      y1={station.y - 8}
                      x2={station.x}
                      y2={station.y + 8}
                      stroke={theme === 'dark' ? '#F8FAFC' : '#000000'}
                      strokeWidth={2.8}
                    />
                  )}
                  <circle cx={station.x} cy={station.y} r={6} fill="transparent" />
                </g>
              )}

              {/* Gare du Nord Train Icon Badge next to label */}
              {station.id === 'gare-du-nord' && (
                <g transform={`translate(${station.x + 28}, ${station.y - 17})`}>
                  <rect x="-6" y="-5.5" width="12" height="11" rx="2" fill="#0284C7" />
                  <text x="0" y="3" textAnchor="middle" fontSize="7.5" fill="#FFFFFF">🚆</text>
                </g>
              )}

              {/* ----------------- STATION LABELS ----------------- */}
              <text
                x={
                  station.labelPosition === 'left'
                    ? station.x - (isDoubleRingStation ? 12 : 9)
                    : station.labelPosition === 'right'
                    ? station.x + (isDoubleRingStation ? 12 : 9)
                    : station.x
                }
                y={
                  station.labelPosition === 'top'
                    ? station.y - (isDoubleRingStation ? 12 : 9)
                    : station.labelPosition === 'bottom'
                    ? station.y + (isDoubleRingStation ? 18 : 15)
                    : station.y + 3.5
                }
                textAnchor={
                  station.labelPosition === 'left'
                    ? 'end'
                    : station.labelPosition === 'right'
                    ? 'start'
                    : 'middle'
                }
                fontSize={isDoubleRingStation || isOrigin || isDest || isStopover ? '10' : '9'}
                fontWeight={isDoubleRingStation || isOrigin || isDest || isStopover ? '700' : '600'}
                fill={
                  isOrigin
                    ? '#10B981'
                    : isDest
                    ? '#EF4444'
                    : isStopover
                    ? '#38BDF8'
                    : isTransfer
                    ? '#0284C7'
                    : isClicked || isHovered
                    ? '#38BDF8'
                    : isOnRoute
                    ? theme === 'dark'
                      ? '#FFFFFF'
                      : '#0F172A'
                    : theme === 'dark'
                    ? '#E2E8F0'
                    : '#1E293B'
                }
                stroke={theme === 'dark' ? '#020617' : '#FFFFFF'}
                strokeWidth="3.5"
                paintOrder="stroke fill"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="select-none pointer-events-none font-sans"
              >
                {station.id === 'traphgon-fern-t3' ? (
                  <>
                    <tspan x={station.x + (isDoubleRingStation ? 12 : 9)} dy="-0.4em">
                      Traphgon Airport
                    </tspan>
                    <tspan x={station.x + (isDoubleRingStation ? 12 : 9)} dy="1.25em">
                      Terminal 3 / Fernbahnhof
                    </tspan>
                  </>
                ) : station.id === 'retow-terminus' ? (
                  <>
                    <tspan x={station.x - (isDoubleRingStation ? 12 : 9)} dy="-0.4em">
                      Retow
                    </tspan>
                    <tspan x={station.x - (isDoubleRingStation ? 12 : 9)} dy="1.25em">
                      (Terminus)
                    </tspan>
                  </>
                ) : (
                  station.name
                )}
              </text>
            </g>
          );
        })}
        {/* ----------------- OBSTRUCTED TRACKS ON MAP ----------------- */}
        {/* Visually paints physical tracks that are obstructed by active disruptions */}
        {disruptions && disruptions.filter((d) => d.isActive).map((disrupt) => {
          const stationList = disrupt.affectedStations && disrupt.affectedStations.length >= 2
            ? disrupt.affectedStations
            : [disrupt.fromStationId, disrupt.toStationId];
          const trackPath = buildLegTrackPath(disrupt.lineId, stationList);
          if (!trackPath) return null;

          return (
            <g
              key={`obstructed-track-${disrupt.id}`}
              className="cursor-pointer select-none group"
              onClick={(e) => {
                e.stopPropagation();
                haptic.medium();
                setSelectedDisruption(disrupt);
                setClickedStationId(null);
                setClickedLineId(null);
                setIsDisruptionCardCollapsed(false);
              }}
            >
              {/* Outer danger halo glow */}
              <path
                d={trackPath}
                fill="none"
                stroke="#EF4444"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={highlightGlowEnabled ? '0.6' : '0.28'}
                filter={highlightGlowEnabled ? 'url(#routeGlow)' : undefined}
              />
              {/* Solid dark warning base */}
              <path
                d={trackPath}
                fill="none"
                stroke="#7F1D1D"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
              {/* Hazard alternating striped track (high-visibility danger dashes) */}
              <path
                d={trackPath}
                fill="none"
                stroke="#FACC15"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="9 7"
                opacity="0.95"
              />
              {/* Central high-visibility crimson stripe */}
              <path
                d={trackPath}
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 8"
              />
            </g>
          );
        })}

        {/* ----------------- DISRUPTION MARKERS ON MAP ----------------- */}
        {disruptions && disruptions.map((disrupt) => {
          const fromSt = STATIONS[disrupt.fromStationId];
          const toSt = STATIONS[disrupt.toStationId];
          if (!fromSt && !toSt) return null;

          const x = fromSt && toSt ? (fromSt.x + toSt.x) / 2 : (fromSt || toSt)!.x;
          const y = fromSt && toSt ? (fromSt.y + toSt.y) / 2 : (fromSt || toSt)!.y;
          const line = METRO_LINES[disrupt.lineId];

          return (
            <g
              key={disrupt.id}
              className="cursor-pointer group select-none"
              onClick={(e) => {
                e.stopPropagation();
                haptic.medium();
                setSelectedDisruption(disrupt);
                setClickedStationId(null);
                setClickedLineId(null);
                setIsDisruptionCardCollapsed(false);
              }}
              transform={`translate(${x}, ${y})`}
            >
              {/* Warning Halo */}
              <circle
                r="16"
                fill="#EF4444"
                fillOpacity="0.25"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
              <circle
                r="13"
                fill="#EF4444"
                fillOpacity="0.4"
              />
              {/* Outer Badge Ring */}
              <circle
                r="11"
                fill="#DC2626"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* Warning Symbol */}
              <text
                textAnchor="middle"
                y="3.5"
                fontSize="10"
                fill="#FFFFFF"
                fontWeight="900"
                className="pointer-events-none select-none font-sans"
              >
                ⚠️
              </text>

              {/* Line badge pill above marker */}
              {line && (
                <g transform="translate(0, -18)">
                  <rect
                    x="-14"
                    y="-7"
                    width="28"
                    height="14"
                    rx="4"
                    fill={line.color}
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    className="pointer-events-none select-none font-sans"
                  >
                    {line.badge}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Trip Summary on Map */}
      <AnimatePresence>
        {activeRoute && (
          <motion.div
            drag
            dragConstraints={false}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              isInfoCardDraggingRef.current = true;
              isDraggingRef.current = false;
            }}
            onDragEnd={() => {
              isInfoCardDraggingRef.current = false;
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ touchAction: 'none' }}
            className="info-window-sheet absolute top-16 left-3 right-3 sm:top-4 sm:left-auto sm:right-16 sm:max-w-xs z-30 bg-white/[0.97] dark:bg-slate-900/[0.97] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl space-y-2 select-none cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS-style Drag Handle Pill */}
            <div
              className="flex items-center justify-center -mt-1 pb-1 select-none pointer-events-none"
            >
              <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shadow-2xs" />
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.tripSummary}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                  ~{activeRoute.totalDurationMinutes} {t.min}
                </span>
                {onResetRoute && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.light();
                      onResetRoute();
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={language === 'de' ? 'Route schließen / zurücksetzen' : 'Close / reset route'}
                    aria-label={language === 'de' ? 'Route schließen' : 'Close route'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{STATIONS[activeRoute.legs[0]?.fromStationId]?.name}</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="truncate">{STATIONS[activeRoute.legs[activeRoute.legs.length - 1]?.toStationId]?.name}</span>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                {activeRoute.linesUsed.map((lId) => (
                  <span
                    key={lId}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: METRO_LINES[lId]?.color }}
                  >
                    {METRO_LINES[lId]?.badge}
                  </span>
                ))}
              </div>
              <span>{activeRoute.transfersCount} {t.transfers}</span>
            </div>

            {activeRoute.affectedDisruptions && activeRoute.affectedDisruptions.length > 0 && (
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                <span>
                  {activeRoute.affectedDisruptions.length}{' '}
                  {language === 'de'
                    ? activeRoute.affectedDisruptions.length === 1
                      ? 'Störung gemeldet'
                      : 'Störungen gemeldet'
                    : activeRoute.affectedDisruptions.length === 1
                    ? 'Disruption reported'
                    : 'Disruptions reported'}
                </span>
              </div>
            )}

            {activeRide && (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0 font-bold text-emerald-800 dark:text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">
                    {STATIONS[activeRide.steps[activeRide.currentStepIndex]?.stationId]?.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                  {activeRide.currentStepIndex + 1}/{activeRide.steps.length}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {activeRide && onOpenActiveRide && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    haptic.medium();
                    onOpenActiveRide();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t.activeRide}</span>
                </motion.button>
              )}
              {onNavigateToPlanner && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    haptic.medium();
                    onNavigateToPlanner();
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition"
                >
                  <span>{t.viewInTripPlanner}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              )}
              {onResetRoute && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    haptic.light();
                    onResetRoute();
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition shrink-0"
                  title={language === 'de' ? 'Geplante Reise verwerfen' : 'Reset planned trip'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'de' ? 'Zurücksetzen' : 'Reset'}</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refined Expandable/Collapsible Line Legend in Bottom Left Corner */}
      {/* Positioned at bottom-20 on mobile to cleanly clear the bottom menu bar without overlapping */}
      <div
        className={`absolute left-3 sm:left-4 z-20 transition-all duration-300 ease-out pointer-events-auto ${
          hasBottomSheet ? 'hidden md:block md:bottom-4' : 'bottom-20 sm:bottom-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.button
              key="legend-collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleToggleLegend}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.97] dark:bg-slate-900/[0.97] border border-slate-200 dark:border-slate-800 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-slate-900/10 active:scale-95"
              title={t.expandLegend}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🚇</span>
                <span>{t.lines}</span>
                {activeLineFilter !== 'ALL' && METRO_LINES[activeLineFilter] && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: METRO_LINES[activeLineFilter].color }}
                  >
                    {METRO_LINES[activeLineFilter].badge}
                  </span>
                )}
              </div>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </motion.button>
          ) : (
            <motion.div
              key="legend-expanded"
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="w-[195px] max-h-56 flex flex-col p-2.5 bg-white/[0.97] dark:bg-slate-900/[0.97] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-xs shadow-slate-950/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <TrainFront className="w-3 h-3 text-blue-500" />
                  <span>{t.lines}</span>
                </span>
                <button
                  onClick={handleToggleLegend}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title={t.collapseLegend}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* All Lines Button */}
              <button
                onClick={() => handleSelectFilter('ALL')}
                className={`w-full mb-1.5 py-1 px-2 rounded-xl text-[10px] font-bold transition text-center ${
                  activeLineFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-100/70 dark:bg-slate-800/50'
                }`}
              >
                {t.allLines}
              </button>

              {/* Compact 2-column grid */}
              <div className="overflow-y-auto no-scrollbar max-h-36 pr-0.5 space-y-1.5">
                <div>
                  <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 px-0.5">
                    U-Bahn
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(METRO_LINES)
                      .filter((l) => l.networkType !== 'ic')
                      .map((line) => (
                        <button
                          key={line.id}
                          onClick={() => handleSelectFilter(line.id)}
                          className={`py-1 px-1.5 rounded-lg text-[9px] font-bold transition flex items-center gap-1 truncate ${
                            activeLineFilter === line.id
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 ring-2 ring-blue-500 shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={line.name}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: line.color }}
                          />
                          <span className="truncate">{line.badge}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {showICLayer && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="text-[8px] font-extrabold uppercase tracking-wider text-rose-500/80 mb-0.5 px-0.5">
                      IC-Züge
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.values(METRO_LINES)
                        .filter((l) => l.networkType === 'ic')
                        .map((line) => (
                          <button
                            key={line.id}
                            onClick={() => handleSelectFilter(line.id)}
                            className={`py-1 px-1.5 rounded-lg text-[9px] font-bold transition flex items-center gap-1 truncate ${
                              activeLineFilter === line.id
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 ring-2 ring-rose-500 shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={line.name}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: line.color }}
                            />
                            <span className="truncate">{line.badge}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Disruption Details Sheet on Map */}
      {/* Positioned comfortably at bottom-22/24 on mobile to sit cleanly ABOVE the floating bottom menu bar */}
      <AnimatePresence>
        {selectedDisruption && (
          <motion.div
            key={selectedDisruption.id}
            drag
            dragConstraints={false}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              dragMovedRef.current = true;
              isInfoCardDraggingRef.current = true;
              isDraggingRef.current = false;
            }}
            onDragEnd={() => {
              isInfoCardDraggingRef.current = false;
              setTimeout(() => {
                dragMovedRef.current = false;
              }, 120);
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 32,
            }}
            style={{ touchAction: 'none' }}
            className="info-window-sheet absolute bottom-22 sm:bottom-24 md:bottom-4 right-3 sm:right-4 w-[calc(100%-1.5rem)] sm:w-96 max-w-sm sm:max-w-md overflow-hidden z-45 bg-white/[0.97] dark:bg-slate-900/[0.97] border-2 border-amber-500/80 dark:border-amber-500/70 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] p-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar / Drag Handle - Click to toggle collapse/expand or drag to move */}
            <div
              onClick={() => {
                if (dragMovedRef.current) return;
                haptic.selection();
                setIsDisruptionCardCollapsed((prev) => !prev);
              }}
              className="group cursor-grab active:cursor-grabbing select-none -mx-1 -mt-1 px-1 pt-0.5 pb-1 rounded-2xl hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors"
              title={
                isDisruptionCardCollapsed
                  ? language === 'de'
                    ? 'Tippen zum Vergrößern • Ziehen zum Verschieben'
                    : 'Tap to expand • Drag to move'
                  : language === 'de'
                  ? 'Tippen zum Verkleinern • Ziehen zum Verschieben'
                  : 'Tap to collapse • Drag to move'
              }
            >
              {/* iOS-style Drag Handle Bar */}
              <div className="flex items-center justify-center pt-0.5 pb-1 pointer-events-none">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors shadow-xs" />
              </div>

              {/* Disruption Summary Bar */}
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-md shadow-amber-500/30">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block truncate">
                      {t.disruptionDetails}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedDisruption.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.selection();
                      setIsDisruptionCardCollapsed((prev) => !prev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={
                      isDisruptionCardCollapsed
                        ? language === 'de'
                          ? 'Details einblenden'
                          : 'Show details'
                        : language === 'de'
                        ? 'Minimieren'
                        : 'Collapse'
                    }
                    aria-label="Toggle collapse"
                  >
                    <motion.div
                      animate={{ rotate: isDisruptionCardCollapsed ? 0 : 180 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <ChevronDown className="w-4 h-4 text-blue-500" />
                    </motion.div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.light();
                      setSelectedDisruption(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={language === 'de' ? 'Schließen' : 'Close'}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Body Section (Visible when NOT collapsed) */}
            <AnimatePresence initial={false}>
              {!isDisruptionCardCollapsed && (
                <motion.div
                  key="disruption-details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div
                    className="space-y-3 pt-2.5 mt-2 border-t border-amber-200/40 dark:border-amber-900/40 max-h-[60vh] overflow-y-auto overscroll-contain pr-0.5"
                    style={{ touchAction: 'pan-y' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {METRO_LINES[selectedDisruption.lineId] && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{t.affectedLine}:</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: METRO_LINES[selectedDisruption.lineId]?.color }}
                        >
                          {METRO_LINES[selectedDisruption.lineId]?.badge}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {METRO_LINES[selectedDisruption.lineId]?.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        {STATIONS[selectedDisruption.fromStationId]?.name || selectedDisruption.fromStationId} ↔{' '}
                        {STATIONS[selectedDisruption.toStationId]?.name || selectedDisruption.toStationId}
                      </span>
                    </div>

                    {selectedDisruption.description && (
                      <p className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        "{selectedDisruption.description}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <span>
                        {selectedDisruption.reportedBy ? `Gemeldet von: ${selectedDisruption.reportedBy}` : 'Live gemeldet'}
                      </span>
                      <span>{selectedDisruption.confirmations} {t.confirmationsCount}</span>
                    </div>
                  </div>

                  {/* Public Community Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {onConfirmDisruption && (
                      <button
                        onClick={() => {
                          haptic.medium();
                          onConfirmDisruption(selectedDisruption.id);
                        }}
                        className="flex-1 py-2 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{t.confirmDisruption} ({selectedDisruption.confirmations})</span>
                      </button>
                    )}

                    {onReportResolved && (
                      <button
                        onClick={async () => {
                          haptic.success();
                          await onReportResolved(selectedDisruption.id);
                          setSelectedDisruption(null);
                        }}
                        disabled={userResolvedIds.includes(selectedDisruption.id)}
                        className={`flex-1 py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition active:scale-95 ${
                          userResolvedIds.includes(selectedDisruption.id)
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 opacity-90'
                            : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}
                        title={
                          language === 'de'
                            ? 'Wenn 10 Nutzer melden, dass die Störung behoben ist, wird sie automatisch gelöscht.'
                            : 'When 10 users report this disruption is resolved, it will be automatically removed.'
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          {userResolvedIds.includes(selectedDisruption.id)
                            ? t.disruptionGoneReported
                            : t.reportDisruptionGone}{' '}
                          ({selectedDisruption.resolvedReports || 0}/10)
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Admin Management Controls: Edit & Delete Disruption */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {onEditDisruption && (
                          <button
                            onClick={() => {
                              haptic.medium();
                              const target = selectedDisruption;
                              setSelectedDisruption(null);
                              onEditDisruption(target);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs transition"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{t.editDisruption}</span>
                          </button>
                        )}
                        {onDeleteDisruption && (
                          <button
                            onClick={() => {
                              haptic.warning();
                              setDisruptionToDelete(selectedDisruption);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 active:scale-95 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1.5 border border-rose-200 dark:border-rose-900 shadow-xs transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === 'de' ? 'Löschen' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Station Quick Action Sheet on Map */}
      <AnimatePresence>
        {clickedStation && (
          <motion.div
            key={clickedStation.id}
            drag
            dragConstraints={false}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              dragMovedRef.current = true;
              isInfoCardDraggingRef.current = true;
              isDraggingRef.current = false;
            }}
            onDragEnd={() => {
              isInfoCardDraggingRef.current = false;
              setTimeout(() => {
                dragMovedRef.current = false;
              }, 120);
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 32,
            }}
            style={{ touchAction: 'none' }}
            className="info-window-sheet absolute bottom-22 sm:bottom-24 md:bottom-4 right-3 sm:right-4 w-[calc(100%-1.5rem)] sm:w-84 max-w-sm overflow-hidden z-45 bg-white/[0.97] dark:bg-slate-900/[0.97] border border-black/10 dark:border-white/15 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] p-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar / Drag Handle - Click to toggle collapse/expand or drag to move */}
            <div
              onClick={() => {
                if (dragMovedRef.current) return;
                haptic.selection();
                setIsStationCardCollapsed((prev) => !prev);
              }}
              className="group cursor-grab active:cursor-grabbing select-none -mx-1 -mt-1 px-1 pt-0.5 pb-1 rounded-2xl hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors"
              title={
                isStationCardCollapsed
                  ? language === 'de'
                    ? 'Tippen zum Vergrößern • Ziehen zum Verschieben'
                    : 'Tap to expand • Drag to move'
                  : language === 'de'
                  ? 'Tippen zum Verkleinern • Ziehen zum Verschieben'
                  : 'Tap to collapse • Drag to move'
              }
            >
              {/* iOS-style Drag Handle Bar */}
              <div className="flex items-center justify-center pt-0.5 pb-1 pointer-events-none">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors shadow-xs" />
              </div>

              {/* Station Summary Bar (Header visible in both collapsed and expanded states) */}
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {clickedStation.lines.map((lId) => (
                      <span
                        key={lId}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: METRO_LINES[lId]?.color }}
                      >
                        {METRO_LINES[lId]?.badge}
                      </span>
                    ))}
                    {clickedStation.hasAirport && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800 text-[10px] font-medium">
                        ✈ {t.airport}
                      </span>
                    )}
                    {clickedStation.hasIC && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-[10px] font-medium">
                        🚆 IC
                      </span>
                    )}
                    {clickedStation.isAccessible && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-medium">
                        ♿
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {clickedStation.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.selection();
                      setIsStationCardCollapsed((prev) => !prev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={
                      isStationCardCollapsed
                        ? language === 'de'
                          ? 'Details einblenden'
                          : 'Show details'
                        : language === 'de'
                        ? 'Minimieren'
                        : 'Collapse'
                    }
                    aria-label="Toggle collapse"
                  >
                    <motion.div
                      animate={{ rotate: isStationCardCollapsed ? 0 : 180 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <ChevronDown className="w-4 h-4 text-blue-500" />
                    </motion.div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.light();
                      setClickedStationId(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={language === 'de' ? 'Schließen' : 'Close'}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Body Section (Visible when NOT collapsed) */}
            <AnimatePresence initial={false}>
              {!isStationCardCollapsed && (
                <motion.div
                  key="station-details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div
                    className="space-y-2.5 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 max-h-[60vh] overflow-y-auto overscroll-contain pr-0.5"
                    style={{ touchAction: 'pan-y' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 select-text">
                    {clickedStation.description}
                  </p>
                  {clickedStation.id === 'jurassic-park' && (
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                      <Train className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {language === 'de'
                          ? 'Wichtig: Bei Durchfahrt auf IC 10 ist ein Zugwechsel erforderlich (gleiche Linie).'
                          : 'Notice: Change of trains required when passing through on IC 10 (same line).'}
                      </span>
                    </div>
                  )}

                  {/* Reported Disruptions for this Station & Lines */}
                  {(() => {
                    const stDisruptions = clickedStationDisruptions;

                    if (stDisruptions.length === 0) {
                      return (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{t.noDisruptionsForStation}</span>
                        </div>
                      );
                    }

                    return (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {language === 'de' ? 'Gemeldete Störungen' : 'Reported Disruptions'} ({stDisruptions.length})
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {stDisruptions.map((disrupt) => {
                            const line = METRO_LINES[disrupt.lineId];
                            const isObstruction =
                              disrupt.type === 'closure' ||
                              disrupt.type === 'construction' ||
                              disrupt.type === 'missing_tracks';
                            return (
                              <div
                                key={`st-disrupt-${disrupt.id}`}
                                onClick={() => {
                                  haptic.medium();
                                  setSelectedDisruption(disrupt);
                                  setIsDisruptionCardCollapsed(false);
                                }}
                                className="p-2 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-50/80 dark:hover:bg-zinc-800 transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shrink-0"
                                      style={{ backgroundColor: line?.color || '#EF4444' }}
                                    >
                                      {line?.badge || disrupt.lineId}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                        isObstruction
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      }`}
                                    >
                                      {getDisruptionTypeLabel(disrupt.type, language)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                    {disrupt.title}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Isochrone Reachability Mode ("Explore Nearby") Controls */}
                  {(() => {
                    const isThisIsoOrigin = isochroneEnabled && isochroneOriginId === clickedStation.id;
                    const clickedTimeFromIsoOrigin =
                      isochroneEnabled && isochroneResult && !isThisIsoOrigin
                        ? isochroneResult.stationTimes[clickedStation.id]
                        : undefined;
                    const totalStationsInResult = isochroneResult
                      ? Object.keys(isochroneResult.stationTimes).length
                      : 0;

                    return (
                      <div
                        className="mt-2 p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5"
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <Radar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {t.exploreNearbyTitle}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {isThisIsoOrigin
                                  ? `${reachableStationSet.size} / ${totalStationsInResult} ${t.reachableStationsCount}`
                                  : isochroneEnabled && isochroneOriginId
                                  ? clickedTimeFromIsoOrigin !== undefined
                                    ? clickedTimeFromIsoOrigin <= effectiveIsochroneBudgetSeconds
                                      ? `${t.reachableInLabel} ${formatSecondsVerbose(clickedTimeFromIsoOrigin)}`
                                      : `${t.unreachableInBudget} (${formatSecondsVerbose(clickedTimeFromIsoOrigin)})`
                                    : t.unreachableInBudget
                                  : t.exploreNearbyOff}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleIsochroneForStation(clickedStation.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition active:scale-95 shrink-0 cursor-pointer ${
                              isThisIsoOrigin
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                          >
                            {isThisIsoOrigin
                              ? t.closeIsochrone
                              : isochroneEnabled
                              ? t.switchIsochroneOrigin
                              : t.exploreNearbyOff}
                          </button>
                        </div>

                        {isThisIsoOrigin && isochroneResult && (
                          <div className="space-y-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                <span>{t.exploreNearbyToggle}</span>
                              </span>
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                                {formatSecondsVerbose(effectiveIsochroneBudgetSeconds)}
                              </span>
                            </div>

                            {/* 0s to longest possible journey time slider */}
                            <input
                              type="range"
                              min={0}
                              max={isochroneMaxSeconds}
                              step={1}
                              value={effectiveIsochroneBudgetSeconds}
                              onChange={(e) => setIsochroneBudgetSeconds(Number(e.target.value))}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="w-full h-2 rounded-lg accent-emerald-500 cursor-pointer"
                            />

                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono -mt-1">
                              <span>0s</span>
                              <span>
                                {t.maxJourneyTimeLabel}: {formatSecondsVerbose(isochroneMaxSeconds)}
                              </span>
                            </div>

                            {/* Quick 5 / 10 / 15 min / Max presets */}
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { label: '5 min', sec: 300 },
                                { label: '10 min', sec: 600 },
                                { label: '15 min', sec: 900 },
                                { label: t.presetMax, sec: isochroneMaxSeconds },
                              ].map((preset, pIdx) => {
                                const clampedVal = Math.min(preset.sec, isochroneMaxSeconds);
                                const isActivePreset =
                                  pIdx === 3
                                    ? effectiveIsochroneBudgetSeconds >= isochroneMaxSeconds
                                    : preset.sec <= isochroneMaxSeconds && effectiveIsochroneBudgetSeconds === preset.sec;
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    disabled={pIdx < 3 && preset.sec > isochroneMaxSeconds}
                                    onClick={() => {
                                      haptic.selection();
                                      setIsochroneBudgetSeconds(clampedVal);
                                    }}
                                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                                      isActivePreset
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Compact color tier legend */}
                            <div className="flex items-center justify-between gap-1 pt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                ≤5m
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                                ≤10m
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                ≤15m
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                                &gt;15m
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {routePlanningEnabled ? (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            haptic.medium();
                            onSetOrigin(clickedStation.id);
                            setClickedStationId(null);
                          }}
                          className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition active:scale-95"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{t.startHere}</span>
                        </button>

                        {onSetStopover && (
                          <button
                            onClick={() => {
                              haptic.medium();
                              onSetStopover(clickedStation.id);
                              setClickedStationId(null);
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold transition active:scale-95"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>
                              {t.stopover}
                              {effectiveStopoverIds.includes(clickedStation.id) ? ' ✓' : ''}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            haptic.medium();
                            onSetDestination(clickedStation.id);
                            setClickedStationId(null);
                          }}
                          className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition active:scale-95"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>{t.setAsDestination}</span>
                        </button>
                      </div>

                      {activeRoute && onResetRoute && (
                        <button
                          onClick={() => {
                            haptic.light();
                            onResetRoute();
                            setClickedStationId(null);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                          <span>{language === 'de' ? 'Aktive Verbindung zurücksetzen' : 'Reset active route'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{t.mapStationInfoOnly}</span>
                    </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Isochrone Control HUD (visible when exploring map without open bottom sheets) */}
      <AnimatePresence>
        {showFloatingIsochroneHud && isochroneResult && isochroneOriginId && (
          <motion.div
            key="isochrone-floating-hud"
            drag
            dragConstraints={false}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              isInfoCardDraggingRef.current = true;
              isDraggingRef.current = false;
            }}
            onDragEnd={() => {
              isInfoCardDraggingRef.current = false;
            }}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            style={{ touchAction: 'none' }}
            onClick={(e) => e.stopPropagation()}
            className="info-window-sheet absolute bottom-22 sm:bottom-24 md:bottom-4 right-3 sm:right-4 w-[calc(100%-1.5rem)] sm:w-88 max-w-sm z-40 bg-white/[0.97] dark:bg-slate-900/[0.97] border border-emerald-500/40 rounded-3xl shadow-2xl p-3.5 space-y-2.5 select-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center justify-center -mt-1 pb-0.5 pointer-events-none">
              <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                  <Radar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
                    {t.exploreNearbyTitle}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {STATIONS[isochroneOriginId]?.name} • {reachableStationSet.size}/
                    {Object.keys(isochroneResult.stationTimes).length} {t.reachableStationsCount}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setIsochroneEnabled(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={t.closeIsochrone}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {t.exploreNearbyToggle}
                </span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatSecondsVerbose(effectiveIsochroneBudgetSeconds)}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={isochroneMaxSeconds}
                step={1}
                value={effectiveIsochroneBudgetSeconds}
                onChange={(e) => setIsochroneBudgetSeconds(Number(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full h-2 rounded-lg accent-emerald-500 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono -mt-1">
                <span>0s</span>
                <span>
                  {t.maxJourneyTimeLabel}: {formatSecondsVerbose(isochroneMaxSeconds)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '5 min', sec: 300 },
                  { label: '10 min', sec: 600 },
                  { label: '15 min', sec: 900 },
                  { label: t.presetMax, sec: isochroneMaxSeconds },
                ].map((preset, pIdx) => {
                  const clampedVal = Math.min(preset.sec, isochroneMaxSeconds);
                  const isActivePreset =
                    pIdx === 3
                      ? effectiveIsochroneBudgetSeconds >= isochroneMaxSeconds
                      : preset.sec <= isochroneMaxSeconds && effectiveIsochroneBudgetSeconds === preset.sec;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      disabled={pIdx < 3 && preset.sec > isochroneMaxSeconds}
                      onClick={() => {
                        haptic.selection();
                        setIsochroneBudgetSeconds(clampedVal);
                      }}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                        isActivePreset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Line Information Bottom Sheet / Card on Map */}
      <AnimatePresence>
        {clickedLine && (
          <motion.div
            key={clickedLine.id}
            drag
            dragConstraints={false}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              dragMovedRef.current = true;
              isInfoCardDraggingRef.current = true;
              isDraggingRef.current = false;
            }}
            onDragEnd={() => {
              isInfoCardDraggingRef.current = false;
              setTimeout(() => {
                dragMovedRef.current = false;
              }, 120);
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 32,
            }}
            style={{ touchAction: 'none' }}
            className="info-window-sheet absolute bottom-22 sm:bottom-24 md:bottom-4 right-3 sm:right-4 w-[calc(100%-1.5rem)] sm:w-96 max-w-sm sm:max-w-md overflow-hidden z-45 bg-white/[0.97] dark:bg-slate-900/[0.97] border border-black/10 dark:border-white/15 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] p-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar / Drag Handle - Click to toggle collapse/expand or drag to move */}
            <div
              onClick={() => {
                if (dragMovedRef.current) return;
                haptic.selection();
                setIsLineCardCollapsed((prev) => !prev);
              }}
              className="group cursor-grab active:cursor-grabbing select-none -mx-1 -mt-1 px-1 pt-0.5 pb-1 rounded-2xl hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors"
              title={
                isLineCardCollapsed
                  ? language === 'de'
                    ? 'Tippen zum Vergrößern • Ziehen zum Verschieben'
                    : 'Tap to expand • Drag to move'
                  : language === 'de'
                  ? 'Tippen zum Verkleinern • Ziehen zum Verschieben'
                  : 'Tap to collapse • Drag to move'
              }
            >
              {/* iOS-style Drag Handle Bar */}
              <div className="flex items-center justify-center pt-0.5 pb-1 pointer-events-none">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors shadow-xs" />
              </div>

              {/* Line Summary Bar (Header visible in both collapsed and expanded states) */}
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="px-2.5 py-1 rounded-xl text-xs font-black shadow-xs tracking-wider shrink-0"
                    style={{
                      backgroundColor: clickedLine.color,
                      color: clickedLine.textColor || '#FFFFFF',
                    }}
                  >
                    {clickedLine.badge}
                  </span>
                  <div className="min-w-0 truncate">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {clickedLine.name}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      {clickedLine.networkType === 'ic'
                        ? '🚆 InterCity Express (IC)'
                        : clickedLine.id === 'Tim-Train'
                        ? '⭐ Sonderzug (Tim Train)'
                        : clickedLine.networkType === 'planned'
                        ? '🕒 In Planung (Zukunft)'
                        : '🚇 U-Bahn Linie'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.selection();
                      setIsLineCardCollapsed((prev) => !prev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={
                      isLineCardCollapsed
                        ? language === 'de'
                          ? 'Details einblenden'
                          : 'Show details'
                        : language === 'de'
                        ? 'Minimieren'
                        : 'Collapse'
                    }
                    aria-label="Toggle collapse"
                  >
                    <motion.div
                      animate={{ rotate: isLineCardCollapsed ? 0 : 180 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <ChevronDown className="w-4 h-4 text-blue-500" />
                    </motion.div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.light();
                      setClickedLineId(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={language === 'de' ? 'Linien-Info schließen' : 'Close line info'}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Body Section (Visible when NOT collapsed) */}
            <AnimatePresence initial={false}>
              {!isLineCardCollapsed && (
                <motion.div
                  key="line-details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div
                    className="space-y-3 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 max-h-[60vh] overflow-y-auto overscroll-contain pr-0.5"
                    style={{ touchAction: 'pan-y' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                  {/* Terminals, Total Ride Time & Frequency */}
                  {(() => {
                    const lineTiming = getLineTotalTravelTime(clickedLine.id, travelTimeOverrides);
                    return (
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold truncate min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                            {language === 'de' ? 'Strecke:' : 'Route:'}
                          </span>
                          <span className="truncate">{clickedLine.terminals.join(' ↔ ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              lineTiming.hasMeasuredSegments
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            ~{lineTiming.totalMinutes} {t.min}
                          </span>
                          {clickedLine.frequencyMinutes && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                              ⏱ {language === 'de' ? `Alle ${clickedLine.frequencyMinutes} Min.` : `Every ${clickedLine.frequencyMinutes} min`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reported Disruptions for this Line */}
                  {(() => {
                    const lDisruptions = clickedLineDisruptions;

                    if (lDisruptions.length === 0) {
                      return (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{t.noDisruptionsForLine}</span>
                        </div>
                      );
                    }

                    return (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {language === 'de' ? 'Aktive Störungen auf dieser Linie' : 'Active Disruptions on this Line'} ({lDisruptions.length})
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {lDisruptions.map((disrupt) => {
                            const isObstruction =
                              disrupt.type === 'closure' ||
                              disrupt.type === 'construction' ||
                              disrupt.type === 'missing_tracks';
                            return (
                              <div
                                key={`line-disrupt-${disrupt.id}`}
                                onClick={() => {
                                  haptic.medium();
                                  setSelectedDisruption(disrupt);
                                  setIsDisruptionCardCollapsed(false);
                                }}
                                className="p-2 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-50/80 dark:hover:bg-zinc-800 transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                        isObstruction
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      }`}
                                    >
                                      {getDisruptionTypeLabel(disrupt.type, language)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {STATIONS[disrupt.fromStationId]?.name} ↔ {STATIONS[disrupt.toStationId]?.name}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                    {disrupt.title}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Detailed Line Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed select-text">
                    {clickedLine.description}
                  </p>

                  {/* Served Stations List */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {language === 'de' ? `Haltestellen (${clickedLine.stations.length})` : `Stations (${clickedLine.stations.length})`}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">
                        {language === 'de' ? 'Tippen zum Fokussieren' : 'Tap to focus'}
                      </span>
                    </div>
                    <div
                      className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 touch-pan-y"
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {clickedLine.stations.map((stId, sIdx) => {
                        const st = STATIONS[stId];
                        if (!st) return null;
                        return (
                          <button
                            key={stId}
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.selection();
                              setClickedStationId(stId);
                              setClickedLineId(null);
                              setIsStationCardCollapsed(false);
                              onSelectStation(stId);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-medium border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition active:scale-95"
                          >
                            <span className="text-[9px] text-slate-400 font-bold">{sIdx + 1}.</span>
                            <span>{st.name}</span>
                            {st.hasAirport && <span className="text-[9px]">✈</span>}
                            {st.hasIC && <span className="text-[9px]">🚆</span>}
                            {st.isAccessible && <span className="text-[9px]">♿</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => {
                        haptic.light();
                        setClickedLineId(null);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <span>{language === 'de' ? 'Hervorhebung aufheben' : 'Clear highlight'}</span>
                    </button>
                    {onSelectLineFilter && (
                      <button
                        onClick={() => {
                          haptic.medium();
                          onSelectLineFilter(clickedLine.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition active:scale-95 shadow-xs"
                      >
                        {language === 'de' ? 'Linie filtern' : 'Filter line'}
                      </button>
                    )}
                  </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Admin Disruption Delete Confirmation Modal */}
      <ConfirmDeleteDisruptionModal
        language={language}
        disruption={disruptionToDelete}
        isOpen={!!disruptionToDelete}
        onClose={() => setDisruptionToDelete(null)}
        onConfirm={async () => {
          if (!disruptionToDelete) return;
          const id = disruptionToDelete.id;
          setDisruptionToDelete(null);
          setSelectedDisruption(null);
          if (onDeleteDisruption) {
            await onDeleteDisruption(id);
          }
        }}
      />
    </div>
  );
};
