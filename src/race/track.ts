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

export type SceneryKind = 'harbour' | 'docks' | 'town' | 'cliff' | 'bridge' | 'lighthouse';

export interface TrackDef {
  id: string;
  name: string;
  laps: number;
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
        scenery: scenery(section.scenery ?? 'harbour', index),
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

/** Deterministic roadside dressing by scenery kind and segment index. */
function scenery(kind: SceneryKind, i: number): SceneryPlacement[] {
  const out: SceneryPlacement[] = [];
  const every = (n: number, offset = 0) => i % n === offset;
  if (every(16)) {
    out.push({ key: 'lamp', x: -8 }, { key: 'lamp', x: 8, flip: true });
  }
  switch (kind) {
    case 'harbour':
      if (every(24, 8)) out.push({ key: 'palm', x: -11 });
      if (every(24, 20)) out.push({ key: 'palm', x: 12 });
      if (every(120, 60)) out.push({ key: 'billboard', x: 14 });
      break;
    case 'docks':
      if (every(40, 10)) out.push({ key: 'warehouse', x: -20 });
      if (every(60, 30)) out.push({ key: 'crane', x: 24 });
      if (every(12, 4)) out.push({ key: 'bollard', x: 7.5 });
      break;
    case 'town':
      if (every(28, 6)) out.push({ key: 'shopfront', x: -15 });
      if (every(28, 20)) out.push({ key: 'shopfront', x: 15, flip: true });
      break;
    case 'cliff':
      if (every(10, 3)) out.push({ key: 'rock', x: -10 });
      if (every(18, 11)) out.push({ key: 'pine', x: 11 });
      break;
    case 'bridge':
      if (every(6)) out.push({ key: 'girder', x: -7.5 }, { key: 'girder', x: 7.5, flip: true });
      break;
    case 'lighthouse':
      if (every(200, 40)) out.push({ key: 'lighthouse', x: -26 });
      if (every(10, 5)) out.push({ key: 'rock', x: 10 });
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
