import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { Home, Compass, Map, Layers, Settings } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

export type AppTab = 'home' | 'plan' | 'map' | 'lines' | 'options';
export type TabBarStyle = 'ios26' | 'classic';

interface TabBarProps {
  language: Language;
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  tabBarStyle?: TabBarStyle;
}

interface TabLayout {
  left: number;
  width: number;
  centerX: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  language,
  activeTab,
  onChangeTab,
  tabBarStyle = 'ios26',
}) => {
  const t = translations[language];

  const tabs: Array<{
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'plan', label: t.planner, icon: Compass },
    { id: 'map', label: t.map, icon: Map },
    { id: 'lines', label: t.lines, icon: Layers },
    { id: 'options', label: t.options, icon: Settings },
  ];

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tb) => tb.id === activeTab)
  );

  // Tab & Dock measurements for smooth dragging and precision centering
  const dockRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Default initial layouts so lens renders immediately without mounting flash
  const [tabLayouts, setTabLayouts] = useState<TabLayout[]>(() =>
    [0, 1, 2, 3, 4].map((i) => ({
      left: 6 + i * 62,
      width: 62,
      centerX: 6 + i * 62 + 31,
    }))
  );

  // Dragging & Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [hoveredTabIndex, setHoveredTabIndex] = useState<number>(activeIndex);

  // Temporary lift state during tap transition (matches the video: "lifts up temporarily into Liquid Glass")
  const [isLiftedTransit, setIsLiftedTransit] = useState(false);
  const transitTimeoutRef = useRef<number | null>(null);

  // Ref tracking for active pointer drag session
  const dragTrackingRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    initialLensLeft: number;
    lensWidth: number;
    hasMoved: boolean;
    clickedTabId: AppTab | null;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    initialLensLeft: 0,
    lensWidth: 62,
    hasMoved: false,
    clickedTabId: null,
  });

  const justDraggedRef = useRef(false);
  const justDraggedTimeoutRef = useRef<number | null>(null);

  // Measure tab button positions inside dock with sub-pixel precision
  const updateLayouts = () => {
    const dockEl = dockRef.current;
    if (!dockEl) return;
    const dockRect = dockEl.getBoundingClientRect();
    if (dockRect.width === 0) return;

    const layouts: TabLayout[] = tabs.map((_, idx) => {
      const btn = tabRefs.current[idx];
      if (!btn) {
        const approxWidth = (dockRect.width - 12) / tabs.length;
        const left = 6 + idx * approxWidth;
        return { left, width: approxWidth, centerX: left + approxWidth / 2 };
      }
      const rect = btn.getBoundingClientRect();
      const left = rect.left - dockRect.left;
      const width = rect.width;
      return {
        left,
        width,
        centerX: left + width / 2,
      };
    });

    setTabLayouts(layouts);
  };

  useLayoutEffect(() => {
    updateLayouts();
  }, [language, tabBarStyle]);

  useEffect(() => {
    updateLayouts();
    const handleResize = () => updateLayouts();
    window.addEventListener('resize', handleResize);

    // ResizeObserver ensures accurate layouts whenever fonts or elements settle
    let observer: ResizeObserver | null = null;
    if (dockRef.current) {
      observer = new ResizeObserver(() => {
        updateLayouts();
      });
      observer.observe(dockRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
      if (transitTimeoutRef.current) clearTimeout(transitTimeoutRef.current);
      if (justDraggedTimeoutRef.current) clearTimeout(justDraggedTimeoutRef.current);
    };
  }, []);

  const hoveredTabIndexRef = useRef<number>(activeIndex);

  // Sync hovered tab when not dragging
  useEffect(() => {
    if (!isDragging) {
      setHoveredTabIndex(activeIndex);
      hoveredTabIndexRef.current = activeIndex;
    }
  }, [activeIndex, isDragging]);

  const triggerTransitLift = () => {
    setIsLiftedTransit(true);
    if (transitTimeoutRef.current) clearTimeout(transitTimeoutRef.current);
    transitTimeoutRef.current = window.setTimeout(() => {
      setIsLiftedTransit(false);
    }, 280);
  };

  const cleanupGlobalPointer = () => {
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', handleGlobalPointerUp);

    dragTrackingRef.current.pointerId = null;
    dragTrackingRef.current.hasMoved = false;
    setIsDragging(false);
    setDragX(null);
  };

  const handleGlobalPointerMove = (e: PointerEvent) => {
    const tracking = dragTrackingRef.current;
    if (tracking.pointerId === null || e.pointerId !== tracking.pointerId) return;

    const deltaX = e.clientX - tracking.startX;
    const deltaY = e.clientY - tracking.startY;

    if (!tracking.hasMoved) {
      // Threshold: 6 pixels horizontally to distinguish between a tap and a drag
      if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
        tracking.hasMoved = true;
        setIsDragging(true);
        haptic.selection();
      } else if (Math.abs(deltaY) > 10) {
        // Vertical gesture, abort drag so user can scroll freely
        cleanupGlobalPointer();
        return;
      }
    }

    if (tracking.hasMoved) {
      if (e.cancelable) e.preventDefault();

      const rawLeft = tracking.initialLensLeft + deltaX;
      const firstTab = tabLayouts[0];
      const lastTab = tabLayouts[tabs.length - 1];
      const minLeft = firstTab ? firstTab.left : 4;
      const maxLeft = lastTab ? lastTab.left + lastTab.width - tracking.lensWidth : 240;
      const clampedLeft = Math.max(minLeft, Math.min(rawLeft, maxLeft));

      setDragX(clampedLeft);

      // Find closest tab to lens center
      const lensCenter = clampedLeft + tracking.lensWidth / 2;
      let closestIdx = activeIndex;
      let minDistance = Infinity;

      tabLayouts.forEach((layout, idx) => {
        const dist = Math.abs(layout.centerX - lensCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (hoveredTabIndexRef.current !== closestIdx) {
        hoveredTabIndexRef.current = closestIdx;
        setHoveredTabIndex(closestIdx);
        haptic.selection(); // crisp tactile tick as glass lens passes each icon

        // Select menu when being hovered over a menu item
        const hoveredTab = tabs[closestIdx];
        if (hoveredTab) {
          onChangeTab(hoveredTab.id);
        }
      }
    }
  };

  const handleGlobalPointerUp = (e: PointerEvent) => {
    const tracking = dragTrackingRef.current;
    if (tracking.pointerId === null || e.pointerId !== tracking.pointerId) return;

    const wasMoved = tracking.hasMoved;
    const clickedId = tracking.clickedTabId;
    const targetIdx = hoveredTabIndexRef.current;

    cleanupGlobalPointer();

    if (wasMoved) {
      justDraggedRef.current = true;
      if (justDraggedTimeoutRef.current) clearTimeout(justDraggedTimeoutRef.current);
      justDraggedTimeoutRef.current = window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 150);

      // Ensure the hovered tab stays selected and lens rests above it
      const targetTab = tabs[targetIdx];
      if (targetTab) {
        haptic.medium();
        onChangeTab(targetTab.id);
      }
    } else if (clickedId) {
      // Direct tap on a tab button
      handleSelectTab(clickedId);
    }
  };

  const handleDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const dockEl = dockRef.current;
    if (!dockEl) return;
    const dockRect = dockEl.getBoundingClientRect();
    const relX = e.clientX - dockRect.left;

    // Identify which tab was pressed (if any)
    let clickedId: AppTab | null = null;
    tabLayouts.forEach((l, idx) => {
      if (relX >= l.left && relX <= l.left + l.width) {
        clickedId = tabs[idx]?.id ?? null;
      }
    });

    const curLeft = tabLayouts[activeIndex]?.left ?? (activeIndex * 62 + 6);
    const curWidth = tabLayouts[activeIndex]?.width ?? 62;

    dragTrackingRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialLensLeft: curLeft,
      lensWidth: curWidth,
      hasMoved: false,
      clickedTabId: clickedId,
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
  };

  const handleSelectTab = (tabId: AppTab) => {
    if (justDraggedRef.current) return;
    if (tabId !== activeTab) {
      triggerTransitLift();
      haptic.selection();
      onChangeTab(tabId);
    }
  };

  // ----------------------------------------------------
  // 1. Classic Full-Width Edge-to-Edge Navigation Bar
  // ----------------------------------------------------
  if (tabBarStyle === 'classic') {
    return (
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800/80 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-2xl transition-colors"
      >
        <div className="max-w-md mx-auto px-4 flex items-center justify-around relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                whileTap={{ scale: 0.9 }}
                data-active={isActive ? 'true' : 'false'}
                className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className="relative p-1 rounded-xl">
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicatorClassic"
                      className="absolute inset-0 bg-slate-900/10 dark:bg-white/15 rounded-xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight relative z-10">
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    );
  }

  // ----------------------------------------------------
  // 2. Liquid Glass Floating Dock (Pure Colorless Optical Glass)
  // Matching the design showcase:
  // - "Elements can even lift up into Liquid Glass temporarily, such as when you interact with a component."
  // - "This lets the resting state stay visually quiet, while it comes to life on touch."
  // ----------------------------------------------------
  const activeLayout = tabLayouts[activeIndex] || {
    left: activeIndex * 62 + 6,
    width: 62,
    centerX: activeIndex * 62 + 37,
  };
  const targetLeft = activeLayout.left;
  const targetWidth = activeLayout.width;

  // Is currently lifted in 3D (dragging or transitioning on tap)
  const isLifted = isDragging || isLiftedTransit;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 'max(env(safe-area-inset-bottom, 0px), 0.85rem)',
        left: 0,
        right: 0,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: 'max-content',
        maxWidth: 'calc(100vw - 1.25rem)',
        zIndex: 50,
      }}
      className="fixed bottom-3 sm:bottom-4 inset-x-0 mx-auto w-max max-w-[calc(100vw-1.25rem)] sm:max-w-md z-50 pointer-events-auto select-none"
    >
      {/* Outer Floating Dock Track with unified gesture tracking */}
      <div
        ref={dockRef}
        onPointerDown={handleDockPointerDown}
        className="relative p-1.5 rounded-full bg-slate-100/75 dark:bg-slate-900/75 backdrop-blur-3xl backdrop-saturate-150 border border-black/5 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.1)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.65)] flex items-center justify-center gap-1 overflow-visible touch-none cursor-grab active:cursor-grabbing"
      >
        {/* Soft bevel rim */}
        <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-white/60 dark:ring-white/10" />
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

        {/* ---------------------------------------------------- */}
        {/* Liquid Glass Item (100% Colorless Optical Glass)     */}
        {/* Lifts up into 3D on interaction, visually quiet at rest*/}
        {/* ---------------------------------------------------- */}
        <motion.div
          animate={{
            x: isDragging ? (dragX ?? targetLeft) : targetLeft,
            width: targetWidth,
            y: isLifted ? -6 : 0,
            scale: isLifted ? 1.04 : 1,
          }}
          transition={
            isDragging
              ? { type: 'spring', stiffness: 900, damping: 55, mass: 0.5 }
              : { type: 'spring', stiffness: 360, damping: 28, mass: 0.7 }
          }
          className={`dock-glass-lens absolute left-0 top-1.5 bottom-1.5 rounded-full z-20 pointer-events-none select-none transition-shadow duration-200 ${
            isLifted
              ? 'shadow-[0_12px_24px_-4px_rgba(0,0,0,0.18),0_4px_8px_-2px_rgba(0,0,0,0.1),inset_0_1.5px_2px_rgba(255,255,255,0.6),inset_0_-1px_1.5px_rgba(0,0,0,0.1),inset_2px_0_2px_rgba(255,255,255,0.25),inset_-2px_0_2px_rgba(255,255,255,0.25)]'
              : 'shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.06),inset_1.5px_0_2px_rgba(255,255,255,0.2),inset_-1.5px_0_2px_rgba(255,255,255,0.2)]'
          }`}
          style={{
            left: 0,
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.01) 100%)',
            backdropFilter: 'blur(5px) saturate(130%)',
            WebkitBackdropFilter: 'blur(5px) saturate(130%)',
          }}
        >
          {/* 1. Curved polished glass outer rim */}
          <div className="absolute inset-0 rounded-full border border-white/50 dark:border-white/25 pointer-events-none ring-1 ring-inset ring-white/30 dark:ring-white/10" />

          {/* 2. Secondary inner refraction boundary */}
          <div className="absolute inset-[1.5px] rounded-full border border-white/20 dark:border-white/10 pointer-events-none" />

          {/* 3. Left curved flank caustic distortion lens */}
          <div className="absolute inset-y-1 left-0.5 w-2 rounded-l-full bg-gradient-to-r from-white/25 via-white/10 to-transparent pointer-events-none blur-[0.4px] opacity-40" />

          {/* 4. Right curved flank caustic distortion lens */}
          <div className="absolute inset-y-1 right-0.5 w-2 rounded-r-full bg-gradient-to-l from-white/25 via-white/10 to-transparent pointer-events-none blur-[0.4px] opacity-40" />

          {/* 5. Overhead convex crest light */}
          <div className="absolute inset-x-2.5 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none opacity-75" />

          {/* 6. Bottom edge subtle caustic reflection */}
          <div className="absolute inset-x-3.5 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          {/* 7. Convex lens surface radial reflection */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.02)_55%,transparent_75%)] pointer-events-none opacity-30" />
        </motion.div>

        {/* ---------------------------------------------------- */}
        {/* Menu Page Buttons & Icons (Sharp & readable above lens)*/}
        {/* ---------------------------------------------------- */}
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = isDragging && hoveredTabIndex === idx;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              data-active={isActive ? 'true' : 'false'}
              className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-full flex flex-col items-center justify-center min-w-[3.4rem] sm:min-w-[4rem] select-none transition-colors duration-150 z-30 cursor-pointer ${
                isActive || isHovered
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Icon */}
              <div className="relative flex items-center justify-center mb-0.5 pointer-events-none">
                <Icon
                  className={`w-4 h-4 sm:w-[1.15rem] sm:h-[1.15rem] transition-all duration-200 ${
                    isActive || isHovered
                      ? 'scale-105 text-slate-900 dark:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]'
                      : ''
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[9.5px] sm:text-[10px] tracking-tight pointer-events-none leading-tight ${
                  isActive || isHovered ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : ''
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
