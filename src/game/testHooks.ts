import { store } from '../save/store.ts';
import { currentScene, goto, type SceneKey } from './flow.ts';

/**
 * Test hooks (dev and test builds only; Vite strips them from production
 * because they sit behind import.meta.env.DEV). Story tests use these to set
 * up context; they still drive the UI for the behaviour under test.
 */
const hooks: Record<string, unknown> = {};

export function registerHook(name: string, api: unknown): void {
  if (api === null) delete hooks[name];
  else hooks[name] = api;
}

export interface GameHooks {
  state(): unknown;
  loadSave(raw: unknown): void;
  newCareer(carId: string, seed?: number): void;
  goto(scene: SceneKey, params?: object): void;
  scene(): SceneKey;
  readonly race: unknown;
  readonly town: unknown;
  readonly dialogue: unknown;
}

declare global {
  interface Window {
    __game?: GameHooks;
  }
}

export function installTestHooks(): void {
  if (!import.meta.env.DEV) return;
  window.__game = {
    state: () => structuredClone(store.get()),
    loadSave: (raw) => {
      store.loadRaw(raw);
    },
    newCareer: (carId, seed = 1) => {
      store.newCareer(carId, seed);
    },
    goto: (scene, params) => goto(scene, params),
    scene: () => currentScene(),
    get race() {
      return hooks.race;
    },
    get town() {
      return hooks.town;
    },
    get dialogue() {
      return hooks.dialogue;
    },
  };
}
