import type Phaser from 'phaser';
import { clearAll } from '../ui/dom.ts';

export type SceneKey =
  'Boot' | 'Title' | 'CarPick' | 'Town' | 'Interior' | 'Race' | 'Results' | 'Map';

let game: Phaser.Game | null = null;
let current: SceneKey = 'Boot';
const listeners = new Set<(key: SceneKey) => void>();

export function initFlow(g: Phaser.Game): void {
  game = g;
}

/** Stops whatever is running and starts `key`. The overlay is cleared. */
export function goto(key: SceneKey, data?: object): void {
  if (!game) throw new Error('flow not initialised');
  for (const s of game.scene.getScenes(true)) game.scene.stop(s.scene.key);
  clearAll();
  current = key;
  game.scene.start(key, data);
  for (const fn of listeners) fn(key);
}

/** The running game (test hooks and debugging only). */
export function getGame(): Phaser.Game | null {
  return game;
}

export function currentScene(): SceneKey {
  return current;
}

export function onSceneChange(fn: (key: SceneKey) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
