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

  if (route.legs.length !== 1 || route.transfersCount > 0 || route.stopoverStationId) {
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
 * Finds routes between origin and destination with an intermediate stopover station.
 */
export function findRoutesWithStopover(
  originId: string,
  stopoverId: string | null,
  destinationId: string,
  preference: RoutePreference = 'fastest',
  avoidDisruptions: Disruption[] = [],
  activeDisruptions: Disruption[] = [],
  travelTimeOverrides?: TravelTimeOverridesMap
): RouteOption[] {
  if (!stopoverId || stopoverId === originId || stopoverId === destinationId) {
    return findRoutes(
      originId,
      destinationId,
      preference,
      avoidDisruptions,
      activeDisruptions,
      travelTimeOverrides
    );
  }

  const routesToStopover = findRoutes(
    originId,
    stopoverId,
    preference,
    avoidDisruptions,
    activeDisruptions,
    travelTimeOverrides
  );
  const routesFromStopover = findRoutes(
    stopoverId,
    destinationId,
    preference,
    avoidDisruptions,
    activeDisruptions,
    travelTimeOverrides
  );

  if (routesToStopover.length === 0 || routesFromStopover.length === 0) {
    return [];
  }

  const leg1 = routesToStopover[0];
  const leg2 = routesFromStopover[0];

  const stopoverStation = STATIONS[stopoverId];
  const lastLineLeg1 = leg1.legs[leg1.legs.length - 1]?.lineId;
  const firstLineLeg2 = leg2.legs[0]?.lineId;

  const requiresTransferAtStopover = lastLineLeg1 !== firstLineLeg2;
  const transfers: RouteTransfer[] = [...leg1.transfers];

  if (requiresTransferAtStopover && lastLineLeg1 && firstLineLeg2) {
    transfers.push({
      stationId: stopoverId,
      fromLineId: lastLineLeg1,
      toLineId: firstLineLeg2,
      walkMinutes: 3,
      instructions: `Umsteigen am Zwischenstopp ${stopoverStation?.name || stopoverId}: Wechseln von ${METRO_LINES[lastLineLeg1]?.name} in ${METRO_LINES[firstLineLeg2]?.name}`,
    });
  }

  transfers.push(...leg2.transfers);

  const combinedLegs = [...leg1.legs, ...leg2.legs];
  const combinedPathStationIds = [...leg1.pathStationIds, ...leg2.pathStationIds.slice(1)];
  const combinedLinesUsed = Array.from(new Set([...leg1.linesUsed, ...leg2.linesUsed]));

  const isBypass = !!(leg1.isAlternativeBypass || leg2.isAlternativeBypass);
  const title = isBypass
    ? `Über ${stopoverStation?.name || stopoverId} (Umfahrung)`
    : `Über ${stopoverStation?.name || stopoverId}`;

  const combinedRoute: RouteOption = {
    id: `stopover-route-${Date.now()}`,
    title,
    totalDurationMinutes: roundMinutes(
      leg1.totalDurationMinutes + leg2.totalDurationMinutes + (requiresTransferAtStopover ? 3 : 0)
    ),
    transfersCount: transfers.length,
    totalStops: leg1.totalStops + leg2.totalStops,
    legs: combinedLegs,
    transfers,
    pathStationIds: combinedPathStationIds,
    linesUsed: combinedLinesUsed,
    accessible: leg1.accessible && leg2.accessible,
    stopoverStationId: stopoverId,
    isAlternativeBypass: isBypass,
    bypassedDisruptionIds: Array.from(
      new Set([...(leg1.bypassedDisruptionIds || []), ...(leg2.bypassedDisruptionIds || [])])
    ),
  };

  const disruptionPool = activeDisruptions.length > 0 ? activeDisruptions : avoidDisruptions;
  combinedRoute.affectedDisruptions = getDisruptionsAffectingRoute(combinedRoute, disruptionPool);

  return [combinedRoute];
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
