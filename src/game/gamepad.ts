import { toast } from '../ui/dom.ts';
import { currentScene } from './flow.ts';
import { firstPad, type PadControls, type PadLike, readPad } from './padmap.ts';

/**
 * Gamepad support: Xbox controllers on Windows, and any controller the
 * browser recognises on Mac and Windows (Gamepad API).
 *
 * Polled once per frame, in one of three modes:
 * - Race: the race reads `padControls()` directly, for analog steering,
 *   throttle and brake.
 * - Menus and panels: when buttons are on screen (title, car pick, results,
 *   a conversation, the shop), the D-pad or stick moves focus between them,
 *   A presses the focused one and B backs out (Escape).
 * - Street, rooms and the map: the pad presses the keys those scenes already
 *   use: arrows to move, E to interact, Escape to leave.
 */

const EMPTY: PadControls = {
  steer: 0,
  throttle: 0,
  brake: 0,
  handbrake: false,
  nitro: false,
  left: false,
  right: false,
  up: false,
  down: false,
  ok: false,
  back: false,
  active: false,
};

let controls: PadControls = EMPTY;
let prev: PadControls = EMPTY;
let pad: Gamepad | null = null;
const held = new Set<string>();
let repeatAt = 0;

/** The pad's controls this frame (all zero when none is connected). */
export const padControls = (): PadControls => controls;

const KEYS: Record<string, [string, string, number]> = {
  left: ['ArrowLeft', 'ArrowLeft', 37],
  right: ['ArrowRight', 'ArrowRight', 39],
  up: ['ArrowUp', 'ArrowUp', 38],
  down: ['ArrowDown', 'ArrowDown', 40],
  ok: ['e', 'KeyE', 69],
  back: ['Escape', 'Escape', 27],
};

/** A keyboard event the game's key handlers (Phaser's and the DOM panels') accept. */
function key(type: 'keydown' | 'keyup', name: keyof typeof KEYS): void {
  const [k, code, keyCode] = KEYS[name]!;
  const e = new KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true });
  Object.defineProperty(e, 'keyCode', { get: () => keyCode });
  Object.defineProperty(e, 'which', { get: () => keyCode });
  window.dispatchEvent(e);
}

function hold(name: keyof typeof KEYS, down: boolean): void {
  if (down && !held.has(name)) {
    held.add(name);
    key('keydown', name);
  } else if (!down && held.has(name)) {
    held.delete(name);
    key('keyup', name);
  }
}

function releaseAll(): void {
  for (const name of [...held]) hold(name as keyof typeof KEYS, false);
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** The topmost on-screen panel with something to press, if any. */
function activePanel(): HTMLElement | null {
  const panels = [...document.querySelectorAll<HTMLElement>('#ui .interactive')].filter(
    (el) => el.offsetParent !== null && el.querySelector(FOCUSABLE),
  );
  // A modal confirmation sits on top of everything else.
  return panels.find((p) => p.matches('[role="alertdialog"]')) ?? panels.at(-1) ?? null;
}

function focusables(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null,
  );
}

function moveFocus(panel: HTMLElement, step: number): void {
  const list = focusables(panel);
  if (!list.length) return;
  const i = list.indexOf(document.activeElement as HTMLElement);
  const next = i < 0 ? list[0]! : list[(i + step + list.length) % list.length]!;
  next.focus();
}

/** Menus and panels: D-pad to move focus, A to press, B to back out. */
function drivePanel(panel: HTMLElement, now: number): void {
  releaseAll();
  const dir = controls.up || controls.left ? -1 : controls.down || controls.right ? 1 : 0;
  const prevDir = prev.up || prev.left ? -1 : prev.down || prev.right ? 1 : 0;
  if (dir !== 0 && (dir !== prevDir || now >= repeatAt)) {
    moveFocus(panel, dir);
    repeatAt = now + (dir !== prevDir ? 380 : 130);
  }
  if (controls.ok && !prev.ok) {
    const el = document.activeElement as HTMLElement | null;
    if (el && panel.contains(el) && el.matches('button, a[href], [role="button"]')) el.click();
    else if (!el || !panel.contains(el)) moveFocus(panel, 0);
  }
  if (controls.back && !prev.back) {
    key('keydown', 'back');
    key('keyup', 'back');
  }
}

/** Street, rooms and map: hold the keys those scenes read. */
function driveKeys(): void {
  hold('left', controls.left);
  hold('right', controls.right);
  hold('up', controls.up);
  hold('down', controls.down);
  hold('ok', controls.ok);
  hold('back', controls.back);
}

function frame(now: number): void {
  const p = navigator.getGamepads ? firstPad(navigator.getGamepads() as (PadLike | null)[]) : null;
  pad = (p as Gamepad | null) ?? null;
  prev = controls;
  controls = p ? readPad(p) : EMPTY;
  if (controls.active) document.body.classList.add('pad');

  const scene = currentScene();
  if (!p || scene === 'Boot') releaseAll();
  else if (scene === 'Race') releaseAll();
  else {
    const panel = scene === 'Map' ? null : activePanel();
    if (panel) drivePanel(panel, now);
    else driveKeys();
  }
  requestAnimationFrame(frame);
}

/** A short rumble, on pads that can (Xbox and most others in Chrome and Edge). */
export function rumble(strength = 0.6, ms = 140): void {
  const act = (
    pad as
      | (Gamepad & {
          vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> };
        })
      | null
  )?.vibrationActuator;
  act
    ?.playEffect?.('dual-rumble', {
      duration: ms,
      strongMagnitude: strength,
      weakMagnitude: strength * 0.6,
    })
    ?.catch(() => undefined);
}

export function installGamepad(): void {
  if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;
  window.addEventListener('gamepadconnected', (e) => {
    const name = (e as GamepadEvent).gamepad.id.replace(/\s*\(.*$/, '').trim() || 'Controller';
    toast(`Controller connected: ${name}`);
  });
  window.addEventListener('gamepaddisconnected', () => {
    releaseAll();
    toast('Controller disconnected');
  });
  // Typing or pressing a key switches the hints back to the keyboard.
  window.addEventListener('keydown', (e) => {
    if (e.isTrusted) document.body.classList.remove('pad');
  });
  requestAnimationFrame(frame);
}
