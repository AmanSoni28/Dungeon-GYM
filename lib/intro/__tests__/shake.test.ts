import { describe, expect, it } from "vitest";
import { addTrauma, decayTrauma, SHAKE_LIMITS, shakeOffset } from "../shake";

describe("camera shake", () => {
  it("is perfectly still with no trauma", () => {
    expect(shakeOffset(0, 1.234)).toEqual({ x: 0, y: 0, roll: 0 });
  });

  it("never exceeds the configured limits", () => {
    for (let t = 0; t < 5; t += 0.013) {
      const o = shakeOffset(1, t);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(SHAKE_LIMITS.pos + 1e-9);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(SHAKE_LIMITS.pos + 1e-9);
      expect(Math.abs(o.roll)).toBeLessThanOrEqual(SHAKE_LIMITS.roll + 1e-9);
    }
  });

  it("scales with trauma squared (small hits feel small)", () => {
    const t = 0.77;
    const full = shakeOffset(1, t);
    const half = shakeOffset(0.5, t);
    expect(half.x).toBeCloseTo(full.x * 0.25, 10);
    expect(half.roll).toBeCloseTo(full.roll * 0.25, 10);
  });

  it("clamps trauma to [0, 1]", () => {
    expect(shakeOffset(5, 0.3)).toEqual(shakeOffset(1, 0.3));
    expect(addTrauma(0.8, 0.9)).toBe(1);
    expect(addTrauma(0.2, -1)).toBe(0);
  });

  it("decays to zero over time and never goes negative", () => {
    let tr = 1;
    for (let i = 0; i < 120; i++) tr = decayTrauma(tr, 1 / 60);
    expect(tr).toBe(0);
    expect(decayTrauma(0.1, 1)).toBe(0);
  });
});
