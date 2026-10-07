import { Disruption, DisruptionType, LineId } from '../types/metro';
import { getApiBaseUrl } from './apiConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.filter((item) => item !== undefined);
      } else if (val !== null && typeof val === 'object') {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

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

  // 1. Try Firestore direct real-time cloud database
  try {
    const snap = await getDocs(collection(db, 'disruptions'));
    const firestoreDisruptions: Disruption[] = snap.docs
      .map((d) => d.data() as Disruption)
      .filter((d) => d.isActive && (d.resolvedReports || 0) < 10);

    const map = new Map<string, Disruption>();
    for (const d of local) {
      map.set(d.id, d);
    }
    for (const fd of firestoreDisruptions) {
      const existing = map.get(fd.id);
      if (existing) {
        map.set(fd.id, {
          ...fd,
          confirmations: Math.max(fd.confirmations || 1, existing.confirmations || 1),
          resolvedReports: Math.max(fd.resolvedReports || 0, existing.resolvedReports || 0),
        });
      } else {
        map.set(fd.id, fd);
      }
    }

    const merged = Array.from(map.values())
      .filter((d) => (d.resolvedReports || 0) < 10)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    setLocalCachedDisruptions(merged);
    return merged;
  } catch (err) {
    console.warn('Firestore fetch for disruptions failed, attempting API fallback:', err);
  }

  // 2. Fallback to API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/disruptions`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.disruptions)) {
        const serverDisruptions: Disruption[] = data.disruptions;
        
        const map = new Map<string, Disruption>();
        for (const d of local) {
          map.set(d.id, d);
        }
        for (const sd of serverDisruptions) {
          const existing = map.get(sd.id);
          if (existing) {
            map.set(sd.id, {
              ...sd,
              confirmations: Math.max(sd.confirmations || 1, existing.confirmations || 1),
            });
          } else {
            map.set(sd.id, sd);
          }
        }

        const merged = Array.from(map.values())
          .filter((d) => (d.resolvedReports || 0) < 10)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLocalCachedDisruptions(merged);

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
    title: payload.title || `${payload.type} on line ${payload.lineId}`,
    description: payload.description || '',
    fromStationId: payload.fromStationId,
    toStationId: payload.toStationId,
    affectedStations: payload.affectedStations || [payload.fromStationId, payload.toStationId],
    reportedBy: payload.reportedBy || 'Passenger',
    timestamp: Date.now(),
    confirmations: 1,
    resolvedReports: 0,
    isActive: true,
  };

  // 1. Save to Firestore
  try {
    const firestoreData = sanitizeForFirestore(optimisticDisruption);
    await setDoc(doc(db, 'disruptions', optimisticDisruption.id), firestoreData);
    const current = getLocalCachedDisruptions();
    const updated = [optimisticDisruption, ...current.filter((d) => d.id !== optimisticDisruption.id)];
    setLocalCachedDisruptions(updated);
    markUserConfirmed(optimisticDisruption.id);
    return optimisticDisruption;
  } catch (err) {
    console.warn('Firestore report disruption failed, attempting API fallback:', err);
  }

  // 2. Save via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/disruptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.disruption) {
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

  // 3. Fallback to local cache
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

  // 1. Update in Firestore
  try {
    await updateDoc(doc(db, 'disruptions', disruptionId), {
      confirmations: increment(1),
    });
    const current = getLocalCachedDisruptions();
    const item = current.find((d) => d.id === disruptionId);
    if (item) {
      item.confirmations = (item.confirmations || 1) + 1;
      setLocalCachedDisruptions(current);
      return item.confirmations;
    }
  } catch (err) {
    console.warn('Firestore confirm disruption failed, attempting API fallback:', err);
  }

  // 2. Update via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/disruptions/${encodeURIComponent(disruptionId)}/confirm`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.confirmations === 'number') {
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

  // 3. Fallback: increment locally
  const current = getLocalCachedDisruptions();
  const item = current.find((d) => d.id === disruptionId);
  if (item) {
    item.confirmations = (item.confirmations || 1) + 1;
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

  const current = getLocalCachedDisruptions();
  const item = current.find((d) => d.id === disruptionId);
  const nextCount = (item?.resolvedReports || 0) + 1;

  // 1. Update in Firestore
  try {
    if (nextCount >= 10) {
      await deleteDoc(doc(db, 'disruptions', disruptionId));
      setLocalCachedDisruptions(current.filter((d) => d.id !== disruptionId));
      return { removed: true, resolvedReports: 10 };
    } else {
      await updateDoc(doc(db, 'disruptions', disruptionId), {
        resolvedReports: increment(1),
      });
      if (item) {
        item.resolvedReports = nextCount;
        setLocalCachedDisruptions(current);
      }
      return { removed: false, resolvedReports: nextCount };
    }
  } catch (err) {
    console.warn('Firestore resolve report failed, attempting API fallback:', err);
  }

  // 2. Update via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/disruptions/${encodeURIComponent(disruptionId)}/resolve`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.removed) {
          setLocalCachedDisruptions(current.filter((d) => d.id !== disruptionId));
          return { removed: true, resolvedReports: 10 };
        } else {
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

  // 3. Fallback locally
  if (nextCount >= 10) {
    setLocalCachedDisruptions(current.filter((d) => d.id !== disruptionId));
    return { removed: true, resolvedReports: 10 };
  } else {
    if (item) {
      item.resolvedReports = nextCount;
      setLocalCachedDisruptions(current);
    }
    return { removed: false, resolvedReports: nextCount };
  }
}

/**
 * Update an existing disruption (admin editing).
 * Synchronizes to Firestore, REST API, and local cache.
 */
export async function updateDisruption(
  disruptionId: string,
  updates: Partial<Disruption>
): Promise<Disruption> {
  const current = getLocalCachedDisruptions();
  const existingIndex = current.findIndex((d) => d.id === disruptionId);
  const existing = existingIndex !== -1 ? current[existingIndex] : null;

  const updated: Disruption = {
    ...(existing || {
      id: disruptionId,
      lineId: 'U-Grün',
      type: 'missing_tracks',
      title: 'Disruption',
      fromStationId: '',
      toStationId: '',
      affectedStations: [],
      timestamp: Date.now(),
      confirmations: 1,
      isActive: true,
    }),
    ...updates,
    id: disruptionId,
  };

  // 1. Update in Firestore
  try {
    const firestoreData = sanitizeForFirestore(updates);
    await updateDoc(doc(db, 'disruptions', disruptionId), firestoreData);
  } catch (err) {
    console.warn('Firestore updateDoc failed, trying setDoc merge:', err);
    try {
      await setDoc(doc(db, 'disruptions', disruptionId), sanitizeForFirestore(updated), { merge: true });
    } catch (setErr) {
      console.warn('Firestore setDoc fallback failed:', setErr);
    }
  }

  // 2. Update via REST API
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/disruptions/${encodeURIComponent(disruptionId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn('REST API update disruption failed:', err);
  }

  // 3. Update local cache
  const nextList = current.map((d) => (d.id === disruptionId ? updated : d));
  if (!current.some((d) => d.id === disruptionId)) {
    nextList.unshift(updated);
  }
  setLocalCachedDisruptions(nextList);
  return updated;
}

/**
 * Clear or delete a disruption permanently (admin deleting).
 * Synchronizes to Firestore, REST API, and local cache.
 */
export async function deleteDisruption(disruptionId: string): Promise<void> {
  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'disruptions', disruptionId));
  } catch (err) {
    console.warn('Firestore delete disruption failed:', err);
  }

  // 2. Delete from REST API
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/disruptions/${encodeURIComponent(disruptionId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('REST API delete disruption failed:', err);
  }

  // 3. Update local cache
  const current = getLocalCachedDisruptions();
  const updated = current.filter((d) => d.id !== disruptionId);
  setLocalCachedDisruptions(updated);
}

/**
 * Real-time Firestore synchronization for disruptions across all devices.
 * Automatically broadcasts updates and deletions to every connected device.
 */
export function subscribeToDisruptions(callback: (disruptions: Disruption[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'disruptions'),
      (snap) => {
        // Authoritative cloud snapshot from Firestore
        const firestoreDisruptions: Disruption[] = snap.docs
          .map((d) => d.data() as Disruption)
          .filter((d) => d.isActive && (d.resolvedReports || 0) < 10)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // When cloud data is received, update local cache and UI
        // This ensures deletions and edits made on any device reflect immediately everywhere
        setLocalCachedDisruptions(firestoreDisruptions);
        callback(firestoreDisruptions);
      },
      (err) => {
        console.warn('Firestore onSnapshot listener error for disruptions:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach Firestore snapshot listener for disruptions:', err);
    return () => {};
  }
}
