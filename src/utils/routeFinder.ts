import {
  Station,
  LineId,
  RouteOption,
  RouteLeg,
  RouteTransfer,
  RoutePreference,
  Disruption,
  TravelTimeOverridesMap,
  RideStep,
  IsochroneEdge,
  IsochroneResult,
} from '../types/metro';
import { METRO_LINES, STATIONS, NETWORK_CONNECTIONS } from '../data/metroData';
import { getSegmentTimeKey, getLocalCachedTravelTimes } from '../services/travelTimesService';

interface GraphEdge {
  to: string;
  lineId: LineId;
  duration: number; // default fallback duration in minutes
}

interface GraphNode {
  stationId: string;
  lineId: LineId | null;
  totalTime: number;
  transfersCount: number;
  path: {
    stationId: string;
    lineId: LineId;
    duration: number;
  }[];
}

// Build adjacency graph with bidirectional edges
const adjacencyList = new Map<string, GraphEdge[]>();
const defaultSegmentDurationMap = new Map<string, number>();

for (const conn of NETWORK_CONNECTIONS) {
  if (!adjacencyList.has(conn.from)) {
    adjacencyList.set(conn.from, []);
  }
  if (!adjacencyList.has(conn.to)) {
    adjacencyList.set(conn.to, []);
  }

  defaultSegmentDurationMap.set(
    getSegmentTimeKey(conn.lineId, conn.from, conn.to),
    conn.durationMinutes
  );

  // Forward
  adjacencyList.get(conn.from)!.push({
    to: conn.to,
    lineId: conn.lineId,
    duration: conn.durationMinutes,
  });

  // Reverse
  adjacencyList.get(conn.to)!.push({
    to: conn.from,
    lineId: conn.lineId,
    duration: conn.durationMinutes,
  });
}

let globalTravelTimeOverrides: TravelTimeOverridesMap =
  typeof window !== 'undefined' ? getLocalCachedTravelTimes() : {};

export function setGlobalTravelTimeOverrides(overrides: TravelTimeOverridesMap): void {
  globalTravelTimeOverrides = overrides || {};
}

export function getGlobalTravelTimeOverrides(): TravelTimeOverridesMap {
  return globalTravelTimeOverrides;
}

export function roundMinutes(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Resolves the effective duration in minutes for a specific segment on a line.
 */
export function getEffectiveSegmentDuration(
  lineId: LineId,
  fromStationId: string,
  toStationId: string,
  overrides?: TravelTimeOverridesMap,
  fallbackDurationMinutes?: number
): number {
  const map = overrides || globalTravelTimeOverrides;
  const key = getSegmentTimeKey(lineId, fromStationId, toStationId);
  const override = map[key];
  if (override && typeof override.durationMinutes === 'number' && override.durationMinutes > 0) {
    return override.durationMinutes;
  }
  if (override && typeof override.durationSeconds === 'number' && override.durationSeconds > 0) {
    return Math.max(0.1, Number((override.durationSeconds / 60).toFixed(1)));
  }
  const defaultMin = defaultSegmentDurationMap.get(key);
  if (typeof defaultMin === 'number') return defaultMin;
  return typeof fallbackDurationMinutes === 'number' ? fallbackDurationMinutes : 2;
}

/**
 * Resolves the effective duration in integer seconds for a specific segment on a line.
 */
export function getEffectiveSegmentSeconds(
  lineId: LineId,
  fromStationId: string,
  toStationId: string,
  overrides?: TravelTimeOverridesMap
): number {
  const map = overrides || globalTravelTimeOverrides;
  const key = getSegmentTimeKey(lineId, fromStationId, toStationId);
  const override = map[key];
  if (override && typeof override.durationSeconds === 'number' && override.durationSeconds >= 1) {
    return Math.round(override.durationSeconds);
  }
  const mins = getEffectiveSegmentDuration(lineId, fromStationId, toStationId, map);
  return Math.max(1, Math.round(mins * 60));
}

export interface LineSegmentTiming {
  fromStationId: string;
  toStationId: string;
  durationSeconds: number;
  durationMinutes: number;
  isMeasured: boolean;
}

export interface LineTravelSummary {
  totalSeconds: number;
  totalMinutes: number;
  hasMeasuredSegments: boolean;
  segments: LineSegmentTiming[];
}

/**
 * Computes the complete dynamic end-to-end travel time and per-segment durations
 * for any line, immediately reflecting admin-measured TravelTimeOverridesMap updates.
 */
export function getLineTotalTravelTime(
  lineId: LineId,
  overrides?: TravelTimeOverridesMap
): LineTravelSummary {
  const line = METRO_LINES[lineId];
  const map = overrides || globalTravelTimeOverrides;
  if (!line || !line.stations || line.stations.length < 2) {
    return {
      totalSeconds: 0,
      totalMinutes: 0,
      hasMeasuredSegments: false,
      segments: [],
    };
  }

  let totalSeconds = 0;
  let hasMeasuredSegments = false;
  const segments: LineSegmentTiming[] = [];

  for (let i = 0; i < line.stations.length - 1; i++) {
    const fromStationId = line.stations[i];
    const toStationId = line.stations[i + 1];
    const key = getSegmentTimeKey(lineId, fromStationId, toStationId);
    const isMeasured = Boolean(map[key]);
    if (isMeasured) hasMeasuredSegments = true;

    const durationSeconds = getEffectiveSegmentSeconds(lineId, fromStationId, toStationId, map);
    const durationMinutes = getEffectiveSegmentDuration(lineId, fromStationId, toStationId, map);
    totalSeconds += durationSeconds;
    segments.push({
      fromStationId,
      toStationId,
      durationSeconds,
      durationMinutes,
      isMeasured,
    });
  }

  return {
    totalSeconds,
    totalMinutes: totalSeconds > 0 ? Math.max(0.1, roundMinutes(totalSeconds / 60)) : 0,
    hasMeasuredSegments,
    segments,
  };
}

export interface LineCompletenessCheck {
  eligible: boolean;
  reason?: 'no-route' | 'multi-line' | 'partial-line';
  lineId?: LineId;
  expectedStationsCount?: number;
  routeStationsCount?: number;
}

/**
 * Strict Admin Travel Time Logging check:
 * Eligible ONLY when the route uses ONE single line with zero transfers/stopovers
 * AND covers that complete line from start terminal to finish terminal (in either direction).
 */
export function isCompleteSingleLineRoute(route: RouteOption | null | undefined): LineCompletenessCheck {
  if (!route || !route.legs || route.legs.length === 0) {
    return { eligible: false, reason: 'no-route' };
  }

  if (
    route.legs.length !== 1 ||
    route.transfersCount > 0 ||
    route.stopoverStationId ||
    (route.stopoverStationIds && route.stopoverStationIds.length > 0)
  ) {
    return { eligible: false, reason: 'multi-line' };
  }

  const leg = route.legs[0];
  const line = METRO_LINES[leg.lineId];
  if (!line || !line.stations || line.stations.length < 2) {
    return { eligible: false, reason: 'partial-line', lineId: leg.lineId };
  }

  const forward = line.stations;
  const backward = [...line.stations].reverse();
  const routeStations = leg.stations;

  const matchesForward =
    routeStations.length === forward.length &&
    routeStations.every((id, idx) => id === forward[idx]);
  const matchesBackward =
    routeStations.length === backward.length &&
    routeStations.every((id, idx) => id === backward[idx]);

  if (!matchesForward && !matchesBackward) {
    return {
      eligible: false,
      reason: 'partial-line',
      lineId: leg.lineId,
      expectedStationsCount: line.stations.length,
      routeStationsCount: routeStations.length,
    };
  }

  return {
    eligible: true,
    lineId: leg.lineId,
    expectedStationsCount: line.stations.length,
    routeStationsCount: routeStations.length,
  };
}

/**
 * Builds the flat stop-by-stop array for Active Ride Mode, including pre-transfer alerts,
 * transfer arrival notifications, and exact segment durations.
 */
export function buildRideSteps(
  route: RouteOption,
  overrides?: TravelTimeOverridesMap
): RideStep[] {
  const steps: RideStep[] = [];
  if (!route || !route.legs || route.legs.length === 0) return steps;

  for (let legIdx = 0; legIdx < route.legs.length; legIdx++) {
    const leg = route.legs[legIdx];
    const nextLeg = legIdx < route.legs.length - 1 ? route.legs[legIdx + 1] : null;
    const stationsToAppend = legIdx === 0 ? leg.stations : leg.stations.slice(1);

    for (let sIdx = 0; sIdx < stationsToAppend.length; sIdx++) {
      const stationId = stationsToAppend[sIdx];
      const isLastInLeg = sIdx === stationsToAppend.length - 1;
      const isOperationalTransfer =
        leg.lineId === 'U-Dunkelblau' &&
        stationId === 'jurassic-park' &&
        !(legIdx === 0 && sIdx === 0) &&
        !(legIdx === route.legs.length - 1 && isLastInLeg);

      steps.push({
        stationId,
        lineId: leg.lineId,
        legIndex: legIdx,
        isTransferArrival: Boolean(isLastInLeg && nextLeg),
        transferToLineId: isLastInLeg && nextLeg ? nextLeg.lineId : undefined,
        isOperationalTransfer,
        segmentSecondsToNext: 0,
      });
    }
  }

  // Compute pre-transfer warnings (1 stop BEFORE transfer station) and segment durations
  for (let i = 0; i < steps.length - 1; i++) {
    const curr = steps[i];
    const next = steps[i + 1];
    if (next.isTransferArrival) {
      curr.isTransferBeforeNextStop = true;
      curr.transferToLineId = next.transferToLineId;
    }
    const travelLineId = curr.isTransferArrival && curr.transferToLineId ? curr.transferToLineId : next.lineId;
    curr.segmentSecondsToNext = getEffectiveSegmentSeconds(
      travelLineId,
      curr.stationId,
      next.stationId,
      overrides
    );
  }

  return steps;
}

/**
 * Computes estimated travel seconds from `fromIndex` to `toIndex` along ride steps,
 * including transfer walk time (180s) when departing a transfer interchange onto a different line.
 */
export function getStepRemainingSeconds(
  steps: RideStep[],
  fromIndex: number,
  toIndex: number
): number {
  if (!steps || steps.length === 0 || toIndex <= fromIndex) return 0;
  let totalSec = 0;
  const upper = Math.min(toIndex, steps.length - 1);
  for (let i = Math.max(0, fromIndex); i < upper; i++) {
    const step = steps[i];
    totalSec += step.segmentSecondsToNext || 0;
    if (step.isTransferArrival && step.transferToLineId && step.transferToLineId !== step.lineId) {
      totalSec += 3 * 60;
    }
  }
  return totalSec;
}

/**
 * Computes total remaining travel seconds from `currentStepIndex` to the final destination.
 */
export function getRideRemainingSeconds(
  steps: RideStep[],
  currentStepIndex: number
): number {
  if (!steps || steps.length <= 1) return 0;
  return getStepRemainingSeconds(steps, currentStepIndex, steps.length - 1);
}

/**
 * Checks if a specific directed edge on a line is disrupted.
 */
export function isEdgeDisrupted(
  fromStationId: string,
  toStationId: string,
  lineId: LineId,
  disruptions: Disruption[]
): boolean {
  if (!disruptions || disruptions.length === 0) return false;

  for (const d of disruptions) {
    if (!d.isActive || d.lineId !== lineId) continue;

    // Direct from/to pair match
    if (
      (d.fromStationId === fromStationId && d.toStationId === toStationId) ||
      (d.fromStationId === toStationId && d.toStationId === fromStationId)
    ) {
      return true;
    }

    // Check if both stations belong to the affected stations array
    if (d.affectedStations && d.affectedStations.length >= 2) {
      const idxFrom = d.affectedStations.indexOf(fromStationId);
      const idxTo = d.affectedStations.indexOf(toStationId);
      if (idxFrom !== -1 && idxTo !== -1 && Math.abs(idxFrom - idxTo) === 1) {
        return true;
      }
      if (idxFrom !== -1 && idxTo !== -1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Identifies all active disruptions that affect a calculated route.
 */
export function getDisruptionsAffectingRoute(
  route: RouteOption,
  disruptions: Disruption[]
): Disruption[] {
  if (!route || !disruptions || disruptions.length === 0) return [];

  const affecting: Disruption[] = [];

  for (const d of disruptions) {
    if (!d.isActive) continue;

    // Check if the route uses the line
    const matchingLeg = route.legs.find((leg) => leg.lineId === d.lineId);
    if (!matchingLeg) continue;

    let isAffected = false;

    // 1. Leg stations span both from & to stations of disruption
    if (
      matchingLeg.stations.includes(d.fromStationId) &&
      matchingLeg.stations.includes(d.toStationId)
    ) {
      isAffected = true;
    }

    // 2. Any consecutive segment in the leg is disrupted
    if (!isAffected) {
      for (let i = 0; i < matchingLeg.stations.length - 1; i++) {
        const sA = matchingLeg.stations[i];
        const sB = matchingLeg.stations[i + 1];
        if (isEdgeDisrupted(sA, sB, d.lineId, [d])) {
          isAffected = true;
          break;
        }
      }
    }

    if (isAffected && !affecting.some((item) => item.id === d.id)) {
      affecting.push(d);
    }
  }

  return affecting;
}

/**
 * Finds optimal route between origin and destination with specific user preference
 * and optional disruption avoidance.
 */
export function findRoutes(
  originId: string,
  destinationId: string,
  preference: RoutePreference = 'fastest',
  avoidDisruptions: Disruption[] = [],
  activeDisruptions: Disruption[] = [],
  travelTimeOverrides?: TravelTimeOverridesMap
): RouteOption[] {
  if (!originId || !destinationId || originId === destinationId) {
    return [];
  }

  const originStation = STATIONS[originId];
  const destStation = STATIONS[destinationId];

  if (!originStation || !destStation) {
    return [];
  }

  const routes: RouteOption[] = [];
  const isBypassMode = avoidDisruptions.length > 0;

  // Primary route based on chosen preference
  if (preference === 'fewest-transfers') {
    const fewest = dijkstraSearch(
      originId,
      destinationId,
      30.0,
      false,
      0,
      0,
      isBypassMode ? 'Wenigste Umstiege (Umfahrung)' : 'Wenigste Umstiege',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fewest) routes.push(fewest);

    const fastest = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      0,
      isBypassMode ? 'Schnellste Umfahrung' : 'Schnellste Alternative',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fastest && !isDuplicateRoute(routes, fastest)) routes.push(fastest);
  } else if (preference === 'prioritize-metro') {
    const metroPref = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      10,
      isBypassMode ? 'U-Bahn Umfahrung' : 'U-Bahn bevorzugt',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (metroPref) routes.push(metroPref);

    const fastest = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      0,
      isBypassMode ? 'Schnellste Umfahrung' : 'Schnellste Route',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fastest && !isDuplicateRoute(routes, fastest)) routes.push(fastest);
  } else if (preference === 'prioritize-ic') {
    const icPref = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      10,
      0,
      isBypassMode ? 'IC Umfahrung' : 'IC-Züge bevorzugt',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (icPref) routes.push(icPref);

    const fastest = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      0,
      isBypassMode ? 'Schnellste Umfahrung' : 'Schnellste Route',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fastest && !isDuplicateRoute(routes, fastest)) routes.push(fastest);
  } else if (preference === 'accessible') {
    const accessible = dijkstraSearch(
      originId,
      destinationId,
      5.0,
      true,
      0,
      0,
      isBypassMode ? 'Barrierefreie Umfahrung' : 'Barrierefreie Route',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (accessible) routes.push(accessible);

    const fastest = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      0,
      isBypassMode ? 'Schnellste Umfahrung' : 'Schnellste Route',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fastest && !isDuplicateRoute(routes, fastest)) routes.push(fastest);
  } else {
    // Default 'fastest'
    const fastest = dijkstraSearch(
      originId,
      destinationId,
      3.5,
      false,
      0,
      0,
      isBypassMode ? 'Störungsfreie Alternativroute' : 'Schnellste Route',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (fastest) routes.push(fastest);

    const directOrFewest = dijkstraSearch(
      originId,
      destinationId,
      25.0,
      false,
      0,
      0,
      isBypassMode ? 'Wenigste Umstiege (Umfahrung)' : 'Wenigste Umstiege',
      avoidDisruptions,
      travelTimeOverrides
    );
    if (directOrFewest && !isDuplicateRoute(routes, directOrFewest)) {
      routes.push(directOrFewest);
    }
  }

  // Annotate all routes with disruptions that affect them
  const disruptionPool = activeDisruptions.length > 0 ? activeDisruptions : avoidDisruptions;
  return routes.map((r) => ({
    ...r,
    affectedDisruptions: getDisruptionsAffectingRoute(r, disruptionPool),
  }));
}

function isDuplicateRoute(existing: RouteOption[], candidate: RouteOption): boolean {
  return existing.some(
    (r) =>
      r.transfersCount === candidate.transfersCount &&
      r.pathStationIds.join('-') === candidate.pathStationIds.join('-') &&
      r.linesUsed.join('-') === candidate.linesUsed.join('-')
  );
}

/**
 * Finds routes between origin and destination with 0, 1, or 2+ intermediate stopover waypoints.
 */
export function findRoutesWithStopover(
  originId: string,
  stopoverInput: string | string[] | null | undefined,
  destinationId: string,
  preference: RoutePreference = 'fastest',
  avoidDisruptions: Disruption[] = [],
  activeDisruptions: Disruption[] = [],
  travelTimeOverrides?: TravelTimeOverridesMap
): RouteOption[] {
  const rawStopovers = Array.isArray(stopoverInput)
    ? stopoverInput.filter((id): id is string => Boolean(id && STATIONS[id]))
    : stopoverInput && STATIONS[stopoverInput]
    ? [stopoverInput]
    : [];

  // Build ordered sequence and collapse consecutive duplicates so legs never start & end at same station
  const rawSequence = [originId, ...rawStopovers, destinationId];
  const sequence: string[] = [];
  for (const stId of rawSequence) {
    if (sequence.length === 0 || sequence[sequence.length - 1] !== stId) {
      sequence.push(stId);
    }
  }

  const intermediateStops = sequence.slice(1, -1);

  if (intermediateStops.length === 0) {
    return findRoutes(
      originId,
      destinationId,
      preference,
      avoidDisruptions,
      activeDisruptions,
      travelTimeOverrides
    );
  }

  const segmentResults: RouteOption[][] = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    const segRoutes = findRoutes(
      sequence[i],
      sequence[i + 1],
      preference,
      avoidDisruptions,
      activeDisruptions,
      travelTimeOverrides
    );
    if (segRoutes.length === 0) {
      return [];
    }
    segmentResults.push(segRoutes);
  }

  const combineSequence = (pickedSegments: RouteOption[], idxSuffix: string): RouteOption => {
    const combinedLegs: RouteLeg[] = [];
    const transfers: RouteTransfer[] = [];
    const pathStationIds: string[] = [];
    const linesUsedSet = new Set<LineId>();
    const bypassedSet = new Set<string>();
    let totalDurationMinutes = 0;
    let totalStops = 0;
    let accessible = true;
    let isBypass = false;

    pickedSegments.forEach((seg, segIdx) => {
      if (segIdx > 0) {
        const prevSeg = pickedSegments[segIdx - 1];
        const prevLastLine = prevSeg.legs[prevSeg.legs.length - 1]?.lineId;
        const currFirstLine = seg.legs[0]?.lineId;
        const waypointId = sequence[segIdx];
        const waypointStation = STATIONS[waypointId];

        if (prevLastLine && currFirstLine && prevLastLine !== currFirstLine) {
          transfers.push({
            stationId: waypointId,
            fromLineId: prevLastLine,
            toLineId: currFirstLine,
            walkMinutes: 3,
            instructions: `Umsteigen am Zwischenstopp ${waypointStation?.name || waypointId}: Wechseln von ${METRO_LINES[prevLastLine]?.name} in ${METRO_LINES[currFirstLine]?.name}`,
          });
          totalDurationMinutes += 3;
        }
      }

      combinedLegs.push(...seg.legs);
      transfers.push(...seg.transfers);

      if (segIdx === 0) {
        pathStationIds.push(...seg.pathStationIds);
      } else {
        pathStationIds.push(...seg.pathStationIds.slice(1));
      }

      seg.linesUsed.forEach((l) => linesUsedSet.add(l));
      totalDurationMinutes += seg.totalDurationMinutes;
      totalStops += seg.totalStops;
      accessible = accessible && seg.accessible;
      if (seg.isAlternativeBypass) isBypass = true;
      (seg.bypassedDisruptionIds || []).forEach((id) => bypassedSet.add(id));
    });

    const stopNames = intermediateStops.map((id) => STATIONS[id]?.name || id);
    const title = `Über ${stopNames.join(' → ')}${isBypass ? ' (Umfahrung)' : ''}`;

    const combinedRoute: RouteOption = {
      id: `stopover-route-${idxSuffix}-${Date.now()}`,
      title,
      totalDurationMinutes: roundMinutes(totalDurationMinutes),
      transfersCount: transfers.length,
      totalStops,
      legs: combinedLegs,
      transfers,
      pathStationIds,
      linesUsed: Array.from(linesUsedSet),
      accessible,
      stopoverStationId: intermediateStops[0],
      stopoverStationIds: intermediateStops,
      isAlternativeBypass: isBypass,
      bypassedDisruptionIds: bypassedSet.size > 0 ? Array.from(bypassedSet) : undefined,
    };

    const disruptionPool = activeDisruptions.length > 0 ? activeDisruptions : avoidDisruptions;
    combinedRoute.affectedDisruptions = getDisruptionsAffectingRoute(combinedRoute, disruptionPool);
    return combinedRoute;
  };

  const results: RouteOption[] = [
    combineSequence(
      segmentResults.map((segList) => segList[0]),
      'primary'
    ),
  ];

  // Build an optional alternative itinerary if any segment has a distinct 2nd route option
  const altPicks = segmentResults.map((segList) => (segList.length > 1 ? segList[1] : segList[0]));
  const hasAnyDiff = altPicks.some((seg, idx) => seg !== segmentResults[idx][0]);
  if (hasAnyDiff) {
    const altCombined = combineSequence(altPicks, 'alt');
    if (!isDuplicateRoute(results, altCombined)) {
      results.push(altCombined);
    }
  }

  return results;
}

/**
 * Computes exact travel times in seconds from `originId` to every reachable station across the network,
 * along with the shortest-path track edges so Isochrone Mode can highlight both reachable routes and stations.
 */
export function computeStationIsochrone(
  originId: string,
  avoidDisruptions: Disruption[] = [],
  travelTimeOverrides?: TravelTimeOverridesMap
): IsochroneResult {
  if (!originId || !STATIONS[originId]) {
    return {
      originId,
      maxTimeSeconds: 0,
      stationTimes: {},
      edges: [],
    };
  }

  interface IsoQueueNode {
    stationId: string;
    lineId: LineId | null;
    timeSeconds: number;
  }

  const bestStateSeconds = new Map<string, number>();
  const bestStationRecord = new Map<string, { timeSeconds: number; parent: IsochroneEdge | null }>();

  bestStateSeconds.set(`${originId}|NONE`, 0);
  bestStationRecord.set(originId, { timeSeconds: 0, parent: null });

  const queue: IsoQueueNode[] = [{ stationId: originId, lineId: null, timeSeconds: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.timeSeconds - b.timeSeconds);
    const current = queue.shift()!;
    const currentStateKey = `${current.stationId}|${current.lineId || 'NONE'}`;

    if (current.timeSeconds > (bestStateSeconds.get(currentStateKey) ?? Infinity)) {
      continue;
    }

    const edges = adjacencyList.get(current.stationId) || [];
    for (const edge of edges) {
      // Skip disrupted tracks completely in Isochrone reachability so maxTimeSeconds stays true travel time
      if (
        avoidDisruptions.length > 0 &&
        isEdgeDisrupted(current.stationId, edge.to, edge.lineId, avoidDisruptions)
      ) {
        continue;
      }

      const segSeconds = getEffectiveSegmentSeconds(
        edge.lineId,
        current.stationId,
        edge.to,
        travelTimeOverrides
      );
      const isTransfer = current.lineId !== null && current.lineId !== edge.lineId;
      const transferSeconds = isTransfer ? 180 : 0;
      const departureSeconds = current.timeSeconds + transferSeconds;
      const arrivalSeconds = departureSeconds + segSeconds;

      const nextStateKey = `${edge.to}|${edge.lineId}`;
      if (arrivalSeconds < (bestStateSeconds.get(nextStateKey) ?? Infinity)) {
        bestStateSeconds.set(nextStateKey, arrivalSeconds);
        queue.push({
          stationId: edge.to,
          lineId: edge.lineId,
          timeSeconds: arrivalSeconds,
        });
      }

      const existingStationBest = bestStationRecord.get(edge.to);
      if (!existingStationBest || arrivalSeconds < existingStationBest.timeSeconds) {
        bestStationRecord.set(edge.to, {
          timeSeconds: arrivalSeconds,
          parent: {
            fromStationId: current.stationId,
            toStationId: edge.to,
            lineId: edge.lineId,
            departureSeconds,
            arrivalSeconds,
          },
        });
      }
    }
  }

  const stationTimes: Record<string, number> = {};
  const resultEdges: IsochroneEdge[] = [];
  let maxTimeSeconds = 0;

  bestStationRecord.forEach((rec, stId) => {
    stationTimes[stId] = rec.timeSeconds;
    if (rec.timeSeconds > maxTimeSeconds) {
      maxTimeSeconds = rec.timeSeconds;
    }
    if (rec.parent) {
      resultEdges.push(rec.parent);
    }
  });

  return {
    originId,
    maxTimeSeconds,
    stationTimes,
    edges: resultEdges,
  };
}

function dijkstraSearch(
  originId: string,
  destinationId: string,
  transferPenalty: number,
  preferAccessible: boolean,
  metroPenalty: number,
  icPenalty: number,
  routeTitle: string,
  avoidDisruptions: Disruption[] = [],
  travelTimeOverrides?: TravelTimeOverridesMap
): RouteOption | null {
  const visited = new Map<string, number>();

  const queue: GraphNode[] = [
    {
      stationId: originId,
      lineId: null,
      totalTime: 0,
      transfersCount: 0,
      path: [],
    },
  ];

  let bestNode: GraphNode | null = null;
  const DISRUPTION_PENALTY = 50000; // Massive weight so Dijkstra avoids disrupted tracks whenever an alternative exists

  while (queue.length > 0) {
    queue.sort((a, b) => {
      const costA = a.totalTime + a.transfersCount * transferPenalty;
      const costB = b.totalTime + b.transfersCount * transferPenalty;
      return costA - costB;
    });
    const current = queue.shift()!;

    const stateKey = `${current.stationId}|${current.lineId || 'NONE'}`;
    const currentCost = current.totalTime + current.transfersCount * transferPenalty;

    if (visited.has(stateKey) && visited.get(stateKey)! <= currentCost) {
      continue;
    }
    visited.set(stateKey, currentCost);

    if (current.stationId === destinationId) {
      bestNode = current;
      break;
    }

    const edges = adjacencyList.get(current.stationId) || [];
    for (const edge of edges) {
      const lineInfo = METRO_LINES[edge.lineId];
      const effectiveDuration = getEffectiveSegmentDuration(
        edge.lineId,
        current.stationId,
        edge.to,
        travelTimeOverrides,
        edge.duration
      );
      const isTransfer = current.lineId !== null && current.lineId !== edge.lineId;
      const transferTime = isTransfer ? 3 : 0;
      const transferCountInc = isTransfer ? 1 : 0;

      let modePenalty = 0;
      if (lineInfo?.networkType === 'metro') {
        modePenalty = metroPenalty;
      } else if (lineInfo?.networkType === 'ic') {
        modePenalty = icPenalty;
      }

      let accessibilityPenalty = 0;
      if (preferAccessible && isTransfer) {
        const station = STATIONS[current.stationId];
        if (!station?.isAccessible) {
          accessibilityPenalty = 8;
        }
      }

      // Check if this edge segment is disrupted
      const isDisrupted =
        avoidDisruptions.length > 0 &&
        isEdgeDisrupted(current.stationId, edge.to, edge.lineId, avoidDisruptions);

      const segmentDisruptionPenalty = isDisrupted ? DISRUPTION_PENALTY : 0;

      const nextNode: GraphNode = {
        stationId: edge.to,
        lineId: edge.lineId,
        totalTime:
          current.totalTime +
          effectiveDuration +
          transferTime +
          modePenalty +
          accessibilityPenalty +
          segmentDisruptionPenalty,
        transfersCount: current.transfersCount + transferCountInc,
        path: [
          ...current.path,
          {
            stationId: edge.to,
            lineId: edge.lineId,
            duration: effectiveDuration,
          },
        ],
      };

      const nextStateKey = `${nextNode.stationId}|${nextNode.lineId}`;
      const nextCost = nextNode.totalTime + nextNode.transfersCount * transferPenalty;

      if (!visited.has(nextStateKey) || visited.get(nextStateKey)! > nextCost) {
        queue.push(nextNode);
      }
    }
  }

  if (!bestNode || bestNode.path.length === 0) {
    return null;
  }

  // Check if the resulting path actually successfully bypassed the disruption
  let bypassedSuccessfully = false;
  if (avoidDisruptions.length > 0) {
    let usedDisruptedEdge = false;
    let prevStation = originId;
    for (const step of bestNode.path) {
      if (isEdgeDisrupted(prevStation, step.stationId, step.lineId, avoidDisruptions)) {
        usedDisruptedEdge = true;
        break;
      }
      prevStation = step.stationId;
    }
    bypassedSuccessfully = !usedDisruptedEdge;
  }

  return formatRouteOption(
    originId,
    destinationId,
    bestNode,
    routeTitle,
    bypassedSuccessfully,
    avoidDisruptions
  );
}

function formatRouteOption(
  originId: string,
  destinationId: string,
  node: GraphNode,
  title: string,
  isAlternativeBypass: boolean = false,
  avoidDisruptions: Disruption[] = []
): RouteOption {
  const legs: RouteLeg[] = [];
  const transfers: RouteTransfer[] = [];
  const pathStationIds: string[] = [originId];
  const linesUsed: LineId[] = [];

  let currentLeg: RouteLeg | null = null;
  let previousStationId = originId;
  let trueTotalTime = 0;

  for (let i = 0; i < node.path.length; i++) {
    const step = node.path[i];
    pathStationIds.push(step.stationId);

    if (!linesUsed.includes(step.lineId)) {
      linesUsed.push(step.lineId);
    }

    const lineInfo = METRO_LINES[step.lineId];
    const netType = lineInfo?.networkType || 'metro';
    trueTotalTime += step.duration;

    if (!currentLeg || currentLeg.lineId !== step.lineId) {
      if (currentLeg) {
        transfers.push({
          stationId: previousStationId,
          fromLineId: currentLeg.lineId,
          toLineId: step.lineId,
          walkMinutes: 3,
          instructions: `Umsteigen an ${STATIONS[previousStationId]?.name || previousStationId}: Wechseln von ${METRO_LINES[currentLeg.lineId]?.name} in ${METRO_LINES[step.lineId]?.name}`,
        });
        legs.push(currentLeg);
        trueTotalTime += 3; // walk time
      }

      currentLeg = {
        lineId: step.lineId,
        fromStationId: previousStationId,
        toStationId: step.stationId,
        stations: [previousStationId, step.stationId],
        durationMinutes: roundMinutes(step.duration),
        stopsCount: 1,
        networkType: netType,
      };
    } else {
      currentLeg.toStationId = step.stationId;
      currentLeg.stations.push(step.stationId);
      currentLeg.durationMinutes = roundMinutes(currentLeg.durationMinutes + step.duration);
      currentLeg.stopsCount += 1;
    }

    previousStationId = step.stationId;
  }

  if (currentLeg) {
    legs.push(currentLeg);
  }

  const allStationsAccessible = pathStationIds.every(
    (stId) => STATIONS[stId]?.isAccessible || !STATIONS[stId]?.isInterchange
  );

  return {
    id: `route-${Math.random().toString(36).substring(2, 9)}`,
    title,
    totalDurationMinutes: roundMinutes(trueTotalTime),
    transfersCount: transfers.length,
    totalStops: node.path.length,
    legs,
    transfers,
    pathStationIds,
    linesUsed,
    accessible: allStationsAccessible,
    isAlternativeBypass,
    bypassedDisruptionIds: isAlternativeBypass ? avoidDisruptions.map((d) => d.id) : undefined,
  };
}
