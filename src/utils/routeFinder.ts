import { Station, LineId, RouteOption, RouteLeg, RouteTransfer, RoutePreference, Disruption } from '../types/metro';
import { METRO_LINES, STATIONS, NETWORK_CONNECTIONS } from '../data/metroData';

interface GraphEdge {
  to: string;
  lineId: LineId;
  duration: number;
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

for (const conn of NETWORK_CONNECTIONS) {
  if (!adjacencyList.has(conn.from)) {
    adjacencyList.set(conn.from, []);
  }
  if (!adjacencyList.has(conn.to)) {
    adjacencyList.set(conn.to, []);
  }

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
  activeDisruptions: Disruption[] = []
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
      avoidDisruptions
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
  activeDisruptions: Disruption[] = []
): RouteOption[] {
  if (!stopoverId || stopoverId === originId || stopoverId === destinationId) {
    return findRoutes(originId, destinationId, preference, avoidDisruptions, activeDisruptions);
  }

  const routesToStopover = findRoutes(
    originId,
    stopoverId,
    preference,
    avoidDisruptions,
    activeDisruptions
  );
  const routesFromStopover = findRoutes(
    stopoverId,
    destinationId,
    preference,
    avoidDisruptions,
    activeDisruptions
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
    totalDurationMinutes:
      leg1.totalDurationMinutes + leg2.totalDurationMinutes + (requiresTransferAtStopover ? 3 : 0),
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
  avoidDisruptions: Disruption[] = []
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
          edge.duration +
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
            duration: edge.duration,
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
        durationMinutes: step.duration,
        stopsCount: 1,
        networkType: netType,
      };
    } else {
      currentLeg.toStationId = step.stationId;
      currentLeg.stations.push(step.stationId);
      currentLeg.durationMinutes += step.duration;
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
    totalDurationMinutes: trueTotalTime,
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
