/**
 * Track data and geometry for the pseudo-3D road.
 * A track is a list of sections (length in metres, curvature, elevation
 * change) expanded into short segments. World units are metres.
 */

export const SEGMENT_LENGTH = 2.5; // m
export const ROAD_HALF_WIDTH = 6; // m, centre line to road edge
export const LANES = 3;
export const RUMBLE_SEGMENTS = 4;

export interface SceneryPlacement {
  key: string;
  /** Lateral offset from the centre line, metres (negative = left). */
  x: number;
  flip?: boolean;
}

export interface TrackSection {
  /** Length in metres. */
  length: number;
  /**
   * Curvature in 1/km: radius = 1000 / curve metres. Positive turns right.
   * 0 is straight.
   */
  curve: number;
  /** Elevation change across the section, metres. */
  hill: number;
  /** Scenery set for the roadside along this section. */
  scenery?: SceneryKind;
  name?: string;
}

export type SceneryKind =
  | 'harbour'
  | 'docks'
  | 'town'
  | 'cliff'
  | 'bridge'
  | 'lighthouse'
  | 'forest'
  | 'desert'
  | 'city'
  | 'tunnel'
  | 'snow'
  | 'circuit';

/** Sky, haze and backdrop for a track. */
export type LookId = 'dusk' | 'forest' | 'desert' | 'night' | 'snow' | 'day';

export interface TrackDef {
  id: string;
  name: string;
  laps: number;
  look?: LookId;
  /** Surface grip multiplier (1 = dry asphalt). */
  grip?: number;
  sections: TrackSection[];
}

export interface Segment {
  index: number;
  /** Start distance along the lap, m. */
  z: number;
  /** Curvature, 1/m (positive = right). */
  kappa: number;
  y1: number;
  y2: number;
  scenery: SceneryPlacement[];
  /** Ground and roadside theme of the section this segment is in. */
  theme: SceneryKind;
  /** Alternating stripe flag for rumble strips and grass. */
  stripe: boolean;
  isStartLine: boolean;
}

export interface Track {
  def: TrackDef;
  segments: Segment[];
  length: number;
}

const easeIn = (a: number, b: number, t: number) => a + (b - a) * t * t;
const easeInOut = (a: number, b: number, t: number) =>
  a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);

export function buildTrack(def: TrackDef): Track {
  const segments: Segment[] = [];
  let y = 0;
  for (const section of def.sections) {
    const n = Math.max(4, Math.round(section.length / SEGMENT_LENGTH));
    const enter = Math.floor(n * 0.2);
    const leave = Math.floor(n * 0.2);
    const startY = y;
    const kappa = section.curve / 1000;
    for (let i = 0; i < n; i++) {
      let k = kappa;
      if (i < enter) k = easeIn(0, kappa, i / enter);
      else if (i >= n - leave) k = easeInOut(kappa, 0, (i - (n - leave)) / leave);
      const y1 = easeInOut(startY, startY + section.hill, i / n);
      const y2 = easeInOut(startY, startY + section.hill, (i + 1) / n);
      const index = segments.length;
      segments.push({
        index,
        z: index * SEGMENT_LENGTH,
        kappa: k,
        y1,
        y2,
        scenery: scenery(section.scenery ?? 'harbour', index, section.curve),
        theme: section.scenery ?? 'harbour',
        stripe: Math.floor(index / RUMBLE_SEGMENTS) % 2 === 0,
        isStartLine: index < 2,
      });
    }
    y = startY + section.hill;
  }
  // Close the loop vertically so lap 2 starts where lap 1 did.
  const drift = y;
  if (Math.abs(drift) > 0.01) {
    for (const s of segments) {
      s.y1 -= (drift * s.index) / segments.length;
      s.y2 -= (drift * (s.index + 1)) / segments.length;
    }
  }
  return { def, segments, length: segments.length * SEGMENT_LENGTH };
}

/** Deterministic roadside dressing by scenery kind, segment index and corner. */
function scenery(kind: SceneryKind, i: number, curve: number): SceneryPlacement[] {
  const out: SceneryPlacement[] = [];
  const every = (n: number, offset = 0) => i % n === offset;
  const edge = ROAD_HALF_WIDTH;

  // Start line furniture.
  if (i === 1) out.push({ key: 'gantry', x: 0 });
  if (i === 14 || i === 40) out.push({ key: 'grandstand', x: 19 });

  // Tight corners get barriers and arrow boards on the outside.
  if (Math.abs(curve) >= 9) {
    const outside = curve > 0 ? -1 : 1;
    if (every(2)) out.push({ key: 'barrier', x: outside * (edge + 2.4) });
    if (every(8, 3))
      out.push({ key: curve > 0 ? 'chevron-r' : 'chevron-l', x: outside * (edge + 4.2) });
  }

  if (kind !== 'bridge' && kind !== 'tunnel' && every(16))
    out.push({ key: 'lamp', x: -(edge + 1.6) }, { key: 'lamp', x: edge + 1.6, flip: true });

  switch (kind) {
    case 'harbour':
      // Sea wall on the left, palms and billboards on the right.
      if (every(4, 2)) out.push({ key: 'bollard', x: -(edge + 3.4) });
      if (every(90, 30)) out.push({ key: 'sailboat', x: -34 });
      if (every(90, 75)) out.push({ key: 'sailboat', x: -58, flip: true });
      if (every(20, 8)) out.push({ key: 'palm', x: edge + 4.5 });
      if (every(20, 18)) out.push({ key: 'bush', x: edge + 3 });
      if (every(110, 50)) out.push({ key: 'billboard-voltkat', x: edge + 9 });
      if (every(110, 105)) out.push({ key: 'billboard-varga', x: edge + 9 });
      break;
    case 'docks':
      if (every(44, 10)) out.push({ key: 'warehouse', x: -(edge + 16) });
      if (every(30, 4)) out.push({ key: 'containers', x: edge + 11 });
      if (every(30, 19)) out.push({ key: 'containers', x: -(edge + 9), flip: true });
      if (every(70, 30)) out.push({ key: 'crane', x: edge + 22 });
      if (every(6, 2))
        out.push({ key: 'bollard', x: edge + 1.2 }, { key: 'bollard', x: -(edge + 1.2) });
      break;
    case 'town':
      if (every(22, 6)) out.push({ key: 'shops', x: -(edge + 10) });
      if (every(22, 17)) out.push({ key: 'shops', x: edge + 10, flip: true });
      if (every(44, 12)) out.push({ key: 'apartments', x: edge + 24 });
      if (every(44, 34)) out.push({ key: 'apartments', x: -(edge + 24), flip: true });
      if (every(120, 60)) out.push({ key: 'billboard-teo', x: edge + 9 });
      break;
    case 'cliff':
      if (every(9, 3)) out.push({ key: 'rock', x: -(edge + 4) });
      if (every(14, 8)) out.push({ key: 'pine', x: edge + 5 });
      if (every(14, 1)) out.push({ key: 'pine', x: -(edge + 9) });
      if (every(7, 5)) out.push({ key: 'bush', x: edge + 3 });
      break;
    case 'bridge':
      if (every(5))
        out.push({ key: 'truss', x: -(edge + 1.4) }, { key: 'truss', x: edge + 1.4, flip: true });
      if (every(40, 20)) out.push({ key: 'sailboat', x: 30 });
      break;
    case 'forest':
      if (every(7, 2)) out.push({ key: 'pine', x: -(edge + 4 + (i % 3) * 3) });
      if (every(7, 5)) out.push({ key: 'pine', x: edge + 4 + (i % 4) * 3 });
      if (every(11, 3)) out.push({ key: 'bush', x: edge + 2.6 });
      if (every(23, 9)) out.push({ key: 'rock', x: -(edge + 3) });
      if (every(120, 60)) out.push({ key: 'cabin', x: edge + 13 });
      break;
    case 'desert':
      if (every(13, 4)) out.push({ key: 'cactus', x: -(edge + 4 + (i % 5) * 2) });
      if (every(17, 9)) out.push({ key: 'cactus', x: edge + 5 + (i % 4) * 3 });
      if (every(29, 12)) out.push({ key: 'rock', x: edge + 3.5 });
      if (every(90, 20)) out.push({ key: 'mesa', x: -(edge + 40) });
      if (every(90, 65)) out.push({ key: 'mesa', x: edge + 46, flip: true });
      if (every(150, 80)) out.push({ key: 'billboard-voltkat', x: edge + 9 });
      if (every(260, 130)) out.push({ key: 'gas-station', x: -(edge + 14) });
      break;
    case 'city':
      if (every(18, 4)) out.push({ key: 'tower', x: -(edge + 12) });
      if (every(18, 13)) out.push({ key: 'tower', x: edge + 12, flip: true });
      if (every(36, 22)) out.push({ key: 'neon', x: edge + 5 });
      if (every(36, 8)) out.push({ key: 'neon', x: -(edge + 5), flip: true });
      if (every(4))
        out.push({ key: 'barrier', x: -(edge + 2.2) }, { key: 'barrier', x: edge + 2.2 });
      break;
    case 'tunnel':
      if (every(4)) out.push({ key: 'tunnel-arch', x: 0 });
      break;
    case 'snow':
      if (every(8, 2)) out.push({ key: 'pine-snow', x: -(edge + 5 + (i % 3) * 3) });
      if (every(8, 6)) out.push({ key: 'pine-snow', x: edge + 5 + (i % 4) * 3 });
      if (every(3))
        out.push({ key: 'snowbank', x: -(edge + 2) }, { key: 'snowbank', x: edge + 2, flip: true });
      if (every(140, 70)) out.push({ key: 'cabin', x: -(edge + 13) });
      break;
    case 'circuit':
      if (every(3)) out.push({ key: 'barrier', x: -(edge + 6) }, { key: 'barrier', x: edge + 6 });
      if (every(46, 20)) out.push({ key: 'grandstand', x: -(edge + 20) });
      if (every(70, 50)) out.push({ key: 'billboard-voltkat', x: edge + 12 });
      if (every(70, 15)) out.push({ key: 'billboard-varga', x: edge + 12 });
      if (every(30, 10)) out.push({ key: 'flag', x: edge + 8 });
      if (every(200, 4)) out.push({ key: 'pit-building', x: edge + 22 });
      break;
    case 'lighthouse':
      if (every(160, 40)) out.push({ key: 'lighthouse', x: -(edge + 20) });
      if (every(10, 5)) out.push({ key: 'rock', x: edge + 4 });
      if (every(8, 2)) out.push({ key: 'bush', x: -(edge + 3) });
      if (every(26, 13)) out.push({ key: 'pine', x: edge + 10 });
      break;
  }
  return out;
}

export function segmentAt(track: Track, z: number): Segment {
  const L = track.length;
  const wrapped = ((z % L) + L) % L;
  return track.segments[Math.floor(wrapped / SEGMENT_LENGTH) % track.segments.length]!;
}

/** Road elevation at distance z, interpolated. */
export function heightAt(track: Track, z: number): number {
  const seg = segmentAt(track, z);
  const L = track.length;
  const local = (((z % L) + L) % L) - seg.z;
  return seg.y1 + (seg.y2 - seg.y1) * (local / SEGMENT_LENGTH);
}

/**
 * Harbour Loop: the first circuit. Original layout: a waterfront straight,
 * a dockside hairpin, esses up to the old lighthouse, a fast downhill
 * sweeper, and a chicane under the bridge.
 */
export const HARBOUR_LOOP: TrackDef = {
  id: 'harbour-loop',
  name: 'Harbour Loop',
  laps: 3,
  look: 'dusk',
  sections: [
    { name: 'Waterfront', length: 300, curve: 0, hill: 0, scenery: 'harbour' },
    { name: 'Ferry Sweep', length: 220, curve: 3, hill: 0, scenery: 'harbour' },
    { name: 'Dock Road', length: 150, curve: 0, hill: 4, scenery: 'docks' },
    { name: 'Crane Hairpin', length: 110, curve: -17, hill: 0, scenery: 'docks' },
    { name: 'Chandlers Climb', length: 200, curve: 0, hill: 12, scenery: 'town' },
    { name: 'Gull Esses I', length: 110, curve: 9, hill: 4, scenery: 'cliff' },
    { name: 'Gull Esses II', length: 110, curve: -9, hill: 4, scenery: 'cliff' },
    { name: 'Lighthouse Rise', length: 160, curve: 0, hill: 6, scenery: 'lighthouse' },
    { name: 'Long Drop', length: 280, curve: -4, hill: -16, scenery: 'cliff' },
    { name: 'Seawall', length: 230, curve: 0, hill: -9, scenery: 'harbour' },
    { name: 'Bridge Chicane R', length: 60, curve: 14, hill: 0, scenery: 'bridge' },
    { name: 'Bridge Chicane L', length: 60, curve: -14, hill: 0, scenery: 'bridge' },
    { name: 'Fish Market', length: 200, curve: 6, hill: -5, scenery: 'town' },
    { name: 'Home Straight', length: 260, curve: 0, hill: 0, scenery: 'harbour' },
  ],
};
