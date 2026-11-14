import { LineId, RecentRoute } from '../types/metro';

const RECENTS_KEY = 'metroflow_recent_routes';
const LAST_ENTRY_KEY = 'metroflow_last_planned_entry';

export function getRecentRoutes(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const list: RecentRoute[] = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function getAllStoredRecentRoutes(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const list: RecentRoute[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getLastPlannedEntry(): RecentRoute | null {
  try {
    const raw = localStorage.getItem(LAST_ENTRY_KEY);
    if (raw) return JSON.parse(raw);
    const recents = getRecentRoutes();
    return recents[0] || null;
  } catch {
    return null;
  }
}

export function saveRecentRoute(entry: {
  originId: string;
  destinationId: string;
  stopoverId?: string;
  stopoverIds?: string[];
  originName: string;
  destinationName: string;
  stopoverName?: string;
  stopoverNames?: string[];
  durationMinutes?: number;
  transfersCount?: number;
  linesUsed?: LineId[];
}): RecentRoute[] {
  try {
    const existing = getAllStoredRecentRoutes();
    const normalizedIds =
      entry.stopoverIds && entry.stopoverIds.length > 0
        ? entry.stopoverIds
        : entry.stopoverId
        ? [entry.stopoverId]
        : [];
    const normalizedNames =
      entry.stopoverNames && entry.stopoverNames.length > 0
        ? entry.stopoverNames
        : entry.stopoverName
        ? [entry.stopoverName]
        : [];
    const targetKey = normalizedIds.join('|');

    // Filter out duplicates (same origin, destination, and ordered stopovers)
    const filtered = existing.filter((r) => {
      const rIds = r.stopoverIds && r.stopoverIds.length > 0 ? r.stopoverIds : r.stopoverId ? [r.stopoverId] : [];
      return !(
        r.originId === entry.originId &&
        r.destinationId === entry.destinationId &&
        rIds.join('|') === targetKey
      );
    });

    const newRecent: RecentRoute = {
      id: `recent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...entry,
      stopoverId: normalizedIds[0],
      stopoverIds: normalizedIds.length > 0 ? normalizedIds : undefined,
      stopoverName: normalizedNames.length > 0 ? normalizedNames.join(' → ') : undefined,
      stopoverNames: normalizedNames.length > 0 ? normalizedNames : undefined,
    };

    const updated = [newRecent, ...filtered].slice(0, 10);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    localStorage.setItem(LAST_ENTRY_KEY, JSON.stringify(newRecent));
    return updated.slice(0, 3);
  } catch {
    return [];
  }
}

export function deleteRecentRoute(id: string): RecentRoute[] {
  try {
    const existing = getAllStoredRecentRoutes();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    if (updated.length > 0) {
      localStorage.setItem(LAST_ENTRY_KEY, JSON.stringify(updated[0]));
    } else {
      localStorage.removeItem(LAST_ENTRY_KEY);
    }
    return updated.slice(0, 3);
  } catch {
    return [];
  }
}

export function clearRecentRoutes(): void {
  try {
    localStorage.removeItem(RECENTS_KEY);
    localStorage.removeItem(LAST_ENTRY_KEY);
  } catch {}
}
