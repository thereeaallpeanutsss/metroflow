import React from 'react';

interface TransitHeroArtworkProps {
  variant?: 'hero' | 'preview';
  className?: string;
}

/**
 * Architectural SVG interpretation of the MetroFlow 044 "ÄÄ" App Icon:
 * - Vertical red metro line intersecting a horizontal amber/yellow line
 * - Angled amber-left + red-right "A" frame topped with two glowing amber umlaut circles
 * - Diagonal/bent blue metro line crossing through
 * - Circular station interchange nodes with dark inner rings
 */
export const TransitHeroArtwork: React.FC<TransitHeroArtworkProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const uid = variant === 'preview' ? 'prev' : 'hero';

  return (
    <svg
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={`transit-glow-red-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`transit-glow-amber-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`transit-glow-blue-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft ambient line under-glows */}
      <g opacity="0.55">
        <path
          d="M180 -8V228"
          stroke="#EF4444"
          strokeWidth="16"
          strokeLinecap="round"
          filter={`url(#transit-glow-red-${uid})`}
        />
        <path
          d="M96 172H370"
          stroke="#F59E0B"
          strokeWidth="16"
          strokeLinecap="round"
          filter={`url(#transit-glow-amber-${uid})`}
        />
        <path
          d="M44 58H180L234 120L272 108H370"
          stroke="#3B82F6"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#transit-glow-blue-${uid})`}
        />
      </g>

      {/* Vertical Blue Stem from lower-right interchange */}
      <path
        d="M270 172V228"
        stroke="#3A8FE8"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Horizontal Blue Bend & Diagonal Route */}
      <path
        d="M44 58H180L236 122L272 108H370"
        stroke="#3A8FE8"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Vertical Red Metro Trunk */}
      <path
        d="M180 -8V228"
        stroke="#E03E32"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* "A" Frame Right Leg (Red) */}
      <path
        d="M236 44L274 172"
        stroke="#E03E32"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* "A" Frame Left Leg (Amber/Yellow) */}
      <path
        d="M192 172L232 44"
        stroke="#F5B31A"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Horizontal Amber/Yellow Metro Trunk */}
      <path
        d="M96 172H370"
        stroke="#F5B31A"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Glowing Umlaut Dots (ÄÄ) */}
      <g filter={`url(#transit-glow-amber-${uid})`}>
        <circle cx="222" cy="20" r="7" fill="#FBBF24" />
        <circle cx="244" cy="20" r="7" fill="#FBBF24" />
      </g>

      {/* Line Terminal Endcaps */}
      <circle cx="44" cy="58" r="5.5" fill="#60A5FA" />
      <circle cx="96" cy="172" r="5.5" fill="#FBBF24" />

      {/* 3 Iconic Station Interchange Nodes */}
      {/* Top-Left (Blue / Red) */}
      <g>
        <circle cx="180" cy="58" r="11.5" fill="#1B2230" />
        <circle cx="180" cy="58" r="7" fill="#3A8FE8" stroke="#0F172A" strokeWidth="1.5" />
      </g>

      {/* Bottom-Left (Red / Yellow) */}
      <g>
        <circle cx="180" cy="172" r="11.5" fill="#1B2230" />
        <circle cx="180" cy="172" r="7" fill="#E03E32" stroke="#0F172A" strokeWidth="1.5" />
      </g>

      {/* Bottom-Right (Yellow / Blue) */}
      <g>
        <circle cx="270" cy="172" r="11.5" fill="#1B2230" />
        <circle cx="270" cy="172" r="7" fill="#F5B31A" stroke="#0F172A" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

interface TransitTrackFrameProps {
  variant: 'warm' | 'cool';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Signature Metro-Line Perimeter Card Wrapper:
 * Adds the 1.5px glowing Red->Amber or Blue->Sky perimeter track + 4 midpoint circular station nodes
 * seen around article cards in the MetroFlow Transit design.
 */
export const TransitTrackFrame: React.FC<TransitTrackFrameProps> = ({
  variant,
  children,
  onClick,
  className = '',
}) => {
  const isWarm = variant === 'warm';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-[22px] p-[1.5px] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer group ${
        isWarm
          ? 'bg-gradient-to-r from-[#E03E32] via-[#EF6A2E] to-[#F5B31A] shadow-[0_8px_28px_-8px_rgba(239,68,68,0.28)] dark:shadow-[0_10px_32px_-8px_rgba(239,68,68,0.34)]'
          : 'bg-gradient-to-r from-[#2563EB] via-[#3A8FE8] to-[#38BDF8] shadow-[0_8px_28px_-8px_rgba(59,130,246,0.26)] dark:shadow-[0_10px_32px_-8px_rgba(59,130,246,0.32)]'
      } ${className}`}
    >
      {/* Subtle outer ambient bloom */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-[1px] rounded-[23px] opacity-30 blur-[6px] transition-opacity duration-300 group-hover:opacity-55 ${
          isWarm
            ? 'bg-gradient-to-r from-[#E03E32] to-[#F5B31A]'
            : 'bg-gradient-to-r from-[#2563EB] to-[#38BDF8]'
        }`}
      />

      {/* Top Midpoint Station Node */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-[5.5px] left-1/2 -translate-x-1/2 z-20 w-[11px] h-[11px] rounded-full border-[2px] bg-white dark:bg-[#0d111a] ${
          isWarm
            ? 'border-[#EB592F] shadow-[0_0_8px_rgba(239,68,68,0.55)]'
            : 'border-[#3A8FE8] shadow-[0_0_8px_rgba(59,130,246,0.55)]'
        }`}
      />

      {/* Bottom Midpoint Station Node */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-[5.5px] left-1/2 -translate-x-1/2 z-20 w-[11px] h-[11px] rounded-full border-[2px] bg-white dark:bg-[#0d111a] ${
          isWarm
            ? 'border-[#EB592F] shadow-[0_0_8px_rgba(245,158,11,0.55)]'
            : 'border-[#3A8FE8] shadow-[0_0_8px_rgba(56,189,248,0.55)]'
        }`}
      />

      {/* Left Midpoint Station Node */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -left-[5.5px] -translate-y-1/2 z-20 w-[11px] h-[11px] rounded-full border-[2px] bg-white dark:bg-[#0d111a] ${
          isWarm
            ? 'border-[#E03E32] shadow-[0_0_8px_rgba(224,62,50,0.55)]'
            : 'border-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.55)]'
        }`}
      />

      {/* Right Midpoint Station Node */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -right-[5.5px] -translate-y-1/2 z-20 w-[11px] h-[11px] rounded-full border-[2px] bg-white dark:bg-[#0d111a] ${
          isWarm
            ? 'border-[#F5B31A] shadow-[0_0_8px_rgba(245,179,26,0.55)]'
            : 'border-[#94A3B8] dark:border-[#64748B] shadow-[0_0_8px_rgba(148,163,184,0.4)]'
        }`}
      />

      {/* Inner Card Surface */}
      <div className="relative z-10 h-full rounded-[20.5px] bg-white dark:bg-[#141923] p-5 flex flex-col justify-between space-y-3">
        {children}
      </div>
    </div>
  );
};

/**
 * Lightweight GPU-composited background metro line art with 0.5x vertical scroll parallax.
 *
 * Continuity & Performance architecture:
 * 1. All metro lines are authored once as continuous vertex arrays. A rounded-corner path builder
 *    generates smooth <path> strings shared identically by the static SVG tracks and CSS
 *    `offset-path` train animations, so trains follow every bend along the ENTIRE line from
 *    offscreen to offscreen and never disappear mid-screen.
 * 2. Every station node is derived programmatically from true line-to-line intersections and
 *    exact path vertices — guaranteeing zero floating/unconnected stations.
 * 3. Scroll parallax uses native compositor `ScrollTimeline` where supported (with a layout-free
 *    rAF transform-only fallback) and the static SVG caches the 48px grid on the GPU once.
 */
const STAGE_W = 1440;
const UNIQUE_H = 3600;
const BUFFER_H = 1160;
const TOTAL_H = UNIQUE_H + BUFFER_H; // 4760

type Pt = readonly [number, number];

interface LineSpec {
  id: string;
  color: string;
  trainColor: string;
  glowColor: string;
  width: number;
  opacity: number;
  points: Pt[];
  isVerticalTrunk?: boolean;
  /** Number of staggered trains along this full line (1-3) */
  trainCount: number;
  durationSec: number;
  reverse?: boolean;
}

const RAW_TRUNK_LINES: LineSpec[] = [
  {
    id: 'trunk-red-main',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 6.5,
    opacity: 0.48,
    isVerticalTrunk: true,
    trainCount: 3,
    durationSec: 30,
    points: [
      [620, 0], [620, 160], [740, 280], [740, 480], [560, 660], [560, 880],
      [680, 1000], [680, 1220], [840, 1380], [840, 1600], [600, 1840], [600, 2040],
      [760, 2200], [760, 2440], [540, 2660], [540, 2880], [700, 3040], [700, 3260],
      [620, 3340], [620, 3600],
    ],
  },
  {
    id: 'trunk-blue-express',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 6.5,
    opacity: 0.50,
    isVerticalTrunk: true,
    trainCount: 3,
    durationSec: 27,
    reverse: true,
    points: [
      [820, 0], [820, 90], [700, 210], [700, 420], [860, 580], [860, 780],
      [640, 1000], [640, 1180], [780, 1320], [780, 1560], [660, 1680], [660, 1900],
      [880, 2120], [880, 2340], [680, 2540], [680, 2740], [840, 2900], [840, 3140],
      [740, 3240], [740, 3420], [820, 3500], [820, 3600],
    ],
  },
  {
    id: 'trunk-amber-spine',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6,
    opacity: 0.44,
    isVerticalTrunk: true,
    trainCount: 3,
    durationSec: 33,
    points: [
      [540, 0], [540, 140], [680, 280], [680, 380], [580, 480], [580, 720],
      [780, 920], [780, 1080], [560, 1300], [560, 1500], [740, 1680], [740, 1840],
      [540, 2040], [540, 2240], [700, 2400], [700, 2600], [600, 2700], [600, 2960],
      [780, 3140], [780, 3320], [540, 3560], [540, 3600],
    ],
  },
  {
    id: 'wing-left-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 6,
    opacity: 0.42,
    isVerticalTrunk: true,
    trainCount: 2,
    durationSec: 28,
    points: [
      [220, 0], [220, 640], [320, 740], [320, 1420], [180, 1560], [180, 2240],
      [300, 2360], [300, 3060], [220, 3140], [220, 3600],
    ],
  },
  {
    id: 'wing-right-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 6,
    opacity: 0.42,
    isVerticalTrunk: true,
    trainCount: 2,
    durationSec: 29,
    reverse: true,
    points: [
      [1220, 0], [1220, 480], [1100, 600], [1100, 1260], [1260, 1420], [1260, 2100],
      [1120, 2240], [1120, 2920], [1220, 3020], [1220, 3600],
    ],
  },
];

const CROSS_LINES: LineSpec[] = [
  {
    id: 'cross-1-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 12,
    points: [[-80, 80], [540, 80], [640, 180], [1120, 180], [1220, 80], [1520, 80]],
  },
  {
    id: 'cross-1-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 13.5,
    reverse: true,
    points: [[-80, 160], [320, 160], [420, 60], [920, 60], [1060, 200], [1520, 200]],
  },
  {
    id: 'cross-2-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6.5,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 11.5,
    points: [[1520, 320], [1040, 320], [920, 440], [460, 440], [340, 320], [-80, 320]],
  },
  {
    id: 'cross-3-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 12.5,
    points: [[-80, 560], [400, 560], [520, 680], [960, 680], [1100, 540], [1520, 540]],
  },
  {
    id: 'cross-4-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 13,
    points: [[1520, 820], [980, 820], [860, 700], [520, 700], [380, 840], [-80, 840]],
  },
  {
    id: 'cross-4-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6,
    opacity: 0.44,
    trainCount: 1,
    durationSec: 11,
    points: [[-80, 920], [640, 920], [760, 800], [1520, 800]],
  },
  {
    id: 'cross-5-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 12,
    reverse: true,
    points: [[-80, 1120], [480, 1120], [600, 1000], [900, 1000], [1040, 1140], [1520, 1140]],
  },
  {
    id: 'cross-6-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6.5,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 13,
    points: [[1520, 1300], [1080, 1300], [940, 1440], [420, 1440], [280, 1300], [-80, 1300]],
  },
  {
    id: 'cross-7-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 11.5,
    points: [[-80, 1560], [360, 1560], [500, 1700], [840, 1700], [980, 1560], [1520, 1560]],
  },
  {
    id: 'cross-8-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 12.8,
    points: [[1520, 1820], [920, 1820], [780, 1960], [540, 1960], [400, 1820], [-80, 1820]],
  },
  {
    id: 'cross-8-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 12.2,
    points: [[-80, 2120], [500, 2120], [640, 1980], [920, 1980], [1080, 2140], [1520, 2140]],
  },
  {
    id: 'cross-9-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 13.2,
    points: [[1520, 2320], [1020, 2320], [880, 2180], [560, 2180], [420, 2320], [-80, 2320]],
  },
  {
    id: 'cross-10-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 11.8,
    points: [[-80, 2620], [440, 2620], [580, 2480], [860, 2480], [1020, 2640], [1520, 2640]],
  },
  {
    id: 'cross-11-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 12.4,
    points: [[1520, 2820], [960, 2820], [820, 2960], [500, 2960], [360, 2820], [-80, 2820]],
  },
  {
    id: 'cross-11-red',
    color: '#E03E32',
    trainColor: '#FF6B5B',
    glowColor: 'rgba(255,107,91,0.75)',
    width: 6.5,
    opacity: 0.46,
    trainCount: 1,
    durationSec: 13.4,
    points: [[-80, 3100], [380, 3100], [520, 2960], [880, 2960], [1020, 3100], [1520, 3100]],
  },
  {
    id: 'cross-12-blue',
    color: '#3A8FE8',
    trainColor: '#60A5FA',
    glowColor: 'rgba(96,165,250,0.75)',
    width: 7,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 12,
    points: [[1520, 3320], [1060, 3320], [920, 3180], [540, 3180], [400, 3320], [-80, 3320]],
  },
  {
    id: 'cross-13-amber',
    color: '#F5B31A',
    trainColor: '#FDE047',
    glowColor: 'rgba(253,224,71,0.75)',
    width: 6.5,
    opacity: 0.48,
    trainCount: 1,
    durationSec: 11.6,
    points: [[-80, 3480], [480, 3480], [580, 3380], [880, 3380], [980, 3480], [1520, 3480]],
  },
];

/** Extend a vertical trunk seamlessly from y=-80 through y=TOTAL_H+80 (4840) */
function buildContinuousTrunkPoints(base: Pt[]): Pt[] {
  const xStart = base[0][0];
  const continuation = base
    .slice(1)
    .map(([x, y]) => [x, y + UNIQUE_H] as Pt)
    .filter(([, y]) => y <= TOTAL_H);
  return [[xStart, -80], ...base, ...continuation, [xStart, TOTAL_H + 80]];
}

/** Build a smooth rounded-corner SVG path shared identically by tracks and CSS offset-path */
function buildRoundedPath(pts: Pt[], radius = 16): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const v1x = cx - px;
    const v1y = cy - py;
    const len1 = Math.hypot(v1x, v1y);
    const v2x = nx - cx;
    const v2y = ny - cy;
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 1 || len2 < 1) {
      d += ` L ${cx} ${cy}`;
      continue;
    }
    const r = Math.min(radius, len1 * 0.4, len2 * 0.4);
    const inX = cx - (v1x / len1) * r;
    const inY = cy - (v1y / len1) * r;
    const outX = cx + (v2x / len2) * r;
    const outY = cy + (v2y / len2) * r;
    d += ` L ${inX.toFixed(1)} ${inY.toFixed(1)} Q ${cx} ${cy} ${outX.toFixed(1)} ${outY.toFixed(1)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  d += ` L ${lx} ${ly}`;
  return d;
}

/** Segment-segment intersection helper; returns point if strictly interior to avoid rounded corner offset */
function segmentIntersection(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const denom = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0]);
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / denom;
  const u = ((a1[0] - b1[0]) * (a1[1] - a2[1]) - (a1[1] - b1[1]) * (a1[0] - a2[0])) / denom;
  if (t >= 0.01 && t <= 0.99 && u >= 0.01 && u <= 0.99) {
    return [
      Math.round(a1[0] + t * (a2[0] - a1[0])),
      Math.round(a1[1] + t * (a2[1] - a1[1])),
    ];
  }
  return null;
}

/** Distance from point to segment (used to snap stations cleanly to exact lines) */
function distToSegment(p: Pt, v: Pt, w: Pt): number {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (v[0] + t * (w[0] - v[0])), p[1] - (v[1] + t * (w[1] - v[1])));
}

/** Build all lines + 100% connected stations + full-path animated trains once at module init */
const COMPILED_NETWORK = (() => {
  // Build SVG lines (trunks span continuously 0..TOTAL_H; cross lines repeat cleanly into buffer)
  const bufferCrossLines: LineSpec[] = CROSS_LINES.filter((l) =>
    l.points.some(([, y]) => y <= BUFFER_H)
  ).map((l) => ({
    ...l,
    id: `${l.id}-buf`,
    points: l.points.map(([x, y]) => [x, y + UNIQUE_H] as Pt),
  }));

  const fullTrunks = RAW_TRUNK_LINES.map((t) => ({
    ...t,
    points: buildContinuousTrunkPoints(t.points),
  }));

  const allCross = [...CROSS_LINES, ...bufferCrossLines];
  const allLines = [...fullTrunks, ...allCross];

  const svgLines = allLines.map((line) => ({
    ...line,
    d: buildRoundedPath(line.points, 14),
    trainD: buildRoundedPath(line.reverse ? [...line.points].reverse() : line.points, 14),
  }));

  // Programmatically compute all true line-to-line intersections + local line points (zero unconnected stations!)
  const stationCandidates: Array<{ pt: Pt; isInterchange: boolean }> = [];

  for (let i = 0; i < allLines.length; i++) {
    for (let j = i + 1; j < allLines.length; j++) {
      const ptsA = allLines[i].points;
      const ptsB = allLines[j].points;
      for (let a = 0; a < ptsA.length - 1; a++) {
        for (let b = 0; b < ptsB.length - 1; b++) {
          const hit = segmentIntersection(ptsA[a], ptsA[a + 1], ptsB[b], ptsB[b + 1]);
          if (hit && hit[0] >= 70 && hit[0] <= STAGE_W - 70 && hit[1] >= 40 && hit[1] <= TOTAL_H - 40) {
            // Skip intersections right on top of a rounded corner so the circle centers on both paths
            const nearCornerA =
              Math.hypot(hit[0] - ptsA[a][0], hit[1] - ptsA[a][1]) < 16 ||
              Math.hypot(hit[0] - ptsA[a + 1][0], hit[1] - ptsA[a + 1][1]) < 16;
            const nearCornerB =
              Math.hypot(hit[0] - ptsB[b][0], hit[1] - ptsB[b][1]) < 16 ||
              Math.hypot(hit[0] - ptsB[b + 1][0], hit[1] - ptsB[b + 1][1]) < 16;
            if (!nearCornerA && !nearCornerB) {
              stationCandidates.push({ pt: hit, isInterchange: true });
            }
          }
        }
      }
    }
  }

  // Add mid-segment local stations along straight runs where sparse, guaranteed on exact segments
  for (const line of allLines) {
    for (let k = 0; k < line.points.length - 1; k++) {
      const [x1, y1] = line.points[k];
      const [x2, y2] = line.points[k + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len >= 160) {
        const mid: Pt = [Math.round((x1 + x2) * 0.5), Math.round((y1 + y2) * 0.5)];
        if (mid[0] >= 80 && mid[0] <= STAGE_W - 80 && mid[1] >= 40 && mid[1] <= TOTAL_H - 40) {
          stationCandidates.push({ pt: mid, isInterchange: false });
        }
      }
    }
  }

  // Filter so stations maintain comfortable spacing (>= 95px apart) and verify every station lies on a line
  const stations: Array<{ cx: number; cy: number; r: number }> = [];
  for (const cand of stationCandidates) {
    const tooClose = stations.some(
      (s) => Math.hypot(s.cx - cand.pt[0], s.cy - cand.pt[1]) < 95
    );
    if (tooClose) continue;

    const onAnyLine = allLines.some((l) => {
      for (let k = 0; k < l.points.length - 1; k++) {
        if (distToSegment(cand.pt, l.points[k], l.points[k + 1]) <= 1.5) return true;
      }
      return false;
    });
    if (!onAnyLine) continue;

    stations.push({
      cx: cand.pt[0],
      cy: cand.pt[1],
      r: cand.isInterchange ? 8.5 : 6.8,
    });
  }

  // Expand train instances (staggered along each full line so trains never spawn/vanish mid-screen)
  const trains: Array<{
    key: string;
    pathD: string;
    color: string;
    glowColor: string;
    durationSec: number;
    delaySec: number;
  }> = [];

  svgLines.forEach((line, lineIdx) => {
    const slowedDuration = Number((line.durationSec * 1.45).toFixed(2));
    for (let t = 0; t < line.trainCount; t++) {
      const stagger = -((slowedDuration / line.trainCount) * t + ((lineIdx * 2.7) % slowedDuration));
      trains.push({
        key: `${line.id}-t${t}`,
        pathD: line.trainD,
        color: line.trainColor,
        glowColor: line.glowColor,
        durationSec: slowedDuration,
        delaySec: Number(stagger.toFixed(2)),
      });
    }
  });

  return { svgLines, stations, trains };
})();

type ScrollTimelineCtor = new (options: { source: Element; axis: 'block' | 'inline' }) => AnimationTimeline;

export const TransitAnimatedBackground: React.FC = () => {
  const scaleWrapRef = React.useRef<HTMLDivElement | null>(null);
  const parallaxRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const scaleWrap = scaleWrapRef.current;
    const parallax = parallaxRef.current;
    if (!scaleWrap || !parallax) return;

    let rafId: number | null = null;
    let resizeRafId: number | null = null;
    let activeAnim: Animation | null = null;
    let usingScrollTimeline = false;
    let lastBoundMaxScroll = -1;
    let lastBoundScale = -1;

    const getScale = () => Math.max(1, window.innerWidth / STAGE_W);

    const applyScale = () => {
      const s = getScale();
      scaleWrap.style.transform = `translate3d(-50%, 0, 0) scale(${s.toFixed(5)})`;
      return s;
    };

    const getScrollMetrics = (s: number) => {
      const uniquePx = UNIQUE_H * s;
      const totalPx = TOTAL_H * s;
      const vh = window.innerHeight || 800;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      const maxDirectTravel = Math.max(0, totalPx - vh);
      return { uniquePx, maxScroll, maxDirectTravel };
    };

    const updateScrollBinding = (force = false) => {
      const s = getScale();
      const { uniquePx, maxScroll, maxDirectTravel } = getScrollMetrics(s);
      if (
        !force &&
        usingScrollTimeline &&
        Math.abs(maxScroll - lastBoundMaxScroll) < 1 &&
        Math.abs(s - lastBoundScale) < 0.0001
      ) {
        return;
      }

      const ScrollTimelineApi = (
        window as unknown as { ScrollTimeline?: ScrollTimelineCtor }
      ).ScrollTimeline;

      if (ScrollTimelineApi && 0.5 * maxScroll <= maxDirectTravel) {
        usingScrollTimeline = true;
        lastBoundMaxScroll = maxScroll;
        lastBoundScale = s;
        activeAnim?.cancel();
        if (maxScroll <= 0) {
          activeAnim = null;
          parallax.style.transform = 'translate3d(0, 0, 0)';
          return;
        }
        try {
          const timeline = new ScrollTimelineApi({
            source: document.documentElement,
            axis: 'block',
          });
          const endOffsetInStageUnits = (-0.5 * maxScroll) / s;
          activeAnim = parallax.animate(
            [
              { transform: 'translate3d(0, 0px, 0)' },
              { transform: `translate3d(0, ${endOffsetInStageUnits.toFixed(2)}px, 0)` },
            ],
            {
              duration: 1000,
              fill: 'both',
              timeline,
            }
          );
          return;
        } catch {
          usingScrollTimeline = false;
          lastBoundMaxScroll = -1;
        }
      }

      usingScrollTimeline = false;
      lastBoundMaxScroll = -1;
      activeAnim?.cancel();
      activeAnim = null;

      const scrollY = Math.max(0, window.scrollY || 0);
      const travelScreenPx = -(scrollY * 0.5);
      const yScreenPx =
        0.5 * maxScroll <= maxDirectTravel
          ? travelScreenPx
          : (travelScreenPx % uniquePx) || 0;
      parallax.style.transform = `translate3d(0, ${(yScreenPx / s).toFixed(2)}px, 0)`;
    };

    const handleScroll = () => {
      if (usingScrollTimeline || rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (usingScrollTimeline) return;
        const s = getScale();
        const { uniquePx, maxScroll, maxDirectTravel } = getScrollMetrics(s);
        const scrollY = Math.max(0, window.scrollY || 0);
        const travelScreenPx = -(scrollY * 0.5);
        const yScreenPx =
          0.5 * maxScroll <= maxDirectTravel
            ? travelScreenPx
            : (travelScreenPx % uniquePx) || 0;
        parallax.style.transform = `translate3d(0, ${(yScreenPx / s).toFixed(2)}px, 0)`;
      });
    };

    const handleResize = () => {
      applyScale();
      updateScrollBinding(true);
    };

    applyScale();
    updateScrollBinding(true);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (resizeRafId !== null) return;
        resizeRafId = window.requestAnimationFrame(() => {
          resizeRafId = null;
          updateScrollBinding(false);
        });
      });
      resizeObserver.observe(document.documentElement);
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      activeAnim?.cancel();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      {/* Fixed 1440x4760 coordinate stage (scaled via CSS transform on >1440px screens so offset-path matches 1:1) */}
      <div
        ref={scaleWrapRef}
        style={{
          width: `${STAGE_W}px`,
          height: `${TOTAL_H}px`,
          transformOrigin: 'top center',
          transform: 'translate3d(-50%, 0, 0) scale(1)',
        }}
        className="absolute top-0 left-1/2"
      >
        {/* Vertically parallaxed GPU-only layer */}
        <div
          ref={parallaxRef}
          style={{
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
          }}
          className="relative w-full h-full"
        >
          {/* Static SVG Metro Map & 48px Grid (zero animated SVG attributes = zero SVG repaints) */}
          <svg
            viewBox={`0 0 ${STAGE_W} ${TOTAL_H}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block w-full h-full opacity-90 dark:opacity-85"
          >
            <defs>
              <pattern
                id="transit-bg-grid-pattern"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  strokeWidth="1"
                  className="stroke-slate-900/[0.05] dark:stroke-slate-400/[0.06]"
                />
              </pattern>
            </defs>

            {/* Full-canvas static 48px architectural grid */}
            <rect width={STAGE_W} height={TOTAL_H} fill="url(#transit-bg-grid-pattern)" />

            {/* Continuous rounded metro lines */}
            {COMPILED_NETWORK.svgLines.map((line) => (
              <path
                key={line.id}
                d={line.d}
                stroke={line.color}
                strokeWidth={line.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={line.opacity}
              />
            ))}

            {/* 100% Connected Interchange & Local Station Nodes */}
            {COMPILED_NETWORK.stations.map((s, idx) => (
              <circle
                key={idx}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                className="fill-white stroke-[#1e293b] dark:fill-[#141923] dark:stroke-[#e2e8f0]"
                strokeWidth="3"
              />
            ))}
          </svg>

          {/* Animated trains following the ENTIRE rounded path from offscreen to offscreen */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {COMPILED_NETWORK.trains.map((t) => (
              <div
                key={t.key}
                style={{
                  width: '36px',
                  height: '6.5px',
                  backgroundColor: t.color,
                  boxShadow: `0 0 8px ${t.glowColor}`,
                  offsetPath: `path("${t.pathD}")`,
                  animationDuration: `${t.durationSec}s`,
                  animationDelay: `${t.delaySec}s`,
                }}
                className="rounded-full transit-path-train"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
