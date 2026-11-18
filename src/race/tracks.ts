import { HARBOUR_LOOP, type TrackDef } from './track.ts';

/** Original circuits, one per race location. Lengths in metres, curve in 1/km. */

export const PINEWOOD_PASS: TrackDef = {
  id: 'pinewood-pass',
  name: 'Pinewood Pass',
  laps: 3,
  look: 'forest',
  sections: [
    { name: 'Sawmill Straight', length: 240, curve: 0, hill: 0, scenery: 'forest' },
    { name: 'Fern Right', length: 150, curve: 7, hill: 6, scenery: 'forest' },
    { name: 'Switchback', length: 100, curve: -15, hill: 8, scenery: 'forest' },
    { name: 'Ridge Run', length: 260, curve: 0, hill: 10, scenery: 'cliff' },
    { name: 'Owl Esses I', length: 120, curve: 10, hill: 4, scenery: 'forest' },
    { name: 'Owl Esses II', length: 120, curve: -10, hill: 4, scenery: 'forest' },
    { name: 'Summit', length: 180, curve: 0, hill: 6, scenery: 'cliff' },
    { name: 'Timber Drop', length: 300, curve: 5, hill: -18, scenery: 'forest' },
    { name: 'Creek Bend', length: 160, curve: -8, hill: -8, scenery: 'forest' },
    { name: 'Creek Bridge', length: 80, curve: 0, hill: 0, scenery: 'bridge' },
    { name: 'Logging Road', length: 240, curve: 3, hill: -8, scenery: 'forest' },
    { name: 'Mill Hairpin', length: 110, curve: 16, hill: -4, scenery: 'forest' },
    { name: 'Home Straight', length: 220, curve: 0, hill: 0, scenery: 'forest' },
  ],
};

export const DUSTBOWL_FLATS: TrackDef = {
  id: 'dustbowl-flats',
  name: 'Dustbowl Flats',
  laps: 3,
  look: 'desert',
  sections: [
    { name: 'Route Straight', length: 520, curve: 0, hill: 0, scenery: 'desert' },
    { name: 'Mesa Sweep', length: 320, curve: 3, hill: 4, scenery: 'desert' },
    { name: 'Dry Wash', length: 400, curve: 0, hill: -4, scenery: 'desert' },
    { name: 'Rattler Kink', length: 140, curve: -7, hill: 0, scenery: 'desert' },
    { name: 'Back Straight', length: 600, curve: 0, hill: 0, scenery: 'desert' },
    { name: 'Gas Station Bend', length: 180, curve: 9, hill: 2, scenery: 'desert' },
    { name: 'Salt Flat', length: 420, curve: 0, hill: -2, scenery: 'desert' },
    { name: 'Coyote Curve', length: 260, curve: -4, hill: 0, scenery: 'desert' },
    { name: 'Home Straight', length: 300, curve: 0, hill: 0, scenery: 'desert' },
  ],
};

export const NEON_CITY: TrackDef = {
  id: 'neon-city',
  name: 'Neon City Circuit',
  laps: 3,
  look: 'night',
  sections: [
    { name: 'Main Street', length: 300, curve: 0, hill: 0, scenery: 'city' },
    { name: 'First Avenue', length: 70, curve: 18, hill: 0, scenery: 'city' },
    { name: 'Arcade Row', length: 220, curve: 0, hill: 0, scenery: 'city' },
    { name: 'Left on Fifth', length: 70, curve: -18, hill: 0, scenery: 'city' },
    { name: 'Underpass', length: 260, curve: 0, hill: -6, scenery: 'tunnel' },
    { name: 'Ramp', length: 160, curve: 3, hill: 6, scenery: 'tunnel' },
    { name: 'Canal Bend', length: 160, curve: -9, hill: 0, scenery: 'city' },
    { name: 'Skyway', length: 320, curve: 0, hill: 8, scenery: 'bridge' },
    { name: 'Downtown Drop', length: 240, curve: 6, hill: -8, scenery: 'city' },
    { name: 'Station Chicane R', length: 60, curve: 14, hill: 0, scenery: 'city' },
    { name: 'Station Chicane L', length: 60, curve: -14, hill: 0, scenery: 'city' },
    { name: 'Boulevard', length: 340, curve: 0, hill: 0, scenery: 'city' },
  ],
};

export const GLACIER_RIDGE: TrackDef = {
  id: 'glacier-ridge',
  name: 'Glacier Ridge',
  laps: 3,
  look: 'snow',
  grip: 0.86,
  sections: [
    { name: 'Lodge Straight', length: 260, curve: 0, hill: 0, scenery: 'snow' },
    { name: 'Frost Bend', length: 200, curve: 6, hill: 6, scenery: 'snow' },
    { name: 'Icefall Hairpin', length: 110, curve: -16, hill: 4, scenery: 'snow' },
    { name: 'Glacier Climb', length: 240, curve: 0, hill: 12, scenery: 'snow' },
    { name: 'White Esses I', length: 110, curve: 9, hill: 2, scenery: 'snow' },
    { name: 'White Esses II', length: 110, curve: -9, hill: 2, scenery: 'snow' },
    { name: 'Summit Hut', length: 160, curve: 0, hill: 4, scenery: 'snow' },
    { name: 'Avalanche Drop', length: 320, curve: -5, hill: -20, scenery: 'snow' },
    { name: 'Frozen Lake', length: 380, curve: 0, hill: -6, scenery: 'snow' },
    { name: 'Lakeside', length: 200, curve: 7, hill: -4, scenery: 'snow' },
    { name: 'Home Straight', length: 240, curve: 0, hill: 0, scenery: 'snow' },
  ],
};

export const GRAND_AUTODROME: TrackDef = {
  id: 'grand-autodrome',
  name: 'Grand Autodrome',
  laps: 3,
  look: 'day',
  sections: [
    { name: 'Pit Straight', length: 420, curve: 0, hill: 0, scenery: 'circuit' },
    { name: 'Turn One', length: 150, curve: 11, hill: 0, scenery: 'circuit' },
    { name: 'Short Chute', length: 160, curve: 0, hill: 0, scenery: 'circuit' },
    { name: 'Parabolica', length: 320, curve: 6, hill: -2, scenery: 'circuit' },
    { name: 'Back Straight', length: 480, curve: 0, hill: 2, scenery: 'circuit' },
    { name: 'Bus Stop R', length: 60, curve: 15, hill: 0, scenery: 'circuit' },
    { name: 'Bus Stop L', length: 60, curve: -15, hill: 0, scenery: 'circuit' },
    { name: 'Carousel', length: 260, curve: -8, hill: 0, scenery: 'circuit' },
    { name: 'Grandstand Esses I', length: 110, curve: 8, hill: 0, scenery: 'circuit' },
    { name: 'Grandstand Esses II', length: 110, curve: -8, hill: 0, scenery: 'circuit' },
    { name: 'Final Corner', length: 170, curve: 10, hill: 0, scenery: 'circuit' },
    { name: 'Finish Straight', length: 240, curve: 0, hill: 0, scenery: 'circuit' },
  ],
};

export const TRACKS: TrackDef[] = [
  HARBOUR_LOOP,
  PINEWOOD_PASS,
  DUSTBOWL_FLATS,
  NEON_CITY,
  GLACIER_RIDGE,
  GRAND_AUTODROME,
];

export const findTrack = (id: string): TrackDef => TRACKS.find((t) => t.id === id) ?? HARBOUR_LOOP;
