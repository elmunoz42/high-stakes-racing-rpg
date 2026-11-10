import { GameState, SAVE_VERSION } from './schema.ts';

/**
 * Save migrations. Each entry upgrades a save from version N to N + 1.
 * v0 was never shipped; it exists so the migration path is exercised by tests
 * before the first real schema change.
 */
type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  0: (v0) => ({
    version: 1,
    seed: typeof v0.seed === 'number' ? v0.seed : 1,
    money: v0.cash,
    carId: v0.car,
    inventory: Array.isArray(v0.parts) ? v0.parts : [],
    installed: {},
    sponsor: null,
    offers: { discounts: {}, sponsor: null },
    relationships: {},
    memories: {},
    lastRace: null,
    raceCount: 0,
    location: 'harbour-district',
  }),
};

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Save is not an object');
  let save = raw as Record<string, unknown>;
  let version = typeof save.version === 'number' ? save.version : 0;
  if (version > SAVE_VERSION) throw new Error(`Save version ${version} is newer than this game`);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from save version ${version}`);
    save = step(save);
    version += 1;
  }
  return GameState.parse(save);
}
