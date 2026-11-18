/**
 * Gamepad to game controls. Pure: takes what the browser's Gamepad API reports
 * and returns normalised controls, so it can be tested without hardware.
 *
 * Browsers report Xbox controllers on Windows (XInput), and most pads on Mac
 * and Windows, with the "standard" mapping: buttons 0-3 are A B X Y (cross,
 * circle, square, triangle on PlayStation), 4-5 the bumpers, 6-7 the analog
 * triggers, 12-15 the D-pad, axes 0-1 the left stick. Pads the browser does
 * not recognise get a best guess from the same positions.
 */

export interface PadLike {
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

export interface PadControls {
  /** -1 full left .. 1 full right. */
  steer: number;
  /** 0..1. */
  throttle: number;
  /** 0..1. */
  brake: number;
  handbrake: boolean;
  nitro: boolean;
  /** Digital directions (D-pad or stick past the threshold). */
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Confirm / interact (A). */
  ok: boolean;
  /** Back / leave (B). */
  back: boolean;
  /** Anything at all pressed or moved: the player is using the pad. */
  active: boolean;
}

export const STICK_DEADZONE = 0.2;
export const TRIGGER_DEADZONE = 0.06;
/** How far the stick must go to count as a direction press. */
export const STICK_PRESS = 0.5;

/** Stick value with the dead zone cut out and the rest rescaled to 0..1. */
export function deadzone(v: number, dz = STICK_DEADZONE): number {
  const a = Math.abs(v);
  if (a <= dz) return 0;
  return Math.sign(v) * Math.min(1, (a - dz) / (1 - dz));
}

const btn = (p: PadLike, i: number) => p.buttons[i]?.pressed ?? false;
const val = (p: PadLike, i: number) => p.buttons[i]?.value ?? 0;

/** A trigger: the button's analog value, or a -1..1 axis on pads without the standard mapping. */
function trigger(p: PadLike, button: number, axis: number): number {
  let v = val(p, button);
  if (p.mapping !== 'standard' && v === 0 && p.axes.length > axis) {
    const a = p.axes[axis] ?? -1;
    // Unmapped triggers usually rest at -1 (some rest at 0): treat only the upper half as pull.
    v = a > 0 ? a : 0;
  }
  return v > TRIGGER_DEADZONE ? Math.min(1, v) : 0;
}

export function readPad(p: PadLike): PadControls {
  const sx = deadzone(p.axes[0] ?? 0);
  const sy = deadzone(p.axes[1] ?? 0);
  const dl = btn(p, 14);
  const dr = btn(p, 15);
  const du = btn(p, 12);
  const dd = btn(p, 13);
  const steer = dl !== dr ? (dl ? -1 : 1) : sx;
  const rt = trigger(p, 7, 5);
  const lt = trigger(p, 6, 2);
  const controls: PadControls = {
    steer,
    throttle: Math.max(rt, btn(p, 0) ? 1 : 0),
    brake: Math.max(lt, btn(p, 2) ? 1 : 0),
    handbrake: btn(p, 1),
    nitro: btn(p, 3) || btn(p, 5),
    left: dl || sx < -STICK_PRESS,
    right: dr || sx > STICK_PRESS,
    up: du || sy < -STICK_PRESS,
    down: dd || sy > STICK_PRESS,
    ok: btn(p, 0),
    back: btn(p, 1),
    active: false,
  };
  controls.active =
    p.buttons.some((b) => b.pressed || b.value > TRIGGER_DEADZONE) || sx !== 0 || sy !== 0;
  return controls;
}

/** The first connected pad, or none. */
export function firstPad(pads: readonly (PadLike | null)[]): PadLike | null {
  for (const p of pads) if (p) return p;
  return null;
}
