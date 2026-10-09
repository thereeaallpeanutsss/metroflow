import { STATIONS, METRO_LINES } from '../data/metroData';

interface Point {
  x: number;
  y: number;
}

// Maps lineId -> ordered canonical waypoints covering stations and 90-degree corners
// A segment between station A and station B is retrieved in forward or reverse order.
export const TRACK_SEGMENTS: Record<string, Point[]> = {
  // ================= U1 (U-Grün) =================
  'U-Grün:villen-viertel-nord:villen-viertel-west': [
    { x: 505, y: 175 },
    { x: 340, y: 175 },
  ],
  'U-Grün:villen-viertel-west:daniel-tower': [
    { x: 340, y: 175 },
    { x: 340, y: 335 },
  ],
  'U-Grün:daniel-tower:badesee': [
    { x: 340, y: 335 },
    { x: 340, y: 518 },
  ],
  'U-Grün:badesee:carl-station': [
    { x: 340, y: 518 },
    { x: 340, y: 568 },
  ],
  'U-Grün:carl-station:strand': [
    { x: 340, y: 568 },
    { x: 340, y: 678 },
    { x: 405, y: 678 },
  ],
  'U-Grün:strand:messehalle-1-2': [
    { x: 405, y: 678 },
    { x: 515, y: 678 },
  ],
  'U-Grün:messehalle-1-2:messehalle-3-4': [
    { x: 515, y: 678 },
    { x: 635, y: 678 },
  ],
  'U-Grün:messehalle-3-4:traphgon-city': [
    { x: 635, y: 678 },
    { x: 755, y: 678 },
  ],
  'U-Grün:traphgon-city:traphgon-airp': [
    { x: 755, y: 678 },
    { x: 830, y: 678 },
    { x: 830, y: 642 },
  ],

  // ================= U2 (U-Rot) =================
  'U-Rot:north-end:daniel-tower': [
    { x: 405, y: 280 },
    { x: 346, y: 280 },
    { x: 346, y: 335 },
  ],
  'U-Rot:daniel-tower:south-canal-harbor': [
    { x: 346, y: 335 },
    { x: 346, y: 388 },
    { x: 405, y: 388 },
  ],
  'U-Rot:south-canal-harbor:weisses-haus': [
    { x: 405, y: 388 },
    { x: 405, y: 415 },
    { x: 370, y: 415 },
    { x: 370, y: 445 },
  ],
  'U-Rot:weisses-haus:gare-du-nord': [
    { x: 370, y: 445 },
    { x: 455, y: 445 },
  ],
  'U-Rot:gare-du-nord:altstadt': [
    { x: 455, y: 445 },
    { x: 520, y: 445 },
  ],
  'U-Rot:altstadt:souhtern-city-center': [
    { x: 520, y: 445 },
    { x: 570, y: 445 },
    { x: 570, y: 410 },
  ],
  'U-Rot:souhtern-city-center:mosslands-explorers': [
    { x: 570, y: 410 },
    { x: 570, y: 400 },
    { x: 635, y: 400 },
  ],

  // ================= U3 (U-Schwarz) =================
  'U-Schwarz:city-center:south-canal-quarter': [
    { x: 570, y: 352 },
    { x: 505, y: 352 },
  ],
  'U-Schwarz:south-canal-quarter:arena': [
    { x: 505, y: 352 },
    { x: 455, y: 352 },
    { x: 455, y: 370 },
  ],
  'U-Schwarz:arena:gare-du-nord': [
    { x: 455, y: 370 },
    { x: 455, y: 445 },
  ],
  'U-Schwarz:gare-du-nord:central-station': [
    { x: 455, y: 445 },
    { x: 455, y: 532 },
  ],
  'U-Schwarz:central-station:taiga-forest': [
    { x: 455, y: 532 },
    { x: 455, y: 568 },
    { x: 635, y: 568 },
  ],
  'U-Schwarz:taiga-forest:traphgon-airp': [
    { x: 635, y: 568 },
    { x: 824, y: 568 },
    { x: 824, y: 642 },
    { x: 830, y: 642 },
  ],

  // ================= U4 (U-Orange) =================
  'U-Orange:daniel-tower:south-canal-quarter': [
    { x: 340, y: 335 },
    { x: 485, y: 335 },
    { x: 485, y: 346 },
    { x: 505, y: 346 },
  ],
  'U-Orange:south-canal-quarter:city-center': [
    { x: 505, y: 346 },
    { x: 570, y: 346 },
  ],

  // ================= TIM TRAIN =================
  'Tim-Train:north-end:squishmallow-city': [
    { x: 405, y: 280 },
    { x: 505, y: 280 },
  ],
  'Tim-Train:squishmallow-city:city-center': [
    { x: 505, y: 280 },
    { x: 516, y: 280 },
    { x: 516, y: 338 },
    { x: 570, y: 338 },
    { x: 570, y: 352 },
  ],
  'Tim-Train:city-center:tims-outlet': [
    { x: 570, y: 352 },
    { x: 625, y: 352 },
  ],
  'Tim-Train:tims-outlet:tim-hotel': [
    { x: 625, y: 352 },
    { x: 670, y: 352 },
  ],
  'Tim-Train:tim-hotel:dog-care': [
    { x: 670, y: 352 },
    { x: 715, y: 352 },
  ],

  // ================= U6 (U-Hellgrün) =================
  'U-Hellgrün:lake-road:gare-du-nord': [
    { x: 395, y: 478 },
    { x: 395, y: 451 },
    { x: 455, y: 451 },
  ],
  'U-Hellgrün:gare-du-nord:place-de-la-geiger': [
    { x: 455, y: 451 },
    { x: 485, y: 451 },
    { x: 485, y: 478 },
  ],

  // ================= U5 (U-Blau) =================
  'U-Blau:daniel-tower:badesee': [
    { x: 346, y: 335 },
    { x: 346, y: 518 },
  ],
  'U-Blau:badesee:carl-station': [
    { x: 346, y: 518 },
    { x: 346, y: 568 },
  ],
  'U-Blau:carl-station:airport-hotel': [
    { x: 346, y: 568 },
    { x: 346, y: 604 },
    { x: 405, y: 604 },
  ],
  'U-Blau:airport-hotel:kellrods-airp': [
    { x: 405, y: 604 },
    { x: 405, y: 532 },
  ],
  'U-Blau:kellrods-airp:central-station': [
    { x: 405, y: 532 },
    { x: 455, y: 532 },
  ],

  // ================= IC 7 (U-Türkis) =================
  'U-Türkis:gare-du-nord:zoo': [
    { x: 455, y: 445 },
    { x: 485, y: 445 },
    { x: 485, y: 460 },
    { x: 635, y: 460 },
  ],
  'U-Türkis:zoo:tinnifer-aquatic-center': [
    { x: 635, y: 460 },
    { x: 715, y: 460 },
  ],

  // ================= IC 8 (U-Pink) =================
  'U-Pink:gare-du-nord:coral-bay': [
    { x: 455, y: 445 },
    { x: 468, y: 445 },
    { x: 468, y: 428 },
    { x: 830, y: 428 },
  ],

  // ================= IC Camp Carl Nord =================
  'IC-CampCarl-Nord:gare-du-nord:camp-carl': [
    { x: 455, y: 448 },
    { x: 472, y: 448 },
    { x: 472, y: 510 },
    { x: 640, y: 510 },
    { x: 640, y: 515 },
  ],

  // ================= IC Camp Carl Central =================
  'IC-CampCarl-Central:central-station:camp-carl': [
    { x: 455, y: 532 },
    { x: 480, y: 532 },
    { x: 480, y: 520 },
    { x: 640, y: 520 },
    { x: 640, y: 515 },
  ],

  // ================= IC 10 (U-Dunkelblau) =================
  'U-Dunkelblau:central-station:rathaus': [
    { x: 455, y: 532 },
    { x: 455, y: 550 },
    { x: 195, y: 550 },
  ],
  'U-Dunkelblau:rathaus:jurassic-park': [
    { x: 195, y: 550 },
    { x: 45, y: 550 },
  ],
  'U-Dunkelblau:jurassic-park:carls-hotel': [
    { x: 45, y: 550 },
    { x: 45, y: 608 },
  ],

  // ================= IC 11 (U-Hellblau) =================
  'U-Hellblau:gare-du-nord:stadium-retow': [
    { x: 455, y: 445 },
    { x: 440, y: 445 },
    { x: 440, y: 465 },
    { x: 245, y: 465 },
    { x: 245, y: 624 },
    { x: 195, y: 624 },
  ],
  'U-Hellblau:stadium-retow:retow-terminus': [
    { x: 195, y: 624 },
    { x: 110, y: 624 },
    { x: 110, y: 678 },
  ],

  // ================= IC 12 (U-Violett) =================
  'U-Violett:retow-terminus:sonnenaufgangsstrasse-retow': [
    { x: 110, y: 678 },
    { x: 195, y: 678 },
  ],
  'U-Violett:sonnenaufgangsstrasse-retow:central-station': [
    { x: 195, y: 678 },
    { x: 250, y: 678 },
    { x: 250, y: 576 },
    { x: 455, y: 576 },
    { x: 455, y: 532 },
  ],

  // ================= IC-Stonebrook =================
  'IC-Stonebrook:stonebrook:gare-du-nord': [
    { x: 195, y: 425 },
    { x: 440, y: 425 },
    { x: 440, y: 445 },
    { x: 455, y: 445 },
  ],

  // ================= IC-Nordwest =================
  'IC-Nordwest:blue-lagoon:villen-viertel-west': [
    { x: 340, y: 25 },
    { x: 340, y: 175 },
  ],
  'IC-Nordwest:willow-creek:villen-viertel-west': [
    { x: 245, y: 105 },
    { x: 340, y: 105 },
    { x: 340, y: 175 },
  ],
  'IC-Nordwest:villen-viertel-west:gare-du-nord': [
    { x: 340, y: 175 },
    { x: 340, y: 182 },
    { x: 468, y: 182 },
    { x: 468, y: 438 },
    { x: 455, y: 438 },
    { x: 455, y: 445 },
  ],

  // ================= Plan-Traphgon-T3 =================
  'Plan-Traphgon-T3:gare-du-nord:traphgon-airp': [
    { x: 455, y: 445 },
    { x: 470, y: 445 },
    { x: 470, y: 452 },
    { x: 842, y: 452 },
    { x: 842, y: 642 },
    { x: 830, y: 642 },
  ],
  'Plan-Traphgon-T3:traphgon-airp:traphgon-fern-t3': [
    { x: 830, y: 642 },
    { x: 842, y: 642 },
    { x: 905, y: 642 },
  ],
};

// Aliases for legacy IC line keys
const LINE_ALIASES: Record<string, string> = {
  'IC-Ost': 'U-Pink',
  'IC-6': 'U-Pink',
  'IC-7': 'U-Türkis',
  'IC-4': 'IC-Nordwest',
  'IC-5': 'IC-Nordwest',
  'IC-2': 'U-Dunkelblau',
  'IC-3': 'IC-CampCarl-Central',
  'IC-SW': 'U-Violett',
  'IC-Südwest': 'U-Violett',
};

/**
 * Returns the exact track segment points between two connected stations on a line.
 * Automatically handles forward, reverse, and intermediate station steps.
 */
export function getSegmentPoints(lineId: string, fromId: string, toId: string): Point[] {
  const resolvedLineId = LINE_ALIASES[lineId] || lineId;

  // 1. Check direct key (forward)
  const forwardKey = `${resolvedLineId}:${fromId}:${toId}`;
  if (TRACK_SEGMENTS[forwardKey]) {
    return TRACK_SEGMENTS[forwardKey];
  }

  // 2. Check reverse key (backward)
  const reverseKey = `${resolvedLineId}:${toId}:${fromId}`;
  if (TRACK_SEGMENTS[reverseKey]) {
    return [...TRACK_SEGMENTS[reverseKey]].reverse();
  }

  // 3. Check if both stations are on the line and separated by multiple intermediate stops
  const metroLine = METRO_LINES[resolvedLineId];
  if (metroLine && metroLine.stations.includes(fromId) && metroLine.stations.includes(toId)) {
    const fromIdx = metroLine.stations.indexOf(fromId);
    const toIdx = metroLine.stations.indexOf(toId);
    const step = toIdx > fromIdx ? 1 : -1;
    const multiSegmentPoints: Point[] = [];

    for (let i = fromIdx; i !== toIdx; i += step) {
      const sA = metroLine.stations[i];
      const sB = metroLine.stations[i + step];
      const direct = `${resolvedLineId}:${sA}:${sB}`;
      const rev = `${resolvedLineId}:${sB}:${sA}`;
      const subPoints = TRACK_SEGMENTS[direct]
        ? TRACK_SEGMENTS[direct]
        : TRACK_SEGMENTS[rev]
        ? [...TRACK_SEGMENTS[rev]].reverse()
        : null;

      if (subPoints && subPoints.length > 0) {
        if (multiSegmentPoints.length === 0) {
          multiSegmentPoints.push(...subPoints);
        } else {
          const last = multiSegmentPoints[multiSegmentPoints.length - 1];
          const startK = (subPoints[0].x === last.x && subPoints[0].y === last.y) ? 1 : 0;
          for (let k = startK; k < subPoints.length; k++) {
            multiSegmentPoints.push(subPoints[k]);
          }
        }
      }
    }

    if (multiSegmentPoints.length >= 2) {
      return multiSegmentPoints;
    }
  }

  // 4. Clean orthogonal right-angle fallback (never draw a diagonal direct line)
  const stA = STATIONS[fromId];
  const stB = STATIONS[toId];
  if (stA && stB) {
    if (stA.x === stB.x || stA.y === stB.y) {
      return [{ x: stA.x, y: stA.y }, { x: stB.x, y: stB.y }];
    }
    // L-shaped bend (orthogonal)
    return [
      { x: stA.x, y: stA.y },
      { x: stA.x, y: stB.y },
      { x: stB.x, y: stB.y },
    ];
  }

  return [];
}

/**
 * Builds the complete, continuous SVG path 'd' string for a journey leg.
 * Traces every 90-degree corner and track corridor exactly as displayed on the map.
 */
export function buildLegTrackPath(lineId: string, stationIds: string[]): string {
  if (!stationIds || stationIds.length < 2) return '';

  const allPoints: Point[] = [];

  for (let i = 0; i < stationIds.length - 1; i++) {
    const fromId = stationIds[i];
    const toId = stationIds[i + 1];
    const segment = getSegmentPoints(lineId, fromId, toId);

    if (segment.length > 0) {
      if (allPoints.length === 0) {
        allPoints.push(...segment);
      } else {
        // Skip first point of this segment if it matches the last point to avoid duplicate coordinates
        const last = allPoints[allPoints.length - 1];
        const startIndex = (segment[0].x === last.x && segment[0].y === last.y) ? 1 : 0;
        for (let j = startIndex; j < segment.length; j++) {
          allPoints.push(segment[j]);
        }
      }
    }
  }

  if (allPoints.length < 2) return '';

  return allPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');
}
