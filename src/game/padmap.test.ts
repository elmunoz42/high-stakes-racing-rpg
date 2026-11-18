import { describe, expect, it } from 'vitest';
import { deadzone, firstPad, type PadLike, readPad } from './padmap.ts';

/** A pad in the standard mapping (how browsers report an Xbox controller). */
function pad(
  over: { axes?: number[]; pressed?: number[]; values?: Record<number, number> } = {},
  mapping = 'standard',
): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => {
    const value = over.values?.[i] ?? (over.pressed?.includes(i) ? 1 : 0);
    return { pressed: value > 0.5 || !!over.pressed?.includes(i), value };
  });
  return { mapping, axes: over.axes ?? [0, 0, 0, 0], buttons };
}

describe('gamepad mapping (US-018 AC4)', () => {
  it('ignores a resting stick and rescales the rest', () => {
    expect(deadzone(0.1)).toBe(0);
    expect(deadzone(-0.2)).toBe(0);
    expect(deadzone(1)).toBe(1);
    expect(deadzone(-0.6)).toBeCloseTo(-0.5);
  });

  it('reads an idle pad as no input', () => {
    expect(readPad(pad())).toMatchObject({ steer: 0, throttle: 0, brake: 0, active: false });
  });

  it('steers with the left stick in proportion, and the D-pad at full lock', () => {
    expect(readPad(pad({ axes: [0.6, 0] })).steer).toBeCloseTo(0.5);
    expect(readPad(pad({ axes: [0.6, 0], pressed: [14] })).steer).toBe(-1);
  });

  it('uses the analog triggers for gas and brake, and A / X as full gas / brake', () => {
    const c = readPad(pad({ values: { 7: 0.4, 6: 0.25 } }));
    expect(c.throttle).toBeCloseTo(0.4);
    expect(c.brake).toBeCloseTo(0.25);
    expect(readPad(pad({ pressed: [0] })).throttle).toBe(1);
    expect(readPad(pad({ pressed: [2] })).brake).toBe(1);
  });

  it('maps B to handbrake and back, Y or RB to nitrous, A to confirm', () => {
    expect(readPad(pad({ pressed: [1] }))).toMatchObject({ handbrake: true, back: true });
    expect(readPad(pad({ pressed: [3] })).nitro).toBe(true);
    expect(readPad(pad({ pressed: [5] })).nitro).toBe(true);
    expect(readPad(pad({ pressed: [0] })).ok).toBe(true);
  });

  it('turns the D-pad and a pushed stick into direction presses', () => {
    expect(readPad(pad({ pressed: [12] })).up).toBe(true);
    expect(readPad(pad({ axes: [0, 0.9] })).down).toBe(true);
    expect(readPad(pad({ axes: [0.3, 0] })).right).toBe(false);
  });

  it('falls back to trigger axes on pads the browser does not recognise', () => {
    const p = pad({ axes: [0, 0, -1, 0, 0, 0.8] }, '');
    expect(readPad(p).throttle).toBeCloseTo(0.8);
    expect(readPad(p).brake).toBe(0);
  });

  it('uses the first connected pad', () => {
    const p = pad();
    expect(firstPad([null, p])).toBe(p);
    expect(firstPad([null, null])).toBeNull();
  });
});
