import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Station, LineId, RouteOption, Disruption } from '../types/metro';
import { STATIONS, METRO_LINES } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
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
  Pencil,
  Trash2,
} from 'lucide-react';

interface InteractiveMapProps {
  language: Language;
  theme: 'dark' | 'light';
  selectedOriginId: string | null;
  selectedDestinationId: string | null;
  selectedStopoverId?: string | null;
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
  userConfirmedIds?: string[];
  userResolvedIds?: string[];
  onConfirmDisruption?: (id: string) => void;
  onReportResolved?: (id: string) => Promise<void>;
  routePlanningEnabled?: boolean;
  onNavigateToPlanner?: () => void;
  isAdmin?: boolean;
  onEditDisruption?: (disruption: Disruption) => void;
  onDeleteDisruption?: (disruptionId: string) => Promise<void>;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  language,
  theme,
  selectedOriginId,
  selectedDestinationId,
  selectedStopoverId,
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
  userConfirmedIds = [],
  userResolvedIds = [],
  onConfirmDisruption,
  onReportResolved,
  routePlanningEnabled = true,
  onNavigateToPlanner,
  isAdmin = false,
  onEditDisruption,
  onDeleteDisruption,
}) => {
  const t = translations[language];

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

  // Optimized mobile defaults: cleanly center the network and use screen space efficiently
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 1.05 : 1));
  const [pan, setPan] = useState(() => ({ x: 0, y: 0 }));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [clickedStationId, setClickedStationId] = useState<string | null>(null);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [internalLegendExpanded, setInternalLegendExpanded] = useState(false);

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
  const hasBottomSheet = Boolean(clickedStationId || selectedDisruption);

  const containerRef = useRef<HTMLDivElement>(null);

  // Boundary constraints so user can never drag or pinch far away from the contents of the map
  const clampPan = (px: number, py: number, currentZoom: number) => {
    const container = containerRef.current;
    const w = container?.clientWidth || windowWidth;
    const h = container?.clientHeight || 600;

    // Keep at least a generous portion of the network within viewport
    const maxPanX = Math.max(50, (w * currentZoom - w) / 2 + w * 0.22);
    const maxPanY = Math.max(50, (h * currentZoom - h) / 2 + h * 0.22);

    return {
      x: Math.min(Math.max(px, -maxPanX), maxPanX),
      y: Math.min(Math.max(py, -maxPanY), maxPanY),
    };
  };

  // Zoom centered on the center of what is on your screen (or pointer focal point)
  const zoomToPoint = (
    nextZoomOrFn: number | ((prev: number) => number),
    focalPoint?: { x: number; y: number }
  ) => {
    setZoom((prevZoom) => {
      const nextZoomRaw = typeof nextZoomOrFn === 'function' ? nextZoomOrFn(prevZoom) : nextZoomOrFn;
      const minZoom = isMobile ? 0.85 : 0.75;
      const maxZoom = 3.2;
      const nextZoom = Math.min(Math.max(nextZoomRaw, minZoom), maxZoom);

      if (nextZoom === prevZoom) return prevZoom;

      const zoomRatio = nextZoom / prevZoom;

      setPan((prevPan) => {
        // focalPoint is relative to container center. When zooming on screen center, focalPoint is (0, 0)!
        const fx = focalPoint ? focalPoint.x : 0;
        const fy = focalPoint ? focalPoint.y : 0;

        // Keep the focal point invariant under scaling:
        const newX = prevPan.x * zoomRatio + fx * (1 - zoomRatio);
        const newY = prevPan.y * zoomRatio + fy * (1 - zoomRatio);

        return clampPan(newX, newY, nextZoom);
      });

      return nextZoom;
    });
  };

  // Touch handling for pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartFocalRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => {
    haptic.selection();
    zoomToPoint((prev) => prev + 0.25);
  };
  const handleZoomOut = () => {
    haptic.selection();
    zoomToPoint((prev) => prev - 0.25);
  };
  const handleReset = () => {
    haptic.medium();
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    setZoom(mobile ? 1.05 : 1);
    setPan({ x: 0, y: 0 });
    setClickedStationId(null);
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
      zoomToPoint((prev) => prev * factor, { x: focalX, y: focalY });
    } else {
      zoomToPoint((prev) => prev * factor);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan(clampPan(e.clientX - dragStart.x, e.clientY - dragStart.y, zoom));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      touchStartPanRef.current = { ...pan };
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
    if (e.touches.length === 1 && isDragging) {
      setPan(clampPan(e.touches[0].clientX - dragStart.x, e.touches[0].clientY - dragStart.y, zoom));
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

      setZoom(nextZoom);
      setPan(clampPan(newPanX, newPanY, nextZoom));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
  };

  const handleStationClick = (e: React.MouseEvent | React.TouchEvent, stationId: string) => {
    e.stopPropagation();
    haptic.light();
    setClickedStationId(stationId);
    onSelectStation(stationId);
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
  // Requirement: "in the metro map, only highlight the active journey (not the entire lines)"
  const baseLineOpacity = activeRoute ? 0.2 : 0.9;

  const clickedStation = clickedStationId ? STATIONS[clickedStationId] : null;

  // Filter stations to show based on showMetroLayer and showICLayer, or if on active journey
  const visibleStations = Object.values(STATIONS).filter((st) => {
    if (activeRoute && activeRoute.pathStationIds.includes(st.id)) return true;
    const hasMetro = st.lines.some((l) => !l.startsWith('IC'));
    const hasIC = st.lines.some((l) => l.startsWith('IC'));

    if (showMetroLayer && showICLayer) return true;
    if (showMetroLayer && !showICLayer) return hasMetro;
    if (!showMetroLayer && showICLayer) return hasIC;
    return false;
  });

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
      onClick={() => setClickedStationId(null)}
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
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col gap-1.5 sm:gap-2.5 items-end">
        {/* Card 1: Zoom & Reset */}
        <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden p-1">
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
        <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden p-1">
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

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 pointer-events-none max-w-[calc(100%-4.2rem)] sm:max-w-[calc(100%-6.5rem)]">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          <div className="text-[9px] sm:text-[10px] tracking-wider uppercase text-blue-600 dark:text-blue-400 font-bold">
            ÄÄPIZRM 044
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wide truncate">
            {t.map} {showMetroLayer && showICLayer ? '(U-Bahn + IC)' : showMetroLayer ? '(U-Bahn)' : showICLayer ? '(IC-Züge)' : ''}
          </h2>
          <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {activeRoute ? 'Aktive Verbindung hervorgehoben' : 'Gesamtnetz'}
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
            className="absolute top-14 left-3 right-3 sm:left-auto sm:right-4 sm:w-72 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xl text-xs text-slate-700 dark:text-slate-200"
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
            <div className="flex items-center gap-2.5">
              <span className="text-base">✈</span>
              <span>{t.airport}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚆</span>
              <span>{t.icTrains} (Umstieg)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚙️</span>
              <span>{t.transferRequired}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base">♿</span>
              <span>{t.accessible}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-2.5 rounded-md bg-slate-400 border border-slate-700 shrink-0" />
              <span>(Haupt-) Bahnhof / Umstieg</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-slate-700 shrink-0" />
              <span>{t.regularStation}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border border-purple-500 text-[8px] flex items-center justify-center font-bold text-purple-600 dark:text-purple-300 shrink-0">
                T
              </div>
              <span>{t.timTrainStation}</span>
            </div>
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div className="w-6 h-1.5 bg-rose-600 rounded-sm shrink-0" />
              <span className="font-semibold text-rose-600 dark:text-rose-400">IC-Zuglinie (Überland)</span>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main SVG Vector Canvas */}
      <svg
        viewBox={isMobile ? '280 20 670 610' : '0 0 1020 680'}
        className="w-full h-full transition-transform duration-75 origin-center select-none"
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <defs>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Railway tie pattern for IC Train tracks */}
          <pattern id="railPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="0" stroke="#000000" strokeWidth="2" />
          </pattern>
        </defs>

        {/* ----------------- BASE METRO LINES (BACKGROUND) ----------------- */}
        {/* When activeRoute exists, these are gently dimmed so ONLY the active journey stands out! */}
        {(showMetroLayer || (activeRoute && activeRoute.linesUsed.some((l) => !l.startsWith('IC')))) && (
          <g id="metro-train-layer" className="transition-opacity duration-300">
            {/* 1. GREEN LINE (U-Grün) */}
        <path
          d="
            M 485 82
            L 388 82
            L 388 216
            L 388 300
            L 388 412
            Q 388 458, 412 458
            L 458 458
            L 530 458
            Q 544 458, 544 480
            L 544 525
            Q 544 545, 520 545
            L 458 545
            L 458 620
            L 565 620
            L 690 620
            L 850 620
            Q 930 620, 930 570
            L 930 520
          "
          fill="none"
          stroke={METRO_LINES['U-Grün'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Grün' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />

        {/* 2. RED LINE (U-Rot) */}
        <path
          d="
            M 458 154
            L 394 154
            Q 394 154, 394 175
            L 394 216
            L 394 250
            L 458 250
            L 458 350
            L 530 350
            L 604 350
            L 604 275
          "
          fill="none"
          stroke={METRO_LINES['U-Rot'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Rot' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />

        {/* 3. ORANGE LINE (U-Orange) */}
        <path
          d="
            M 604 212
            L 530 212
            L 384 212
            L 384 300
            L 384 412
            Q 384 452, 412 452
            L 458 452
            L 530 452
            Q 538 452, 538 475
            L 538 525
            Q 538 535, 520 535
            L 458 535
          "
          fill="none"
          stroke={METRO_LINES['U-Orange'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Orange' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />

        {/* 4. BLUE LINE (U-Blau) */}
        <path
          d="
            M 380 216
            L 380 300
            L 380 412
            Q 380 446, 412 446
            L 458 446
            L 530 446
            Q 532 446, 532 470
            L 532 520
            Q 532 525, 520 525
            L 458 525
          "
          fill="none"
          stroke={METRO_LINES['U-Blau'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Blau' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />
        <path
          d="M 690 458 L 690 620"
          fill="none"
          stroke={METRO_LINES['U-Blau'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Blau' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />

        {/* 5. BLACK LINE (U-Schwarz) */}
        <path
          d="M 604 220 L 530 220"
          fill="none"
          stroke={METRO_LINES['U-Schwarz'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Schwarz' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />
        <path
          d="
            M 530 154
            L 530 216
            L 530 275
            L 530 350
            L 530 458
            L 690 458
            L 930 458
            L 930 520
          "
          fill="none"
          stroke={theme === 'dark' ? '#E2E8F0' : '#18181B'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'U-Schwarz' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />

        {/* 6. TIM TRAIN (Lila) */}
        <path
          d="
            M 530 154
            Q 530 196, 560 196
            L 636 196
            L 700 196
            L 772 196
          "
          fill="none"
          stroke={METRO_LINES['Tim-Train'].color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={activeLineFilter === 'ALL' || activeLineFilter === 'Tim-Train' ? baseLineOpacity : 0.08}
          className="transition-all duration-300"
        />
        </g>
        )}

        {/* ----------------- INTER CITY TRAINS (IC-ZÜGE) LAYER ----------------- */}
        {(showICLayer || (activeRoute && activeRoute.linesUsed.some((l) => l.startsWith('IC')))) && (
          <g id="ic-train-layer" className="transition-opacity duration-300">
            {/* IC Track Base Rail lines (charcoal railway styling) */}
            {/* IC-1 & IC-2: Central Station -> Rathaus -> Carl Station / Jurassic Park */}
            <path
              d="
                M 530 458
                L 440 490
                L 388 490
                L 388 412
                L 388 300
                L 388 216
              "
              fill="none"
              stroke="#E11D48"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-2 continuation: Rathaus -> Jurassic Park -> Carl's Hotel */}
            <path
              d="
                M 440 490
                L 295 490
                L 295 585
              "
              fill="none"
              stroke="#BE123C"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-3 & IC-6: Central Station -> Camp Carl -> Gare du Nord */}
            <path
              d="
                M 530 458
                L 690 495
                L 690 350
                L 530 350
              "
              fill="none"
              stroke="#9F1239"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-6: Camp Carl -> Coral Bay */}
            <path
              d="
                M 690 495
                L 870 495
              "
              fill="none"
              stroke="#C2410C"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-4 & IC-5: Gare du Nord -> Villen Viertel West -> Blue Lagoon / Willow Creek */}
            <path
              d="
                M 530 350
                L 530 120
                L 388 120
                L 388 82
              "
              fill="none"
              stroke="#881337"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-4 to Blue Lagoon */}
            <path
              d="
                M 388 82
                L 390 28
              "
              fill="none"
              stroke="#881337"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-5 to Willow Creek */}
            <path
              d="
                M 388 82
                L 300 82
              "
              fill="none"
              stroke="#B91C1C"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />

            {/* IC-7: City Center -> Mouwick */}
            <path
              d="
                M 604 216
                L 604 154
              "
              fill="none"
              stroke="#475569"
              strokeWidth="5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              strokeOpacity={baseLineOpacity + 0.1}
            />
          </g>
        )}

        {/* ----------------- ACTIVE JOURNEY HIGHLIGHT (ONLY THE TRAVELED PATH) ----------------- */}
        {/* Requirement: "in the metro map, only highlight the active journey (not the entire lines)" */}
        {activeRoute && (
          <g id="active-journey-highlight" filter="url(#routeGlow)">
            {activeRoute.legs.map((leg, legIdx) => {
              const line = METRO_LINES[leg.lineId];
              const stationCoords = leg.stations.map((id) => STATIONS[id]).filter(Boolean);
              if (stationCoords.length < 2) return null;

              const pathD = stationCoords.reduce((acc, st, i) => {
                return i === 0 ? `M ${st.x} ${st.y}` : `${acc} L ${st.x} ${st.y}`;
              }, '');

              return (
                <React.Fragment key={`active-leg-${legIdx}`}>
                  {/* Thick glowing underlay in line color */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={line?.color || '#38BDF8'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-95"
                  />
                  {/* Crisp animated center stroke */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 6"
                    className="animate-train-flow"
                  />
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* ----------------- STATION NODES ----------------- */}
        {visibleStations.map((station) => {
          const isOrigin = selectedOriginId === station.id;
          const isDest = selectedDestinationId === station.id;
          const isStopover = selectedStopoverId === station.id;
          const isTransfer = isTransferStation(station.id);
          const isOnRoute = isStationOnRoute(station.id);
          const isHovered = hoveredStationId === station.id;
          const isClicked = clickedStationId === station.id;

          const pillWidth = station.id === 'central-station' ? 26 : 22;
          const pillHeight = station.id === 'central-station' ? 15 : 13;

          // Node styling based on journey participation
          const nodeColor = isOrigin
            ? '#10B981'
            : isDest
            ? '#EF4444'
            : isStopover
            ? '#38BDF8'
            : isTransfer
            ? '#F59E0B'
            : isOnRoute
            ? '#FFFFFF'
            : theme === 'dark'
            ? '#CBD5E1'
            : '#64748B';

          const nodeOpacity = activeRoute && !isOnRoute ? 0.35 : 1;

          return (
            <g
              key={station.id}
              className="cursor-pointer group transition-opacity duration-200"
              style={{ opacity: nodeOpacity }}
              onClick={(e) => handleStationClick(e, station.id)}
              onMouseEnter={() => setHoveredStationId(station.id)}
              onMouseLeave={() => setHoveredStationId(null)}
            >
              {/* Highlight Halo for Selected / Active Journey Nodes */}
              {(isOrigin || isDest || isStopover || isTransfer || isClicked) && (
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={isOrigin || isDest || isStopover ? 20 : 16}
                  fill={
                    isOrigin
                      ? '#10B981'
                      : isDest
                      ? '#EF4444'
                      : isStopover
                      ? '#38BDF8'
                      : '#F59E0B'
                  }
                  fillOpacity="0.3"
                  className="animate-ping"
                />
              )}

              {/* Station Geometric Marker */}
              {station.isInterchange ? (
                // Umsteigebahnhof / Hauptbahnhof: Pill / Rounded Capsule
                <rect
                  x={station.x - pillWidth / 2}
                  y={station.y - pillHeight / 2}
                  width={pillWidth}
                  height={pillHeight}
                  rx={pillHeight / 2}
                  fill={nodeColor}
                  stroke={isClicked ? '#38BDF8' : theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={isClicked ? 3 : 2}
                  className="transition-transform group-hover:scale-110 shadow-md"
                />
              ) : (
                // Regular Haltestelle: Circle
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={isOrigin || isDest || isStopover ? 8 : 5.5}
                  fill={nodeColor}
                  stroke={isClicked ? '#38BDF8' : theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={isClicked ? 3 : 2}
                  className="transition-transform group-hover:scale-125 shadow-md"
                />
              )}

              {/* Center Dot for visual fidelity */}
              <circle
                cx={station.x}
                cy={station.y}
                r={2}
                fill={isOrigin || isDest || isStopover ? '#FFFFFF' : '#1E293B'}
              />

              {/* ----------------- ICONS (SEPARATED FROM TEXT SO THEY NEVER OVERLAP) ----------------- */}
              {/* ✈ Airport Icon */}
              {station.hasAirport && (
                <g
                  transform={`translate(${
                    station.labelPosition === 'left'
                      ? station.x + 16
                      : station.labelPosition === 'right'
                      ? station.x - 16
                      : station.x
                  }, ${
                    station.labelPosition === 'top'
                      ? station.y + 16
                      : station.labelPosition === 'bottom'
                      ? station.y - 14
                      : station.y + 1
                  })`}
                >
                  <circle
                    r="7.5"
                    fill="#0284C7"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="9"
                    fill="#FFFFFF"
                    className="pointer-events-none select-none font-bold"
                  >
                    ✈
                  </text>
                </g>
              )}

              {/* 🚆 IC Train Icon */}
              {station.hasIC && !station.isICOnly && (
                <g
                  transform={`translate(${
                    station.labelPosition === 'left'
                      ? station.x + (station.isInterchange ? 20 : 16)
                      : station.labelPosition === 'right'
                      ? station.x - (station.isInterchange ? 20 : 16)
                      : station.x + 14
                  }, ${
                    station.labelPosition === 'bottom'
                      ? station.y - 12
                      : station.labelPosition === 'top'
                      ? station.y + 14
                      : station.y - 1
                  })`}
                >
                  <rect
                    x="-6"
                    y="-6"
                    width="12"
                    height="12"
                    rx="3"
                    fill="#E11D48"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#FFFFFF"
                    className="pointer-events-none select-none"
                  >
                    🚆
                  </text>
                </g>
              )}

              {/* ⚙️ Transfer Required Icon (IC) */}
              {station.hasICTransferRequired && (
                <g
                  transform={`translate(${
                    station.labelPosition === 'left'
                      ? station.x + 16
                      : station.x - 16
                  }, ${
                    station.labelPosition === 'bottom'
                      ? station.y - 12
                      : station.labelPosition === 'top'
                      ? station.y + 14
                      : station.y
                  })`}
                >
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="10"
                    className="pointer-events-none select-none"
                  >
                    ⚙️
                  </text>
                </g>
              )}

              {/* ♿ Wheelchair Accessible Icon */}
              {station.isAccessible && (
                <g
                  transform={`translate(${
                    station.labelPosition === 'left'
                      ? station.x + (station.hasIC ? 32 : 16)
                      : station.labelPosition === 'right'
                      ? station.x - (station.hasIC ? 32 : 16)
                      : station.x - 16
                  }, ${
                    station.labelPosition === 'bottom'
                      ? station.y - 12
                      : station.labelPosition === 'top'
                      ? station.y + 14
                      : station.y - 1
                  })`}
                >
                  <rect
                    x="-5"
                    y="-5"
                    width="11"
                    height="11"
                    rx="2"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                    className="shadow-sm"
                  />
                  <text
                    x="0.5"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#FFFFFF"
                    className="pointer-events-none select-none"
                  >
                    ♿
                  </text>
                </g>
              )}

              {/* (T) Tim Train Icon */}
              {station.isTimTrain && (
                <g
                  transform={`translate(${
                    station.labelPosition === 'bottom'
                      ? station.x
                      : station.labelPosition === 'top'
                      ? station.x + 16
                      : station.x
                  }, ${
                    station.labelPosition === 'bottom'
                      ? station.y - 14
                      : station.labelPosition === 'top'
                      ? station.y
                      : station.y - 14
                  })`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="6"
                    fill="#8B5CF6"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    className="pointer-events-none select-none"
                  >
                    T
                  </text>
                </g>
              )}

              {/* ----------------- STATION LABELS ----------------- */}
              <text
                x={
                  station.labelPosition === 'left'
                    ? station.x - (station.isInterchange ? 18 : 14)
                    : station.labelPosition === 'right'
                    ? station.x + (station.isInterchange ? 18 : 14)
                    : station.x
                }
                y={
                  station.labelPosition === 'top'
                    ? station.y - (station.isInterchange ? 16 : 13)
                    : station.labelPosition === 'bottom'
                    ? station.y + (station.isInterchange ? 20 : 17)
                    : station.y + 4
                }
                textAnchor={
                  station.labelPosition === 'left'
                    ? 'end'
                    : station.labelPosition === 'right'
                    ? 'start'
                    : 'middle'
                }
                fontSize={station.isInterchange || isOrigin || isDest || isStopover ? '10' : '9'}
                fontWeight={station.isInterchange || isOrigin || isDest || isStopover ? '700' : '600'}
                fill={
                  isOrigin
                    ? '#10B981'
                    : isDest
                    ? '#EF4444'
                    : isStopover
                    ? '#38BDF8'
                    : isTransfer
                    ? '#F59E0B'
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
                className="select-none pointer-events-none transition-colors font-sans"
              >
                {station.name}
              </text>
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
              }}
              transform={`translate(${x}, ${y})`}
            >
              {/* Pulsing Warning Halo */}
              <circle
                r="18"
                fill="#EF4444"
                fillOpacity="0.25"
                className="animate-ping"
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
                className="shadow-lg filter drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-3 right-3 sm:top-4 sm:left-auto sm:right-16 sm:max-w-xs z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl space-y-2"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.tripSummary}</span>
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                ~{activeRoute.totalDurationMinutes} {t.min}
              </span>
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

            {onNavigateToPlanner && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic.medium();
                  onNavigateToPlanner();
                }}
                className="w-full mt-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition"
              >
                <span>{t.viewInTripPlanner}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
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
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-slate-900/10 active:scale-95"
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
              className="w-[195px] max-h-56 flex flex-col p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-xs shadow-slate-950/20"
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
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute bottom-22 sm:bottom-24 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-96 max-h-[calc(100%-6.5rem)] overflow-y-auto z-45 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/70 dark:border-amber-500/60 rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-amber-500 text-white shrink-0 shadow-md shadow-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                    {t.disruptionDetails}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDisruption.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  haptic.light();
                  setSelectedDisruption(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                      onClick={async () => {
                        if (window.confirm(t.confirmDeleteDisruption)) {
                          haptic.medium();
                          const id = selectedDisruption.id;
                          setSelectedDisruption(null);
                          await onDeleteDisruption(id);
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 active:scale-95 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1.5 border border-rose-200 dark:border-rose-900 shadow-xs transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.deleteDisruption}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Station Quick Action Sheet on Map */}
      <AnimatePresence>
        {clickedStation && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute bottom-22 sm:bottom-24 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-84 max-h-[calc(100%-6.5rem)] overflow-y-auto z-45 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
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
                      🚆 IC-Züge
                    </span>
                  )}
                  {clickedStation.isAccessible && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-medium">
                      ♿ {t.accessible}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {clickedStation.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {clickedStation.description}
                </p>
              </div>
              <button
                onClick={() => {
                  haptic.light();
                  setClickedStationId(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ×
              </button>
            </div>

            {routePlanningEnabled ? (
              <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                    <span>{t.stopover}</span>
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
            ) : (
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{t.mapStationInfoOnly}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
