export type MetroLineId = 'U-Grün' | 'U-Rot' | 'U-Schwarz' | 'U-Orange' | 'U-Blau' | 'Tim-Train';
export type ICLineId = 'IC-1' | 'IC-2' | 'IC-3' | 'IC-4' | 'IC-5' | 'IC-6' | 'IC-7';
export type LineId = MetroLineId | ICLineId;

export type LineNetworkType = 'metro' | 'ic';

export interface LineInfo {
  id: LineId;
  name: string;
  shortName: string;
  badge: string;
  color: string;
  textColor: string;
  terminals: [string, string];
  description: string;
  stations: string[]; // station IDs in order
  frequencyMinutes: number;
  networkType: LineNetworkType;
}

export interface Station {
  id: string;
  name: string;
  shortName?: string;
  lines: LineId[];
  x: number; // SVG coordinate 0 - 1020
  y: number; // SVG coordinate 0 - 680
  isInterchange: boolean; // Pill / rounded rectangle ((Haupt-) Bahnhof)
  hasAirport: boolean; // ✈
  hasIC: boolean; // 🚆 Umsteigemöglichkeiten zu IC-Zuglinien
  isAccessible: boolean; // ♿ Barrierefreier Ausgang
  isTimTrain: boolean; // (T) Tim Train
  isICOnly?: boolean; // Station belongs exclusively to IC network
  hasICTransferRequired?: boolean; // ⚙️ Umsteigen notwendig (auf andere IC-Zuglinie)
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  description?: string;
}

export interface Connection {
  from: string; // station id
  to: string; // station id
  lineId: LineId;
  durationMinutes: number;
}

export interface RouteLeg {
  lineId: LineId;
  fromStationId: string;
  toStationId: string;
  stations: string[]; // includes from and to
  durationMinutes: number;
  stopsCount: number;
  networkType: LineNetworkType;
}

export interface RouteTransfer {
  stationId: string;
  fromLineId: LineId;
  toLineId: LineId;
  walkMinutes: number;
  instructions: string;
}

export type DisruptionType =
  | 'missing_tracks'
  | 'inactive_redstone'
  | 'empty_minecart'
  | 'construction'
  | 'closure'
  | 'delay';

export interface Disruption {
  id: string;
  lineId: LineId;
  type: DisruptionType;
  title: string;
  description?: string;
  fromStationId: string;
  toStationId: string;
  affectedStations: string[];
  timestamp: number;
  confirmations: number;
  resolvedReports?: number; // When 10 reports that disruption is gone, it disappears
  isActive: boolean;
  validUntil?: string;
  reportedBy?: string;
}

export interface RouteOption {
  id: string;
  title: string;
  totalDurationMinutes: number;
  transfersCount: number;
  totalStops: number;
  legs: RouteLeg[];
  transfers: RouteTransfer[];
  pathStationIds: string[];
  linesUsed: LineId[];
  accessible: boolean;
  stopoverStationId?: string;
  isAlternativeBypass?: boolean;
  bypassedDisruptionIds?: string[];
  affectedDisruptions?: Disruption[];
}

export interface SavedJourney {
  id: string;
  timestamp: number;
  originId: string;
  destinationId: string;
  stopoverId?: string;
  originName: string;
  destinationName: string;
  stopoverName?: string;
  durationMinutes: number;
  transfersCount: number;
  linesUsed: LineId[];
}

export interface RecentRoute {
  id: string;
  timestamp: number;
  originId: string;
  destinationId: string;
  stopoverId?: string;
  originName: string;
  destinationName: string;
  stopoverName?: string;
  durationMinutes?: number;
  transfersCount?: number;
  linesUsed?: LineId[];
}

export type RoutePreference = 'fastest' | 'fewest-transfers' | 'prioritize-metro' | 'prioritize-ic' | 'accessible';
