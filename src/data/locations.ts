/** Race locations. A location is one side-scrolling street and one track. */
export type BuildingKind =
  'garage' | 'shop' | 'lounge' | 'trailer' | 'gate' | 'travel' | 'local' | 'bar';

export interface Building {
  id: string;
  kind: BuildingKind;
  /** Door centre, world px. */
  x: number;
  name: string;
  characterId?: string;
  /** A bar holds several people: the racers. */
  characterIds?: string[];
  /** Texture key for the outside. */
  art: string;
  /** Texture key for the inside, when it has one. */
  room?: string;
  /** Sign text and colours for generated local buildings. */
  sign?: { text: string; wall: string; accent: string };
}

export interface Location {
  id: string;
  name: string;
  /** 1 = first location. A podium at tier n unlocks tier n + 1. */
  tier: number;
  blurb: string;
  width: number;
  trackId: string;
  look: 'dusk' | 'forest' | 'desert' | 'night' | 'snow' | 'day';
  /** Cost to travel here, USD. Invented. */
  travelCostUsd: number;
  /** Prize money multiplier. */
  prizeMult: number;
  /** Cars the five rivals drive here (ids from the catalogue), in rival order. */
  rivalCars: [string, string, string, string, string];
  /** Added to every rival's pace here. */
  paceBonus: number;
  buildings: Building[];
}

const MIATA = 'mx5-na-1994';
const GTI = 'gti-mk2-1991';
const S13 = '240sx-s13-1991';
const STANG = 'mustang-gt-1988';
const VETTE = 'corvette-c4-1990';
const VIPER = 'viper-rt10-1994';

const RACER_IDS = [
  'kenji-morrow',
  'priya-nandakumar',
  'lou-ferreira',
  'rosa-esposito',
  'dmitri-volk',
  'nyx-calloway',
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '-');

/** Every city has a bar where the racers drink. */
const bar = (x: number, name: string, wall: string, accent: string): Building => ({
  id: 'bar',
  kind: 'bar',
  x,
  name,
  characterIds: RACER_IDS,
  art: `bld-bar-${slug(name)}`,
  room: `room-bar-${slug(name)}`,
  sign: { text: name.toUpperCase(), wall, accent },
});

const travelSign = (x: number): Building => ({
  id: 'travel',
  kind: 'travel',
  x,
  name: 'Travel board',
  art: 'bld-travel',
});

/** The paddock travels: the same four people, in a trailer, a truck, a van and a tent. */
function paddock(
  local: Omit<Building, 'kind' | 'x' | 'art' | 'room'>,
  gateName: string,
  theBar: [string, string, string],
): Building[] {
  return [
    travelSign(60),
    {
      id: 'team-trailer',
      kind: 'trailer',
      x: 250,
      name: 'Team trailer',
      characterId: 'mags-okafor',
      art: 'bld-trailer',
      room: 'room-trailer',
    },
    {
      id: 'teos-garage',
      kind: 'garage',
      x: 500,
      name: "Teo's travelling garage",
      characterId: 'teo-baptista',
      art: 'bld-truck',
      room: 'room-garage',
    },
    {
      id: 'varga-parts',
      kind: 'shop',
      x: 740,
      name: 'Varga parts van',
      characterId: 'dee-dee-varga',
      art: 'bld-van',
      room: 'room-shop',
    },
    {
      id: 'brass-gull',
      kind: 'lounge',
      x: 960,
      name: 'VOLTKAT hospitality tent',
      characterId: 'sterling-pruitt',
      art: 'bld-tent',
      room: 'room-lounge',
    },
    {
      ...local,
      kind: 'local',
      x: 1190,
      art: `bld-local-${local.id}`,
      room: `room-local-${local.id}`,
    },
    bar(1420, ...theBar),
    { id: 'start-gate', kind: 'gate', x: 1640, name: `Start gate: ${gateName}`, art: 'bld-gate' },
  ];
}

export const HARBOUR_DISTRICT: Location = {
  id: 'harbour-district',
  name: 'Harbour District',
  tier: 1,
  blurb: 'A scruffy waterfront at dusk. Where everyone starts.',
  width: 1560,
  trackId: 'harbour-loop',
  look: 'dusk',
  travelCostUsd: 0,
  prizeMult: 1,
  rivalCars: [S13, MIATA, GTI, MIATA, S13],
  paceBonus: 0,
  buildings: [
    travelSign(30),
    {
      id: 'teos-garage',
      kind: 'garage',
      x: 170,
      name: "Teo's Garage",
      characterId: 'teo-baptista',
      art: 'bld-garage',
      room: 'room-garage',
    },
    {
      id: 'varga-parts',
      kind: 'shop',
      x: 440,
      name: 'Varga Performance Parts',
      characterId: 'dee-dee-varga',
      art: 'bld-shop',
      room: 'room-shop',
    },
    {
      id: 'brass-gull',
      kind: 'lounge',
      x: 720,
      name: 'The Brass Gull (sponsor lounge)',
      characterId: 'sterling-pruitt',
      art: 'bld-lounge',
      room: 'room-lounge',
    },
    {
      id: 'team-trailer',
      kind: 'trailer',
      x: 990,
      name: 'Team trailer',
      characterId: 'mags-okafor',
      art: 'bld-trailer',
      room: 'room-trailer',
    },
    bar(1250, 'The Rusty Anchor', '#5a3a2a', '#ffb347'),
    { id: 'start-gate', kind: 'gate', x: 1470, name: 'Start gate: Harbour Loop', art: 'bld-gate' },
  ],
};

export const LOCATIONS: Location[] = [
  HARBOUR_DISTRICT,
  {
    id: 'pinewood',
    name: 'Pinewood',
    tier: 2,
    blurb: 'A logging town under a mountain pass. Tight, steep and lined with trees.',
    width: 1740,
    trackId: 'pinewood-pass',
    look: 'forest',
    travelCostUsd: 150,
    prizeMult: 1.3,
    rivalCars: [S13, S13, GTI, MIATA, S13],
    paceBonus: 0.008,
    buildings: paddock(
      {
        id: 'timberline-diner',
        name: 'Timberline Diner',
        characterId: 'birdie-lindqvist',
        sign: { text: 'TIMBERLINE DINER', wall: '#7a4a34', accent: '#e8c15a' },
      },
      'Pinewood Pass',
      ['The Sawdust Saloon', '#6a4a2a', '#e8c15a'],
    ),
  },
  {
    id: 'dustbowl',
    name: 'Dustbowl',
    tier: 3,
    blurb: 'Desert highway and heat haze. Long straights where horsepower talks.',
    width: 1740,
    trackId: 'dustbowl-flats',
    look: 'desert',
    travelCostUsd: 300,
    prizeMult: 1.8,
    rivalCars: [STANG, S13, STANG, S13, S13],
    paceBonus: 0.01,
    buildings: paddock(
      {
        id: 'zamoras-lot',
        name: "Zamora's Used Performance",
        characterId: 'lupe-zamora',
        sign: { text: "ZAMORA'S USED PERFORMANCE", wall: '#c9a66b', accent: '#d7263d' },
      },
      'Dustbowl Flats',
      ['Last Drop Cantina', '#b0623a', '#39e6c0'],
    ),
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    tier: 4,
    blurb: 'Downtown after midnight. Right angles, an underpass and no run-off.',
    width: 1740,
    trackId: 'neon-city',
    look: 'night',
    travelCostUsd: 450,
    prizeMult: 2.5,
    rivalCars: [VETTE, STANG, STANG, S13, STANG],
    paceBonus: 0.012,
    buildings: paddock(
      {
        id: 'pixel-palace',
        name: 'Pixel Palace arcade',
        characterId: 'juno-park',
        sign: { text: 'PIXEL PALACE', wall: '#2a1f4a', accent: '#39e6ff' },
      },
      'Neon City Circuit',
      ['Afterburner', '#1c1a3a', '#ff4fa3'],
    ),
  },
  {
    id: 'glacier',
    name: 'Glacier Ridge',
    tier: 5,
    blurb: 'Snow, ice and a road that climbs into the clouds. Grip is a rumour.',
    width: 1740,
    trackId: 'glacier-ridge',
    look: 'snow',
    travelCostUsd: 600,
    prizeMult: 3.5,
    rivalCars: [VETTE, VETTE, STANG, STANG, STANG],
    paceBonus: 0.014,
    buildings: paddock(
      {
        id: 'waffle-hut',
        name: "Frost's Waffle Hut",
        characterId: 'olav-frost',
        sign: { text: "FROST'S WAFFLE HUT", wall: '#6a3b2a', accent: '#f4f4f4' },
      },
      'Glacier Ridge',
      ['The Thaw', '#3a4a6a', '#9fd0ff'],
    ),
  },
  {
    id: 'autodrome',
    name: 'Grand Autodrome',
    tier: 6,
    blurb: 'A real circuit with real grandstands. The season finale.',
    width: 1740,
    trackId: 'grand-autodrome',
    look: 'day',
    travelCostUsd: 800,
    prizeMult: 5,
    rivalCars: [VIPER, VETTE, VETTE, VIPER, STANG],
    paceBonus: 0.016,
    buildings: paddock(
      {
        id: 'clubhouse',
        name: 'Champions clubhouse',
        characterId: 'renata-voss',
        sign: { text: 'CHAMPIONS CLUBHOUSE', wall: '#23324a', accent: '#ffcc33' },
      },
      'Grand Autodrome',
      ['Parc Ferme', '#2a2a33', '#d7263d'],
    ),
  },
];

export const findLocation = (id: string): Location =>
  LOCATIONS.find((l) => l.id === id) ?? HARBOUR_DISTRICT;
