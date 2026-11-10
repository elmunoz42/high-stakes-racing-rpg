import { msToKmh } from '../rpg/carStats.ts';
import { RaceSim } from './sim.ts';
import type { RaceEntryResult, RaceResult } from './types.ts';

/**
 * Finishes a race instantly with the player in a chosen position. The rivals'
 * times come from a real headless run of the same race; the player's time is
 * slotted between them. Used by test hooks and a debug "skip race" option.
 */
export function fastForward(sim: RaceSim, finishPosition: number): RaceResult {
  const player = sim.player;
  if (!player) throw new Error('Race has no player');
  const ghost = new RaceSim({
    track: sim.track,
    laps: sim.laps,
    entrants: sim.cars.filter((c) => !c.isPlayer),
    seed: 1,
  });
  ghost.runToFinish(1800);
  const rivals = ghost.result().order.map((o) => ({ ...o }));
  const pos = Math.max(1, Math.min(rivals.length + 1, Math.round(finishPosition)));
  const before = rivals[pos - 2]?.timeMs;
  const after = rivals[pos - 1]?.timeMs;
  const timeMs =
    before === undefined
      ? (after ?? 200_000) - 1_234
      : after === undefined
        ? before + 2_345
        : Math.round((before + after) / 2);
  const me: RaceEntryResult = {
    name: player.name,
    carName: player.carName,
    isPlayer: true,
    position: pos,
    timeMs,
  };
  const order = [...rivals.slice(0, pos - 1), me, ...rivals.slice(pos - 1)].map((o, i) => ({
    ...o,
    position: i + 1,
  }));
  return {
    trackId: sim.track.def.id,
    laps: sim.laps,
    position: pos,
    timeMs,
    collisions: 0,
    ledALap: pos === 1,
    topSpeedKmh: Math.round(msToKmh(player.perf.topSpeed * 0.97)),
    order,
  };
}
