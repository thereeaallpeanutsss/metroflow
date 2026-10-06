import { Disruption, DisruptionType, LineId } from '../types/metro';

const STORAGE_KEY = 'metroflow_cached_disruptions';
const CONFIRMED_KEY = 'metroflow_user_confirmed_disruptions';
const RESOLVED_REPORTS_KEY = 'metroflow_user_resolved_disruptions';

export interface NewDisruptionPayload {
  lineId: LineId;
  type: DisruptionType;
  title: string;
  description?: string;
  fromStationId: string;
  toStationId: string;
  affectedStations: string[];
  reportedBy?: string;
}

export function getLocalCachedDisruptions(): Disruption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: Disruption[] = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((d) => (d.resolvedReports || 0) < 10) : [];
  } catch {
    return [];
  }
}

export function setLocalCachedDisruptions(disruptions: Disruption[]): void {
  try {
    const filtered = disruptions.filter((d) => (d.resolvedReports || 0) < 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function getUserConfirmedIds(): string[] {
  try {
    const raw = localStorage.getItem(CONFIRMED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markUserConfirmed(id: string): void {
  try {
    const ids = getUserConfirmedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(CONFIRMED_KEY, JSON.stringify(ids));
    }
  } catch {}
}

export function getUserResolvedIds(): string[] {
  try {
    const raw = localStorage.getItem(RESOLVED_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markUserResolved(id: string): void {
  try {
    const ids = getUserResolvedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(RESOLVED_REPORTS_KEY, JSON.stringify(ids));
    }
  } catch {}
}

/**
 * Fetch all active disruptions from the server.
 * Merges server disruptions with local cache so disruptions never disappear.
 */
export async function fetchDisruptions(): Promise<Disruption[]> {
  const local = getLocalCachedDisruptions();
  try {
    const res = await fetch('/api/disruptions');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.disruptions)) {
        const serverDisruptions: Disruption[] = data.disruptions;
        
        // Merge strategy:
        // Use a map keyed by disruption ID.
        const map = new Map<string, Disruption>();

        // 1. Add all local disruptions first
        for (const d of local) {
          map.set(d.id, d);
        }

        // 2. Add or update with server disruptions
        for (const sd of serverDisruptions) {
          const existing = map.get(sd.id);
          if (existing) {
            // Keep the highest confirmations count and freshest info
            map.set(sd.id, {
              ...sd,
              confirmations: Math.max(sd.confirmations || 1, existing.confirmations || 1),
            });
          } else {
            map.set(sd.id, sd);
          }
        }

        const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLocalCachedDisruptions(merged);

        // If local had disruptions not yet on the server, push them to server in background
        const serverIds = new Set(serverDisruptions.map((d) => d.id));
        for (const locD of local) {
          if (!serverIds.has(locD.id)) {
            fetch('/api/disruptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lineId: locD.lineId,
                type: locD.type,
                title: locD.title,
                description: locD.description,
                fromStationId: locD.fromStationId,
                toStationId: locD.toStationId,
                affectedStations: locD.affectedStations,
                reportedBy: locD.reportedBy,
              }),
            }).catch(() => {});
          }
        }

        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch disruptions from backend, using local cache:', err);
  }
  return local;
}

/**
 * Report a new disruption to every user of the app.
 */
export async function reportDisruption(payload: NewDisruptionPayload): Promise<Disruption> {
  const fallbackId = `disrupt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const optimisticDisruption: Disruption = {
    id: fallbackId,
    lineId: payload.lineId,
    type: payload.type,
    title: payload.title,
    description: payload.description,
    fromStationId: payload.fromStationId,
    toStationId: payload.toStationId,
    affectedStations: payload.affectedStations,
    reportedBy: payload.reportedBy,
    timestamp: Date.now(),
    confirmations: 1,
    isActive: true,
  };

  try {
    const res = await fetch('/api/disruptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.disruption) {
        // Also update local cache
        const current = getLocalCachedDisruptions();
        const updated = [data.disruption, ...current.filter((d) => d.id !== data.disruption.id)];
        setLocalCachedDisruptions(updated);
        markUserConfirmed(data.disruption.id);
        return data.disruption;
      }
    }
  } catch (err) {
    console.warn('Error saving disruption to server, saving locally:', err);
  }

  // Fallback: save to local cache
  const current = getLocalCachedDisruptions();
  const updated = [optimisticDisruption, ...current];
  setLocalCachedDisruptions(updated);
  markUserConfirmed(optimisticDisruption.id);
  return optimisticDisruption;
}

/**
 * Confirm / endorse a disruption.
 */
export async function confirmDisruption(disruptionId: string): Promise<number> {
  markUserConfirmed(disruptionId);

  try {
    const res = await fetch(`/api/disruptions/${encodeURIComponent(disruptionId)}/confirm`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.confirmations === 'number') {
        // Update local cache
        const current = getLocalCachedDisruptions();
        const item = current.find((d) => d.id === disruptionId);
        if (item) {
          item.confirmations = data.confirmations;
          setLocalCachedDisruptions(current);
        }
        return data.confirmations;
      }
    }
  } catch (err) {
    console.warn('Error confirming disruption on server:', err);
  }

  // Fallback: increment locally
  const current = getLocalCachedDisruptions();
  const item = current.find((d) => d.id === disruptionId);
  if (item) {
    item.confirmations += 1;
    setLocalCachedDisruptions(current);
    return item.confirmations;
  }
  return 1;
}

/**
 * Report that a disruption is gone / resolved.
 * When 10 reports are collected, the disruption is automatically removed.
 */
export async function reportDisruptionResolved(
  disruptionId: string
): Promise<{ removed: boolean; resolvedReports: number }> {
  markUserResolved(disruptionId);

  try {
    const res = await fetch(`/api/disruptions/${encodeURIComponent(disruptionId)}/resolve`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.removed) {
          const current = getLocalCachedDisruptions();
          setLocalCachedDisruptions(current.filter((d) => d.id !== disruptionId));
          return { removed: true, resolvedReports: 10 };
        } else {
          const current = getLocalCachedDisruptions();
          const item = current.find((d) => d.id === disruptionId);
          if (item) {
            item.resolvedReports = data.resolvedReports;
            setLocalCachedDisruptions(current);
          }
          return { removed: false, resolvedReports: data.resolvedReports };
        }
      }
    }
  } catch (err) {
    console.warn('Error reporting disruption resolved to server:', err);
  }

  // Fallback locally
  const current = getLocalCachedDisruptions();
  const item = current.find((d) => d.id === disruptionId);
  if (item) {
    const count = (item.resolvedReports || 0) + 1;
    if (count >= 10) {
      setLocalCachedDisruptions(current.filter((d) => d.id !== disruptionId));
      return { removed: true, resolvedReports: 10 };
    } else {
      item.resolvedReports = count;
      setLocalCachedDisruptions(current);
      return { removed: false, resolvedReports: count };
    }
  }
  return { removed: true, resolvedReports: 10 };
}

/**
 * Clear or resolve a disruption (e.g. for testing / reset).
 */
export async function deleteDisruption(disruptionId: string): Promise<void> {
  try {
    await fetch(`/api/disruptions/${encodeURIComponent(disruptionId)}`, {
      method: 'DELETE',
    });
  } catch {}

  const current = getLocalCachedDisruptions();
  const updated = current.filter((d) => d.id !== disruptionId);
  setLocalCachedDisruptions(updated);
}
