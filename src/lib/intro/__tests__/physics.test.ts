import { describe, expect, it } from "vitest";
import { BAR_CONFIG, createBar, stepBar, type BarState, type Impact } from "../physics";
import { RELEASE_SPIN, RELEASE_VELOCITY } from "../choreography";

const R = BAR_CONFIG.plateRadius;

function simulate(bar: BarState, seconds: number, dt = 1 / 60) {
  let s = bar;
  const impacts: Impact[] = [];
  let maxYAfterFirstImpact = -Infinity;
  const steps = Math.round(seconds / dt); // integer count: avoids float drift adding an extra step
  for (let i = 0; i < steps; i++) {
    const r = stepBar(s, dt);
    s = r.state;
    impacts.push(...r.impacts);
    if (impacts.length > 0) maxYAfterFirstImpact = Math.max(maxYAfterFirstImpact, s.y);
  }
  return { state: s, impacts, maxYAfterFirstImpact };
}

describe("barbell physics", () => {
  it("accelerates downward under gravity", () => {
    const { state } = stepBar(createBar({ x: 0, y: 3, z: 0 }, { x: 0, y: 0, z: 0 }), 0.1);
    expect(state.vy).toBeCloseTo(-0.981, 2);
    expect(state.y).toBeLessThan(3);
    expect(state.y).toBeGreaterThan(2.94);
  });

  it("reports a floor impact with the free-fall speed √(2gh)", () => {
    const h = 1;
    const { impacts } = simulate(createBar({ x: 0, y: R + h, z: 0 }, { x: 0, y: 0, z: 0 }), 1);
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    expect(impacts[0].speed).toBeCloseTo(Math.sqrt(2 * BAR_CONFIG.gravity * h), 1);
  });

  it("bounces lower than it was dropped and never goes through the floor", () => {
    const start = R + 1.5;
    const { maxYAfterFirstImpact, state } = simulate(createBar({ x: 0, y: start, z: 0 }, { x: 0, y: 0, z: 0 }), 3);
    expect(maxYAfterFirstImpact).toBeLessThan(start * 0.5);
    expect(state.y).toBeGreaterThanOrEqual(R);
  });

  it("the scripted throw lands in front of the athlete, bounces once more, then comes to rest", () => {
    const bar = createBar({ x: 0, y: 1.8, z: 0.5 }, RELEASE_VELOCITY, RELEASE_SPIN);
    const { impacts, state } = simulate(bar, 5);
    expect(impacts).toHaveLength(2);
    expect(impacts[0].speed).toBeGreaterThan(impacts[1].speed);
    expect(impacts[0].z).toBeGreaterThan(1.5);
    expect(impacts[0].z).toBeLessThan(3);
    expect(state.resting).toBe(true);
    expect(state.z).toBeLessThan(4.5); // stays well in front of the camera
  });

  it("rolls without slipping once grounded (ω = v / r)", () => {
    const grounded: BarState = { ...createBar({ x: 0, y: R, z: 0 }, { x: 0, y: 0, z: 1.2 }), grounded: true };
    const { state } = stepBar(grounded, 1 / 60);
    expect(state.spin).toBeCloseTo(state.vz / R, 6);
    expect(state.vz).toBeLessThan(1.2);
  });

  it("does nothing when resting or for non-positive dt", () => {
    const resting: BarState = { ...createBar({ x: 1, y: R, z: 2 }, { x: 0, y: 0, z: 0 }), grounded: true, resting: true };
    expect(stepBar(resting, 0.1)).toEqual({ state: resting, impacts: [] });
    const flying = createBar({ x: 0, y: 2, z: 0 }, { x: 0, y: 1, z: 1 });
    expect(stepBar(flying, 0).state).toEqual(flying);
  });

  it("is deterministic and does not mutate its input", () => {
    const bar = createBar({ x: 0, y: 2, z: 0 }, { x: 0.1, y: 0, z: 2 }, 5);
    const copy = { ...bar };
    const a = simulate(bar, 2);
    const b = simulate(bar, 2);
    expect(a.state).toEqual(b.state);
    expect(bar).toEqual(copy);
  });

  it("gives the same result whether stepped in large or small increments (substepping)", () => {
    const bar = createBar({ x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: 1 });
    const coarse = simulate(bar, 0.5, 1 / 20).state;
    const fine = simulate(bar, 0.5, 1 / 240).state;
    expect(coarse.y).toBeCloseTo(fine.y, 2);
    expect(coarse.z).toBeCloseTo(fine.z, 2);
  });
});
