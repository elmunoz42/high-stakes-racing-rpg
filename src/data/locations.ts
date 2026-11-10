/** Race locations. A location is one side-scrolling street. */
export interface Building {
  id: string;
  kind: 'garage' | 'shop' | 'lounge' | 'trailer' | 'gate';
  /** Door centre, world px. */
  x: number;
  name: string;
  characterId?: string;
  /** Interior wall and floor colours. */
  interior?: { wall: string; floor: string; accent: string };
}

export interface Location {
  id: string;
  name: string;
  width: number;
  trackId: string;
  buildings: Building[];
}

export const HARBOUR_DISTRICT: Location = {
  id: 'harbour-district',
  name: 'Harbour District',
  width: 1320,
  trackId: 'harbour-loop',
  buildings: [
    {
      id: 'teos-garage',
      kind: 'garage',
      x: 170,
      name: "Teo's Garage",
      characterId: 'teo-baptista',
      interior: { wall: '#4a5568', floor: '#2d3748', accent: '#5aa9e6' },
    },
    {
      id: 'varga-parts',
      kind: 'shop',
      x: 440,
      name: 'Varga Performance Parts',
      characterId: 'dee-dee-varga',
      interior: { wall: '#5b3a4f', floor: '#2b2030', accent: '#e05a9b' },
    },
    {
      id: 'brass-gull',
      kind: 'lounge',
      x: 720,
      name: 'The Brass Gull (sponsor lounge)',
      characterId: 'sterling-pruitt',
      interior: { wall: '#3d2f5c', floor: '#1f1a2e', accent: '#c6ff2e' },
    },
    {
      id: 'team-trailer',
      kind: 'trailer',
      x: 990,
      name: 'Team trailer',
      characterId: 'mags-okafor',
      interior: { wall: '#d8d4c8', floor: '#5f5a50', accent: '#f2a541' },
    },
    { id: 'start-gate', kind: 'gate', x: 1230, name: 'Start gate: Harbour Loop' },
  ],
};

export const LOCATIONS: Location[] = [HARBOUR_DISTRICT];

export const findLocation = (id: string) => LOCATIONS.find((l) => l.id === id) ?? HARBOUR_DISTRICT;
