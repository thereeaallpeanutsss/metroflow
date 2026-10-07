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

  // Tab & Dock measurements for smooth dragging and precision centering
  const dockRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabLayouts, setTabLayouts] = useState<TabLayout[]>([]);

  // Dragging & Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [hoveredTabIndex, setHoveredTabIndex] = useState<number>(() =>
    Math.max(0, tabs.findIndex((tb) => tb.id === activeTab))
  );

  // Temporary lift state during tap transition (matches the video: "lifts up temporarily into Liquid Glass")
  const [isLiftedTransit, setIsLiftedTransit] = useState(false);
  const transitTimeoutRef = useRef<number | null>(null);

  const dragStartRef = useRef<{
    pointerStartX: number;
    initialLensLeft: number;
    hasMoved: boolean;
  }>({
    pointerStartX: 0,
    initialLensLeft: currentLeftOrZero(tabLayouts, activeTab, tabs),
    hasMoved: false,
  });

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tb) => tb.id === activeTab)
  );

  function currentLeftOrZero(layouts: TabLayout[], currentId: AppTab, allTabs: typeof tabs): number {
    const idx = allTabs.findIndex((tb) => tb.id === currentId);
    return layouts[idx]?.left ?? 0;
  }

  // Measure tab button positions inside dock with sub-pixel precision
  const updateLayouts = () => {
    const dockEl = dockRef.current;
    if (!dockEl) return;
    const dockRect = dockEl.getBoundingClientRect();

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
  }, [language, tabBarStyle, activeTab]);

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
    };
  }, []);

  // Sync hovered tab when not dragging
  useEffect(() => {
    if (!isDragging) {
      setHoveredTabIndex(activeIndex);
    }
  }, [activeIndex, isDragging]);

  const triggerTransitLift = () => {
    setIsLiftedTransit(true);
    if (transitTimeoutRef.current) clearTimeout(transitTimeoutRef.current);
    transitTimeoutRef.current = window.setTimeout(() => {
      setIsLiftedTransit(false);
    }, 280);
  };

  // Pointer drag handlers on the floating liquid glass lens
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const currentLeft = tabLayouts[activeIndex]?.left ?? 0;

    dragStartRef.current = {
      pointerStartX: e.clientX,
      initialLensLeft: currentLeft,
      hasMoved: false,
    };

    setDragX(currentLeft);
    setIsDragging(true);
    setHoveredTabIndex(activeIndex);
    haptic.selection();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.pointerStartX;
    if (Math.abs(deltaX) > 4) {
      dragStartRef.current.hasMoved = true;
    }

    const rawLeft = dragStartRef.current.initialLensLeft + deltaX;

    // Constrain within dock boundaries
    const firstTab = tabLayouts[0];
    const lastTab = tabLayouts[tabs.length - 1];
    const activeWidth = tabLayouts[activeIndex]?.width ?? 58;

    const minLeft = firstTab ? firstTab.left : 4;
    const maxLeft = lastTab ? lastTab.left + lastTab.width - activeWidth : 220;
    const clampedLeft = Math.max(minLeft, Math.min(rawLeft, maxLeft));

    setDragX(clampedLeft);

    // Calculate nearest tab to the center of the lens
    const lensCenter = clampedLeft + activeWidth / 2;
    let closestIndex = activeIndex;
    let minDistance = Infinity;

    tabLayouts.forEach((layout, idx) => {
      const dist = Math.abs(layout.centerX - lensCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    if (closestIndex !== hoveredTabIndex) {
      setHoveredTabIndex(closestIndex);
      haptic.selection(); // Crisp tactile tick as you glide over each icon
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const wasDrag = dragStartRef.current.hasMoved;
    const targetIdx = hoveredTabIndex;

    // Reset drag tracking state
    dragStartRef.current.hasMoved = false;
    setIsDragging(false);
    setDragX(null);

    if (wasDrag) {
      if (tabs[targetIdx] && tabs[targetIdx].id !== activeTab) {
        haptic.medium();
        onChangeTab(tabs[targetIdx].id);
      }
    } else {
      // Direct tap on glass item
      haptic.selection();
    }
  };

  const handleSelectTab = (tabId: AppTab) => {
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
                onClick={() => handleSelectTab(tab.id)}
                whileTap={{ scale: 0.9 }}
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
  const activeLayout = tabLayouts[activeIndex];
  const targetLeft = activeLayout?.left ?? (activeIndex * 60 + 6);
  const targetWidth = activeLayout?.width ?? 60;

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
      {/* Outer Floating Dock Track */}
      <div
        ref={dockRef}
        className="relative p-1.5 rounded-full bg-slate-100/75 dark:bg-slate-900/75 backdrop-blur-3xl backdrop-saturate-150 border border-black/5 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.1)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.65)] flex items-center justify-center gap-1 overflow-visible"
      >
        {/* Soft bevel rim */}
        <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-white/60 dark:ring-white/10" />
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

        {/* ---------------------------------------------------- */}
        {/* Liquid Glass Item (100% Colorless Optical Glass)     */}
        {/* Lifts up into 3D on interaction, visually quiet at rest*/}
        {/* ---------------------------------------------------- */}
        {tabLayouts.length > 0 && (
          <motion.div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            animate={{
              x: isDragging ? (dragX ?? targetLeft) : targetLeft,
              width: targetWidth,
              y: isLifted ? -7 : 0,
              scale: isLifted ? 1.05 : 1,
            }}
            transition={
              isDragging
                ? { type: 'spring', stiffness: 950, damping: 50, mass: 0.6 }
                : { type: 'spring', stiffness: 450, damping: 30, mass: 0.75 }
            }
            className={`absolute left-0 top-1.5 bottom-1.5 rounded-full z-30 touch-none select-none cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
              isLifted
                ? 'shadow-[0_16px_32px_-4px_rgba(0,0,0,0.22),0_6px_12px_-2px_rgba(0,0,0,0.12),inset_0_2px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(0,0,0,0.12),inset_3px_0_3px_rgba(255,255,255,0.45),inset_-3px_0_3px_rgba(255,255,255,0.45)]'
                : 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.8),inset_0_-1px_1.5px_rgba(0,0,0,0.08),inset_2px_0_2.5px_rgba(255,255,255,0.35),inset_-2px_0_2.5px_rgba(255,255,255,0.35)]'
            }`}
            style={{
              left: 0,
              // Crystal-clear colorless optical liquid glass
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.02) 100%)',
              backdropFilter: 'blur(20px) saturate(120%)',
              WebkitBackdropFilter: 'blur(20px) saturate(120%)',
            }}
          >
            {/* 1. Curved polished glass outer rim - neutral pure white bevel */}
            <div className="absolute inset-0 rounded-full border border-white/70 dark:border-white/30 pointer-events-none ring-1 ring-inset ring-white/40 dark:ring-white/15" />

            {/* 2. Secondary inner refraction boundary (curved meniscus bevel) */}
            <div className="absolute inset-[1.5px] rounded-full border border-white/30 dark:border-white/15 pointer-events-none" />

            {/* 3. Left curved flank caustic distortion lens (neutral pure white reflection) */}
            <div className="absolute inset-y-1 left-0.5 w-2.5 rounded-l-full bg-gradient-to-r from-white/40 via-white/15 to-transparent pointer-events-none blur-[0.4px]" />

            {/* 4. Right curved flank caustic distortion lens (neutral pure white reflection) */}
            <div className="absolute inset-y-1 right-0.5 w-2.5 rounded-r-full bg-gradient-to-l from-white/40 via-white/15 to-transparent pointer-events-none blur-[0.4px]" />

            {/* 5. Overhead convex crest light (crisp pure white highlight) */}
            <div className="absolute inset-x-2.5 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none opacity-90" />

            {/* 6. Bottom edge subtle caustic reflection */}
            <div className="absolute inset-x-3.5 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            {/* 7. Convex lens surface radial reflection */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.03)_55%,transparent_75%)] pointer-events-none opacity-90" />
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* Menu Page Buttons & Icons (Underneath the Liquid Lens)*/}
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
              onClick={() => handleSelectTab(tab.id)}
              className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-full flex flex-col items-center justify-center min-w-[3.4rem] sm:min-w-[4rem] select-none transition-colors duration-150 z-20 cursor-pointer ${
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
                      ? 'scale-105 text-slate-900 dark:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                      : ''
                  }`}
                />
              </div>

              {/* Label */}
              <span className="text-[9.5px] sm:text-[10px] tracking-tight pointer-events-none leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
