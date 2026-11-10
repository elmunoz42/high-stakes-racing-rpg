import type { Catalogue } from '../data/catalogue.ts';
import { carName, findCar, findLocationIn } from '../data/catalogue.ts';
import type { Location } from '../data/locations.ts';
import { RIVALS, type Rival } from '../data/rivals.ts';
import { baseStats, performance, type CarStats } from '../rpg/carStats.ts';
import { RaceSim, type Entrant } from './sim.ts';
import { buildTrack } from './track.ts';
import { findTrack } from './tracks.ts';

export const PLAYER_ID = 'player';

/** The player starts fifth on a six-car grid. */
export const PLAYER_GRID_SLOT = 4;

const RIVAL_COLOURS: Record<string, string> = {
  'kenji-morrow': '#1c1c24',
  'priya-nandakumar': '#f2c230',
  'lou-ferreira': '#2e8b57',
  'rosa-esposito': '#ff7a2f',
  'dmitri-volk': '#8a2be2',
};

export interface RaceOptions {
  /** Where the race is; decides the track, the rivals' cars and their pace. */
  locationId?: string;
  /** Nitrous shots the player carries. */
  nitrous?: number;
}

export function buildEntrants(
  cat: Catalogue,
  playerCarId: string,
  playerStats: CarStats,
  location: Location | undefined,
  nitrous = 0,
  rivals: readonly Rival[] = RIVALS,
): Entrant[] {
  const pc = findCar(cat, playerCarId);
  if (!pc) throw new Error(`Unknown car ${playerCarId}`);
  const ai: Entrant[] = rivals.map((r, i) => {
    // Rivals move up to faster cars at tougher locations.
    const car = findCar(cat, location?.rivalCars[i] ?? r.carId) ?? findCar(cat, r.carId);
    if (!car) throw new Error(`Rival ${r.id} drives an unknown car`);
    return {
      id: r.id,
      name: r.name,
      carName: carName(car),
      isPlayer: false,
      perf: performance(baseStats(car)),
      pace: Math.min(0.992, r.pace + (location?.paceBonus ?? 0)),
      color: RIVAL_COLOURS[r.id] ?? car.game.color,
      body: car.game.body,
      drivetrain: car.drivetrain,
    };
  });
  const player: Entrant = {
    id: PLAYER_ID,
    name: 'You',
    carName: carName(pc),
    isPlayer: true,
    perf: performance(playerStats),
    pace: 1,
    color: pc.game.color,
    body: pc.game.body,
    drivetrain: pc.drivetrain,
    nitrous,
  };
  ai.splice(PLAYER_GRID_SLOT, 0, player);
  return ai;
}

export function createRace(
  cat: Catalogue,
  playerCarId: string,
  playerStats: CarStats,
  seed: number,
  opts: RaceOptions = {},
): RaceSim {
  const location = opts.locationId ? findLocationIn(cat, opts.locationId) : cat.locations[0];
  const trackDef = findTrack(location?.trackId ?? 'harbour-loop');
  return new RaceSim({
    track: buildTrack(trackDef),
    laps: trackDef.laps,
    entrants: buildEntrants(cat, playerCarId, playerStats, location, opts.nitrous ?? 0),
    seed,
  });
}
