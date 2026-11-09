import { describe, expect, it } from "vitest";
import { BEATS, POSES, RELEASE_AT, RIG, footPosition, legIK, timelineDuration, type PoseName } from "../choreography";

const names = Object.keys(POSES) as PoseName[];

describe("athlete choreography", () => {
  it.each(names)("keeps the feet planted on the floor in the %s pose", (name) => {
    const f = footPosition(POSES[name]);
    expect(f.y).toBeCloseTo(RIG.ankle, 9);
    expect(f.z).toBeCloseTo(0, 9);
  });

  it("standing hip height is anatomically plausible (~1 m)", () => {
    const { hipY } = legIK(POSES.stand);
    expect(hipY).toBeGreaterThan(0.95);
    expect(hipY).toBeLessThan(1.05);
  });

  it("dipping lowers the hips", () => {
    expect(legIK(POSES.dip).hipY).toBeLessThan(legIK(POSES.stand).hipY - 0.1);
  });

  it("every pose defines the same complete set of joints", () => {
    const keys = Object.keys(POSES.stand).sort();
    names.forEach((n) => expect(Object.keys(POSES[n]).sort()).toEqual(keys));
  });

  it("the overhead pose actually raises the bar above the head", () => {
    expect(POSES.overhead.armFlex).toBeLessThan(-2.6);
    expect(POSES.overhead.elbow).toBeGreaterThan(-0.4); // arms locked out
  });

  it("beats are in order and do not overlap", () => {
    for (let i = 1; i < BEATS.length; i++) {
      expect(BEATS[i].at).toBeGreaterThanOrEqual(BEATS[i - 1].at + BEATS[i - 1].dur - 1e-9);
    }
  });

  it("releases the barbell during the throw, before the follow-through", () => {
    const throwBeat = BEATS.find((b) => b.pose === "throw")!;
    const follow = BEATS.find((b) => b.pose === "follow")!;
    expect(RELEASE_AT).toBeGreaterThan(throwBeat.at);
    expect(RELEASE_AT).toBeLessThan(throwBeat.at + throwBeat.dur);
    expect(RELEASE_AT).toBeLessThan(follow.at);
  });

  it("keeps the whole performance short enough to hold attention", () => {
    expect(timelineDuration()).toBeLessThan(5.5);
  });
});
