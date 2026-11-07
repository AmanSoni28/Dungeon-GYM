import { describe, expect, it } from "vitest";
import { JOURNEY, journeyPhases, journeyVisuals, scrollYaw } from "../journey";

const limits = { wrap: false, yawMin: -0.3, yawMax: 0.3, pitchMin: -0.1, pitchMax: 0.1 };

describe("real-gym scroll journey", () => {
  it("splits the section into entry → explore → exit", () => {
    expect(journeyPhases(0)).toEqual({ entry: 0, explore: 0, exit: 0 });
    expect(journeyPhases(JOURNEY.entryEnd)).toMatchObject({ entry: 1, explore: 0, exit: 0 });
    expect(journeyPhases(JOURNEY.exploreEnd)).toMatchObject({ entry: 1, explore: 1, exit: 0 });
    expect(journeyPhases(1)).toEqual({ entry: 1, explore: 1, exit: 1 });
  });

  it("clamps out-of-range progress", () => {
    expect(journeyPhases(-1)).toEqual(journeyPhases(0));
    expect(journeyPhases(2)).toEqual(journeyPhases(1));
  });

  it("starts in the gate's golden light, which fades as you step in", () => {
    expect(journeyVisuals(0).light).toBe(1);
    expect(journeyVisuals(JOURNEY.entryEnd).light).toBe(0);
    expect(journeyVisuals(0.5).light).toBe(0);
  });

  it("is sharp and fully visible while exploring", () => {
    const v = journeyVisuals(0.4);
    expect(v.blur).toBe(0);
    expect(v.fade).toBe(0);
    expect(v.ui).toBe(1);
    expect(v.fovScale).toBe(1);
  });

  it("moves forward, zooms, blurs and fades to the next section on exit", () => {
    const end = journeyVisuals(1);
    expect(end.fade).toBe(1);
    expect(end.dolly).toBeGreaterThan(3);
    expect(end.fovScale).toBeLessThan(0.6);
    expect(end.blur).toBeGreaterThan(10);
    expect(end.ui).toBe(0);
  });

  it("shows the Enter Dungeon prompt only late in the exploration, and hides it before the exit finishes", () => {
    expect(journeyVisuals(0.3).prompt).toBe(0);
    expect(journeyVisuals(0.6).prompt).toBe(1);
    expect(journeyVisuals(0.78).prompt).toBe(1); // still up while the camera starts moving forward
    expect(journeyVisuals(0.95).prompt).toBe(0);
  });

  it("every visual changes continuously (no jumps between scenes)", () => {
    let prev = journeyVisuals(0);
    for (let p = 0.002; p <= 1; p += 0.002) {
      const v = journeyVisuals(p);
      (Object.keys(v) as (keyof typeof v)[]).forEach((k) => expect(Math.abs(v[k] - prev[k])).toBeLessThan(0.25));
      prev = v;
    }
  });

  it("scroll sweeps the view left → right within the photo", () => {
    expect(scrollYaw(0, limits)).toBeGreaterThan(0);
    expect(scrollYaw(1, limits)).toBeLessThan(0);
    expect(Math.abs(scrollYaw(1, limits))).toBeLessThanOrEqual(limits.yawMax);
    expect(scrollYaw(0.5, limits)).toBeCloseTo(0, 6);
  });

  it("rotates freely through a real panorama", () => {
    const wrap = { ...limits, wrap: true, yawMin: -Infinity, yawMax: Infinity };
    expect(Math.abs(scrollYaw(1, wrap))).toBeGreaterThan(Math.PI);
  });
});
