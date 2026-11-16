import { LineId, SegmentTravelTime, TravelTimeOverridesMap } from '../types/metro';
import { METRO_LINES } from '../data/metroData';
import { getApiBaseUrl } from './apiConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY = 'metroflow_cached_travel_times';
const COLLECTION_PATH = 'travelTimes';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isPermissionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('permission') || msg.includes('insufficient');
}

/**
 * Normalizes a segment ID component to strictly match ^[a-zA-Z0-9_\-]+$
 * as required by Firestore security rules.
 */
export function normalizeIdPart(part: string): string {
  return String(part || '')
    .replace(/ä/g, 'ae')
    .replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe')
    .replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[èéêë]/g, 'e')
    .replace(/[àáâ]/g, 'a')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Computes a bidirectional canonical segment document ID for a track segment on a line.
 */
export function getSegmentTimeKey(lineId: LineId, stationA: string, stationB: string): string {
  const [a, b] = [stationA, stationB].sort((x, y) => x.localeCompare(y));
  return `${normalizeIdPart(lineId)}__${normalizeIdPart(a)}__${normalizeIdPart(b)}`.slice(0, 160);
}

/**
 * Sanitizes and bounds a SegmentTravelTime payload strictly matching firestore.rules and blueprint.
 */
export function sanitizeSegmentTravelTime(input: {
  lineId: LineId;
  fromStationId: string;
  toStationId: string;
  durationSeconds: number;
  updatedAt?: number;
}): SegmentTravelTime {
  const id = getSegmentTimeKey(input.lineId, input.fromStationId, input.toStationId);
  const clampedSeconds = Math.min(3600, Math.max(1, Math.round(Number(input.durationSeconds) || 1)));
  const computedMinutes = Math.min(
    60,
    Math.max(0.1, Number((clampedSeconds / 60).toFixed(1)))
  );

  return {
    id,
    lineId: String(input.lineId).slice(0, 64),
    fromStationId: String(input.fromStationId).slice(0, 64),
    toStationId: String(input.toStationId).slice(0, 64),
    durationSeconds: clampedSeconds,
    durationMinutes: computedMinutes,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : Date.now(),
  };
}

export function getLocalCachedTravelTimes(): TravelTimeOverridesMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function setLocalCachedTravelTimes(map: TravelTimeOverridesMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function mergeTravelTimeMaps(
  base: TravelTimeOverridesMap,
  incoming: TravelTimeOverridesMap
): TravelTimeOverridesMap {
  const merged: TravelTimeOverridesMap = { ...base };
  for (const [key, item] of Object.entries(incoming)) {
    if (!item || typeof item !== 'object') continue;
    const existing = merged[key];
    if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
      merged[key] = item;
    }
  }
  return merged;
}

/**
 * Fetches all admin-measured segment travel time overrides from Firestore (with REST API & local fallback).
 */
export async function fetchTravelTimes(): Promise<TravelTimeOverridesMap> {
  const local = getLocalCachedTravelTimes();

  // 1. Try Firestore
  try {
    const snap = await getDocs(collection(db, COLLECTION_PATH));
    const firestoreMap: TravelTimeOverridesMap = {};
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as SegmentTravelTime;
      if (data && data.id && typeof data.durationSeconds === 'number') {
        firestoreMap[data.id] = data;
      }
    });
    const nextMap = snap.metadata.fromCache
      ? mergeTravelTimeMaps(local, firestoreMap)
      : firestoreMap;
    setLocalCachedTravelTimes(nextMap);
    return nextMap;
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, COLLECTION_PATH);
    }
    console.warn('Firestore fetch for travelTimes failed, trying API fallback:', err);
  }

  // 2. Fallback to REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/travel-times`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.travelTimesMap) {
        const merged = mergeTravelTimeMaps(local, data.travelTimesMap as TravelTimeOverridesMap);
        setLocalCachedTravelTimes(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('REST API fetch for travel times failed, using local cache:', err);
  }

  return local;
}

/**
 * Real-time Firestore listener so travel times updated by an admin propagate instantly to every user.
 */
export function subscribeToTravelTimes(
  callback: (map: TravelTimeOverridesMap) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION_PATH),
      (snap) => {
        const firestoreMap: TravelTimeOverridesMap = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as SegmentTravelTime;
          if (data && data.id && typeof data.durationSeconds === 'number') {
            firestoreMap[data.id] = data;
          }
        });
        let nextMap: TravelTimeOverridesMap;
        if (!snap.metadata.fromCache) {
          nextMap = firestoreMap;
        } else {
          const localCopy = { ...getLocalCachedTravelTimes() };
          snap.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete localCopy[change.doc.id];
            }
          });
          nextMap = mergeTravelTimeMaps(localCopy, firestoreMap);
        }
        setLocalCachedTravelTimes(nextMap);
        callback(nextMap);
      },
      (err) => {
        if (isPermissionError(err)) {
          console.error('Firestore travelTimes permission error:', err);
        } else {
          console.warn('Firestore onSnapshot error for travelTimes:', err);
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach Firestore listener for travelTimes:', err);
    return () => {};
  }
}

/**
 * Saves admin-measured line segment travel times to Firestore, REST API, and localStorage cache.
 */
export async function saveLineTravelTimes(
  segments: Array<{
    lineId: LineId;
    fromStationId: string;
    toStationId: string;
    durationSeconds: number;
  }>,
  adminCode: string
): Promise<TravelTimeOverridesMap> {
  const now = Date.now();
  const sanitizedSegments: SegmentTravelTime[] = segments.map((seg) =>
    sanitizeSegmentTravelTime({
      ...seg,
      updatedAt: now,
    })
  );

  // 1. Write to Firestore
  try {
    await Promise.all(
      sanitizedSegments.map((seg) => setDoc(doc(db, COLLECTION_PATH, seg.id), seg))
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_PATH);
    }
    console.warn('Firestore write for travelTimes failed, falling back to REST API:', err);
  }

  // 2. Write to Express REST API for cross-device / offline backup
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/travel-times`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segments: sanitizedSegments,
        adminCode,
      }),
    });
  } catch (err) {
    console.warn('REST API write for travel times failed:', err);
  }

  // 3. Update local cache immediately
  const current = getLocalCachedTravelTimes();
  const nextMap: TravelTimeOverridesMap = { ...current };
  for (const seg of sanitizedSegments) {
    nextMap[seg.id] = seg;
  }
  setLocalCachedTravelTimes(nextMap);
  return nextMap;
}

/**
 * Resets all admin-measured segment travel times for a single line back to defaults
 * across Firestore, REST API, and localStorage cache.
 */
export async function resetLineTravelTimes(
  lineId: LineId,
  adminCode: string
): Promise<TravelTimeOverridesMap> {
  const current = getLocalCachedTravelTimes();
  const docIdsToDelete = new Set<string>();

  for (const [key, item] of Object.entries(current)) {
    if (item && item.lineId === lineId) {
      docIdsToDelete.add(key);
    }
  }

  const line = METRO_LINES[lineId];
  if (line && line.stations.length >= 2) {
    for (let i = 0; i < line.stations.length - 1; i++) {
      docIdsToDelete.add(getSegmentTimeKey(lineId, line.stations[i], line.stations[i + 1]));
    }
  }

  // 1. Delete from Firestore (including querying matching lineId docs directly)
  try {
    const q = query(collection(db, COLLECTION_PATH), where('lineId', '==', lineId));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => docIdsToDelete.add(d.id));

    await Promise.all(
      Array.from(docIdsToDelete).map((segId) => deleteDoc(doc(db, COLLECTION_PATH, segId)))
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.DELETE, COLLECTION_PATH);
    }
    console.warn('Firestore delete for line travelTimes failed, trying REST API:', err);
  }

  // 2. Delete from Express REST API backup
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/travel-times/line/${encodeURIComponent(lineId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-code': adminCode,
      },
      body: JSON.stringify({ adminCode }),
    });
  } catch (err) {
    console.warn('REST API delete for line travel times failed:', err);
  }

  // 3. Remove from local cache immediately
  const nextMap: TravelTimeOverridesMap = { ...current };
  for (const segId of docIdsToDelete) {
    delete nextMap[segId];
  }
  for (const [key, item] of Object.entries(nextMap)) {
    if (item && item.lineId === lineId) {
      delete nextMap[key];
    }
  }
  setLocalCachedTravelTimes(nextMap);
  return nextMap;
}
