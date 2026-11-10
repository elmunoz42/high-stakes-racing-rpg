import type { Catalogue } from '../data/catalogue.ts';
import { carName, findCar, findLocationIn } from '../data/catalogue.ts';
import type { Location } from '../data/locations.ts';
import { findRacer, RIVALS, type Rival } from '../data/rivals.ts';
import { DUEL_LAPS } from '../rpg/economy.ts';
import { baseStats, performance, type CarStats } from '../rpg/carStats.ts';
import { RaceSim, type Entrant } from './sim.ts';
import { buildTrack } from './track.ts';
import { findTrack } from './tracks.ts';

export const PLAYER_ID = 'player';

/** The player starts fifth on a six-car grid. */
export const PLAYER_GRID_SLOT = 4;

export interface RaceOptions {
  /** Where the race is; decides the track, the rivals' cars and their pace. */
  locationId?: string;
  /** Nitrous shots the player carries. */
  nitrous?: number;
  /** A one-on-one night race against this racer instead of the full field. */
  duelWith?: string;
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
      color: r.color,
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
  ai.splice(Math.min(PLAYER_GRID_SLOT, ai.length), 0, player);
  return ai;
}

/** The car a racer drives at a location. Nyx takes the most powerful car in the field. */
export function racerCarId(
  cat: Catalogue,
  location: Location | undefined,
  racerId: string,
): string {
  const i = RIVALS.findIndex((r) => r.id === racerId);
  if (i >= 0) return location?.rivalCars[i] ?? RIVALS[i]!.carId;
  const cars = (location?.rivalCars ?? []).map((id) => findCar(cat, id)).filter((c) => !!c);
  const best = cars.sort((a, b) => b.power_hp - a.power_hp)[0];
  return best?.id ?? findRacer(racerId)?.carId ?? RIVALS[0]!.carId;
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
  const duel = opts.duelWith ? findRacer(opts.duelWith) : undefined;
  if (duel) {
    const car = findCar(cat, racerCarId(cat, location, duel.id));
    if (!car) throw new Error(`Racer ${duel.id} has no car`);
    const [player] = buildEntrants(cat, playerCarId, playerStats, location, opts.nitrous ?? 0, []);
    const rival: Entrant = {
      id: duel.id,
      name: duel.name,
      carName: carName(car),
      isPlayer: false,
      perf: performance(baseStats(car)),
      pace: Math.min(0.992, duel.pace + (location?.paceBonus ?? 0)),
      color: duel.color,
      body: car.game.body,
      drivetrain: car.drivetrain,
    };
    return new RaceSim({
      track: buildTrack(trackDef),
      laps: DUEL_LAPS,
      entrants: [rival, player!],
      seed,
    });
  }
  return new RaceSim({
    track: buildTrack(trackDef),
    laps: trackDef.laps,
    entrants: buildEntrants(cat, playerCarId, playerStats, location, opts.nitrous ?? 0),
    seed,
  });
}
