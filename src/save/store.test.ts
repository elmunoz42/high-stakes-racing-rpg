import { describe, expect, it } from 'vitest';
import { TEST_CATALOGUE as cat } from '../../tests/unit/fixtures/catalogue.ts';
import { migrate } from './migrations.ts';
import { GameStore, SAVE_KEY, type StorageLike } from './store.ts';
import { SAVE_VERSION } from './schema.ts';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe('save (US-009)', () => {
  it('autosaves accepted actions and resumes the same career', () => {
    const storage = new MemoryStorage();
    const a = new GameStore(cat, storage);
    a.newCareer('alpha', 3);
    a.dispatch({ type: 'buyPart', partId: 'pads-a', priceUsd: 100 });
    a.dispatch({ type: 'installPart', partId: 'pads-a' });
    a.dispatch({
      type: 'offerSponsorship',
      characterId: 'rep',
      objective: { type: 'clean' },
      payoutUsd: 500,
    });
    a.dispatch({ type: 'acceptSponsorship' });

    const b = new GameStore(cat, storage);
    expect(b.load()).toBe(true);
    expect(b.get()).toEqual(a.get());
    expect(b.get()?.installed.brakes).toBe('pads-a');
    expect(b.get()?.sponsor?.objective.type).toBe('clean');
  });

  it('does not save rejected actions', () => {
    const storage = new MemoryStorage();
    const a = new GameStore(cat, storage);
    a.newCareer('alpha', 3);
    const before = storage.getItem(SAVE_KEY);
    expect(a.dispatch({ type: 'buyPart', partId: 'ghost', priceUsd: 1 }).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(before);
  });

  it('migrates an older save version to the current one (AC2)', () => {
    const v0 = { version: 0, cash: 4321, car: 'alpha', parts: ['pads-a'] };
    const s = migrate(v0);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s).toMatchObject({ money: 4321, carId: 'alpha', inventory: ['pads-a'], installed: {} });
  });

  it('migrates a version 1 save to version 2 with no nitrous and no travel progress (US-012 AC5)', () => {
    const v1 = {
      version: 1,
      seed: 1,
      money: 500,
      carId: 'alpha',
      inventory: [],
      installed: {},
      sponsor: null,
      offers: { discounts: {}, sponsor: null },
      relationships: {},
      memories: {},
      lastRace: null,
      raceCount: 0,
      location: 'home',
    };
    const s = migrate(v1);
    expect(s).toMatchObject({
      version: 2,
      nitrous: 0,
      bestFinish: {},
      money: 500,
      location: 'home',
    });
  });

  it('refuses saves from a newer game', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow();
  });

  it('treats a corrupt save as no save', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(new GameStore(cat, storage).load()).toBe(false);
  });
});
