import type { GameAction } from '../../shared/actions.ts';
import { type Catalogue, CATALOGUE } from '../data/catalogue.ts';
import { type ActionResult, applyAction, createCareer } from '../rpg/actions.ts';
import { migrate } from './migrations.ts';
import type { GameState } from './schema.ts';

export const SAVE_KEY = 'racing-rpg/save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Listener = (state: GameState | null, action: GameAction | null) => void;

/** Owns the one game state. Every accepted action autosaves. */
export class GameStore {
  private state: GameState | null = null;
  private listeners = new Set<Listener>();

  constructor(
    readonly catalogue: Catalogue,
    private storage: StorageLike | null,
  ) {}

  get(): GameState | null {
    return this.state;
  }

  require(): GameState {
    if (!this.state) throw new Error('No career in progress');
    return this.state;
  }

  hasSave(): boolean {
    try {
      return !!this.storage?.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  /** Loads the saved career. Returns false if there is none or it cannot be read. */
  load(): boolean {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return false;
      this.state = migrate(JSON.parse(raw));
      this.persist();
      this.emit(null);
      return true;
    } catch (err) {
      console.warn('[save] could not load save', err);
      return false;
    }
  }

  /** Replaces the state from a raw save object (migrated and validated). */
  loadRaw(raw: unknown): GameState {
    this.state = migrate(raw);
    this.persist();
    this.emit(null);
    return this.state;
  }

  newCareer(carId: string, seed: number): GameState {
    this.state = createCareer(this.catalogue, carId, seed);
    this.persist();
    this.emit(null);
    return this.state;
  }

  /** Dry run: would this action be accepted right now? */
  validate(action: GameAction): ActionResult {
    return applyAction(this.require(), action, this.catalogue);
  }

  dispatch(action: GameAction): ActionResult {
    const result = applyAction(this.require(), action, this.catalogue);
    if (result.ok) {
      this.state = result.state;
      this.persist();
      this.emit(action);
    }
    return result;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  clear(): void {
    this.state = null;
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      /* storage unavailable */
    }
    this.emit(null);
  }

  private persist(): void {
    if (!this.state) return;
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.warn('[save] could not write save', err);
    }
  }

  private emit(action: GameAction | null): void {
    for (const fn of this.listeners) fn(this.state, action);
  }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const store = new GameStore(CATALOGUE, browserStorage());
