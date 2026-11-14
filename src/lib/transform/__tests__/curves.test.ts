import { describe, expect, it } from "vitest";
import { transformations } from "@/data/site";
import { metricAt, milestoneAt, monthAt, progress, shapeFor } from "../curves";

describe("transformation curves", () => {
  it("starts at the before value and ends at the after value", () => {
    expect(metricAt(98, 78, 0)).toBeCloseTo(98);
    expect(metricAt(98, 78, 1)).toBeCloseTo(78);
    expect(metricAt(40, 100, 0)).toBeCloseTo(40);
    expect(metricAt(40, 100, 1)).toBeCloseTo(100);
  });

  it("is monotonic, with losses front-loaded", () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const p = progress(98, 78, i / 20);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(progress(98, 78, 0.5)).toBeGreaterThan(0.6);
  });

  it("maps a heavy start to a fat body and a strong finish to a built one", () => {
    const r = transformations[0];
    expect(shapeFor(r.before).fat).toBeGreaterThan(0.8);
    expect(shapeFor(r.after).fat).toBeLessThan(0.2);
    expect(shapeFor(r.after).muscle).toBeCloseTo(1);
  });

  it("finds the month and the milestone reached", () => {
    expect(monthAt(0, 6)).toBe(0);
    expect(monthAt(0.5, 6)).toBe(3);
    expect(monthAt(1, 6)).toBe(6);
    for (const s of transformations) {
      expect(s.milestones[0].month).toBe(0);
      expect(s.milestones.at(-1)!.month).toBe(s.months);
      expect(milestoneAt(s.milestones, s.months)).toBe(s.milestones.at(-1));
    }
    expect(milestoneAt([{ month: 0 }, { month: 2 }, { month: 4 }], 3).month).toBe(2);
  });
});
