import React, { useState, useEffect, useRef } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
import { STATIONS, METRO_LINES } from '../data/metroData';
import { Language, translations } from '../utils/i18n';
import { haptic } from '../utils/haptics';

interface DragWaypoint {
  uid: string;
  stationId: string;
}

interface StopoverListProps {
  language: Language;
  stopoverIds: string[];
  variant: 'classic' | 'ios';
  onEditStopover: (index: number) => void;
  onRemoveStopover: (index: number) => void;
  onReorderStopovers: (newStopoverIds: string[]) => void;
}

interface StopoverRowProps {
  item: DragWaypoint;
  index: number;
  totalCount: number;
  language: Language;
  variant: 'classic' | 'ios';
  onEdit: () => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}

const StopoverRow: React.FC<StopoverRowProps> = ({
  item,
  index,
  totalCount,
  language,
  variant,
  onEdit,
  onRemove,
  onMove,
}) => {
  const dragControls = useDragControls();
  const t = translations[language];
  const station = STATIONS[item.stationId];

  if (variant === 'ios') {
    return (
      <Reorder.Item
        value={item}
        dragListener={false}
        dragControls={dragControls}
        layout="position"
        whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: '0 10px 24px rgba(0,0,0,0.16)' }}
        className="relative"
      >
        <span className="absolute -left-[18px] top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center ring-4 ring-amber-500/20 z-10 shadow-xs">
          {index + 1}
        </span>

        <div className="w-full py-1.5 pl-2 pr-2 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 flex items-center gap-1.5">
          {/* Drag Handle */}
          {totalCount > 1 && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                haptic.selection();
                dragControls.start(e);
              }}
              style={{ touchAction: 'none' }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-200/70 dark:hover:bg-zinc-700/70 cursor-grab active:cursor-grabbing shrink-0 select-none"
              title={t.dragToReorderStops}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Tap to edit station */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onEdit();
            }}
            className="flex-1 min-w-0 py-0.5 px-1.5 text-left cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-amber-500 block leading-none mb-0.5">
              {t.waypointLabel} {totalCount > 1 ? `#${index + 1}` : ''}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
              {station?.name || item.stationId}
            </span>
          </button>

          {/* Up/Down + Remove Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            {totalCount > 1 && (
              <>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.selection();
                    onMove(-1);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none"
                  title={t.moveUp}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === totalCount - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic.selection();
                    onMove(1);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none"
                  title={t.moveDown}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                haptic.light();
                onRemove();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
              title={t.removeStopover}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Reorder.Item>
    );
  }

  // Classic / Minecraft Variant
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: '0 10px 24px rgba(0,0,0,0.16)' }}
      className="relative flex items-center gap-1.5"
    >
      <div className="flex-1 flex items-center gap-1.5 py-2 pl-2 pr-2 rounded-2xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 transition">
        {totalCount > 1 && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              haptic.selection();
              dragControls.start(e);
            }}
            style={{ touchAction: 'none' }}
            className="p-1.5 rounded-xl text-blue-500/70 hover:text-blue-600 dark:text-blue-400/70 dark:hover:text-blue-300 hover:bg-blue-200/50 dark:hover:bg-blue-900/40 cursor-grab active:cursor-grabbing shrink-0 select-none"
            title={t.dragToReorderStops}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
          {index + 1}
        </span>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            onEdit();
          }}
          className="flex-1 min-w-0 flex items-center justify-between text-left"
        >
          <div className="truncate">
            <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 block leading-none mb-0.5">
              {t.stopoverStation} {totalCount > 1 ? `#${index + 1}` : ''}
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
              {station ? station.name : item.stationId}
            </span>
          </div>
          {station && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {station.lines.slice(0, 2).map((lId) => (
                <span
                  key={lId}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: METRO_LINES[lId]?.color }}
                >
                  {METRO_LINES[lId]?.badge}
                </span>
              ))}
            </div>
          )}
        </button>

        {totalCount > 1 && (
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                haptic.selection();
                onMove(-1);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:pointer-events-none"
              title={t.moveUp}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={(e) => {
                e.stopPropagation();
                haptic.selection();
                onMove(1);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:pointer-events-none"
              title={t.moveDown}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          haptic.light();
          onRemove();
        }}
        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0"
        title={t.removeStopover}
      >
        <X className="w-4 h-4" />
      </button>
    </Reorder.Item>
  );
};

export const StopoverList: React.FC<StopoverListProps> = ({
  language,
  stopoverIds,
  variant,
  onEditStopover,
  onRemoveStopover,
  onReorderStopovers,
}) => {
  const uidCounterRef = useRef(0);
  const [items, setItems] = useState<DragWaypoint[]>(() =>
    stopoverIds.map((stId) => {
      uidCounterRef.current += 1;
      return { uid: `wp-${uidCounterRef.current}`, stationId: stId };
    })
  );

  useEffect(() => {
    const currentSeq = items.map((i) => i.stationId).join('|');
    const targetSeq = stopoverIds.join('|');
    if (currentSeq !== targetSeq) {
      const pool = [...items];
      const next: DragWaypoint[] = stopoverIds.map((stId) => {
        const idx = pool.findIndex((p) => p.stationId === stId);
        if (idx !== -1) {
          return pool.splice(idx, 1)[0];
        }
        uidCounterRef.current += 1;
        return { uid: `wp-${uidCounterRef.current}`, stationId: stId };
      });
      setItems(next);
    }
  }, [stopoverIds]);

  if (stopoverIds.length === 0) return null;

  const handleReorder = (reordered: DragWaypoint[]) => {
    setItems(reordered);
    onReorderStopovers(reordered.map((r) => r.stationId));
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    setItems(copy);
    onReorderStopovers(copy.map((r) => r.stationId));
  };

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={handleReorder}
      className={variant === 'ios' ? 'space-y-3' : 'space-y-2'}
    >
      {items.map((item, idx) => (
        <StopoverRow
          key={item.uid}
          item={item}
          index={idx}
          totalCount={items.length}
          language={language}
          variant={variant}
          onEdit={() => onEditStopover(idx)}
          onRemove={() => onRemoveStopover(idx)}
          onMove={(delta) => handleMove(idx, delta)}
        />
      ))}
    </Reorder.Group>
  );
};
