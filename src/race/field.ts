import type { Catalogue } from '../data/catalogue.ts';
import { carName, findCar } from '../data/catalogue.ts';
import { RIVALS, type Rival } from '../data/rivals.ts';
import { baseStats, performance, type CarStats } from '../rpg/carStats.ts';
import { RaceSim, type Entrant } from './sim.ts';
import { buildTrack, HARBOUR_LOOP, type TrackDef } from './track.ts';

export const PLAYER_ID = 'player';

/** The player starts fifth on a six-car grid. */
export const PLAYER_GRID_SLOT = 4;

export function buildEntrants(
  cat: Catalogue,
  playerCarId: string,
  playerStats: CarStats,
  rivals: readonly Rival[] = RIVALS,
): Entrant[] {
  const pc = findCar(cat, playerCarId);
  if (!pc) throw new Error(`Unknown car ${playerCarId}`);
  const ai: Entrant[] = rivals.map((r) => {
    const car = findCar(cat, r.carId);
    if (!car) throw new Error(`Rival ${r.id} drives unknown car ${r.carId}`);
    return {
      id: r.id,
      name: r.name,
      carName: carName(car),
      isPlayer: false,
      perf: performance(baseStats(car)),
      pace: r.pace,
      color: shade(car.game.color, r.id),
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
  };
  ai.splice(PLAYER_GRID_SLOT, 0, player);
  return ai;
}

export function createRace(
  cat: Catalogue,
  playerCarId: string,
  playerStats: CarStats,
  seed: number,
  trackDef: TrackDef = HARBOUR_LOOP,
): RaceSim {
  return new RaceSim({
    track: buildTrack(trackDef),
    laps: trackDef.laps,
    entrants: buildEntrants(cat, playerCarId, playerStats),
    seed,
  });
}

/** Rival cars get a distinct colour so two of the same model can be told apart. */
function shade(hex: string, id: string): string {
  const palette: Record<string, string> = {
    'kenji-morrow': '#1c1c24',
    'priya-nandakumar': '#f2c230',
    'lou-ferreira': '#2e8b57',
    'rosa-esposito': '#ff7a2f',
    'dmitri-volk': '#8a2be2',
  };
  return palette[id] ?? hex;
}
