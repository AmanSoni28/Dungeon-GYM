import { describe, expect, it } from "vitest";
import { JOURNEY, journeyPhases, journeyVisuals, scrollYaw } from "../journey";

const limits = { wrap: false, yawMin: -0.3, yawMax: 0.3, pitchMin: -0.1, pitchMax: 0.1 };

describe("real-gym scroll journey", () => {
  it("splits the section into entry → explore → reveal → fly", () => {
    expect(journeyPhases(0)).toEqual({ entry: 0, explore: 0, reveal: 0, fly: 0 });
    expect(journeyPhases(JOURNEY.entryEnd)).toMatchObject({ entry: 1, explore: 0, reveal: 0, fly: 0 });
    expect(journeyPhases(JOURNEY.exploreEnd)).toMatchObject({ entry: 1, explore: 1, reveal: 0, fly: 0 });
    expect(journeyPhases(JOURNEY.revealEnd)).toMatchObject({ explore: 1, reveal: 1, fly: 0 });
    expect(journeyPhases(1)).toEqual({ entry: 1, explore: 1, reveal: 1, fly: 1 });
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

  it("ends the 360° on the bench press: the gym dims, the athlete is lit, the caption rises", () => {
    expect(journeyVisuals(0.4).reveal).toBe(0);
    const v = journeyVisuals(JOURNEY.revealEnd);
    expect(v.reveal).toBe(1);
    expect(v.gym).toBeLessThan(0.4);
    expect(v.caption).toBe(1);
    expect(v.ui).toBe(0);
    expect(v.prompt).toBe(0);
    expect(v.fovScale).toBeLessThan(0.75); // zoomed in on the athlete
  });

  it("flies through, then blurs and fades into the next section", () => {
    const mid = journeyVisuals((JOURNEY.revealEnd + 1) / 2);
    expect(mid.fade).toBe(0);
    expect(mid.blur).toBe(0);
    expect(mid.rush).toBeGreaterThan(0.5);
    expect(mid.caption).toBe(0);
    const end = journeyVisuals(1);
    expect(end.fly).toBe(1);
    expect(end.fade).toBe(1);
    expect(end.gym).toBe(0);
    expect(end.blur).toBeGreaterThan(7);
  });

  it("shows the Enter Dungeon prompt late in the 360°, and hides it before the bench appears", () => {
    expect(journeyVisuals(0.25).prompt).toBe(0);
    expect(journeyVisuals(0.42).prompt).toBe(1);
    expect(journeyVisuals(JOURNEY.exploreEnd + 0.05).prompt).toBe(0);
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
