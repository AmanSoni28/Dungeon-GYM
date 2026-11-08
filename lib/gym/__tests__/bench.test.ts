import { describe, expect, it } from "vitest";
import {
  ARM,
  armFK,
  armIK,
  barZ,
  BENCH,
  chestFrontY,
  createFlyPath,
  flyFov,
  flyParam,
  gapY,
  headZ,
  lockoutBarY,
  passFraction,
  pressReach,
  REACH,
  repPress,
  revealPitch,
} from "../bench";

describe("bench press athlete", () => {
  it("arm IK puts the hand exactly on the bar, from the chest to lockout", () => {
    for (let q = 0; q <= 1; q += 0.1) {
      const tz = pressReach(q);
      const { shoulder, elbow } = armIK(BENCH.barBodyDy, tz);
      const h = armFK(shoulder, elbow);
      expect(h.y).toBeCloseTo(BENCH.barBodyDy, 4);
      expect(h.z).toBeCloseTo(tz, 4);
      expect(elbow).toBeLessThanOrEqual(0); // a real elbow: never hyper-extends
    }
  });

  it("bends the elbows at the bottom and nearly straightens them at lockout", () => {
    const bottom = armIK(BENCH.barBodyDy, REACH.bottom);
    const top = armIK(BENCH.barBodyDy, REACH.top);
    expect(Math.abs(bottom.elbow)).toBeGreaterThan(1.5);
    expect(Math.abs(top.elbow)).toBeLessThan(0.5);
    expect(REACH.top).toBeLessThan(ARM.l1 + ARM.l2);
  });

  it("presses with real tempo: holds, lowers slowly, touches, drives up", () => {
    expect(repPress(0)).toBe(1);
    expect(repPress(2.2)).toBe(0);
    expect(repPress(1.35)).toBeGreaterThan(0.2);
    expect(repPress(1.35)).toBeLessThan(0.8);
    expect(repPress(3.19)).toBeGreaterThan(0.95);
    expect(repPress(3.2)).toBe(repPress(0)); // loops
  });
});

describe("fly-through", () => {
  const path = createFlyPath();
  const pass = passFraction(path);

  it("leaves a real gap between chest and locked-out bar", () => {
    expect(lockoutBarY() - chestFrontY()).toBeGreaterThan(0.35);
    expect(gapY()).toBeGreaterThan(chestFrontY() + 0.12);
    expect(gapY()).toBeLessThan(lockoutBarY() - 0.12);
  });

  it("starts at the panorama centre, threads under the bar and ends past the head, inside the sphere", () => {
    expect(path.getPointAt(0).length()).toBeCloseTo(0, 6);
    const under = path.getPointAt(pass);
    expect(Math.abs(under.z - barZ())).toBeLessThan(0.05);
    expect(under.y).toBeGreaterThan(chestFrontY() + 0.1);
    expect(under.y).toBeLessThan(lockoutBarY() - 0.1);
    expect(Math.abs(under.x)).toBeLessThan(0.05); // between the arms
    expect(path.getPointAt(1).z).toBeLessThan(headZ());
    for (let u = 0; u <= 1; u += 0.02) expect(path.getPointAt(u).length()).toBeLessThan(9);
  });

  it("maps scroll to the path monotonically and lingers under the bar", () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const u = flyParam(f, pass);
      expect(u).toBeGreaterThanOrEqual(prev);
      prev = u;
    }
    expect(flyParam(0, pass)).toBe(0);
    expect(flyParam(1, pass)).toBeCloseTo(1, 4);
    const dPass = flyParam(0.5, pass) - flyParam(0.49, pass);
    const atPass = (() => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (flyParam(m, pass) < pass) lo = m;
        else hi = m;
      }
      return lo;
    })();
    const dUnder = flyParam(atPass + 0.005, pass) - flyParam(atPass - 0.005, pass);
    expect(dUnder).toBeLessThan(dPass * 1.2);
  });

  it("opens the lens as the bar rushes overhead (dolly zoom), continuous from the reveal", () => {
    expect(flyFov(0, pass, 32)).toBeCloseTo(32, 6);
    expect(flyFov(pass, pass, 32)).toBeGreaterThan(75);
    expect(flyFov(1, pass, 32)).toBeCloseTo(62, 4);
  });

  it("frames the athlete below the horizon during the reveal", () => {
    expect(revealPitch()).toBeLessThan(-0.1);
    expect(revealPitch()).toBeGreaterThan(-0.4);
  });
});
