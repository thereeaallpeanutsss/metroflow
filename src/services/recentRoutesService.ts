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
  originName: string;
  destinationName: string;
  stopoverName?: string;
  durationMinutes?: number;
  transfersCount?: number;
  linesUsed?: LineId[];
}): RecentRoute[] {
  try {
    const existing = getAllStoredRecentRoutes();
    // Filter out duplicates (same origin, destination, and stopover)
    const filtered = existing.filter(
      (r) =>
        !(
          r.originId === entry.originId &&
          r.destinationId === entry.destinationId &&
          (r.stopoverId || undefined) === (entry.stopoverId || undefined)
        )
    );

    const newRecent: RecentRoute = {
      id: `recent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...entry,
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
