import { describe, expect, it } from "vitest";
import { haulPose, PULL, pullDuration } from "../ropePull";

const at = (k: number, u: number) => PULL.prelude + (k + u) * PULL.stroke;

describe("hand-over-hand haul pose", () => {
  it("alternates the driving hand: right on even strokes, left on odd ones", () => {
    const r = haulPose(at(0, PULL.drive * 0.5));
    expect(r.right).toBeGreaterThan(r.left);
    const l = haulPose(at(1, PULL.drive * 0.5));
    expect(l.left).toBeGreaterThan(l.right);
  });

  it("hands swap ends each stroke without jumping between strokes", () => {
    for (let k = 0; k < PULL.strokes - 1; k++) {
      const a = haulPose(at(k + 1, -1e-6));
      const b = haulPose(at(k + 1, 1e-6));
      expect(Math.abs(a.right - b.right)).toBeLessThan(1e-3);
      expect(Math.abs(a.left - b.left)).toBeLessThan(1e-3);
      expect(Math.abs(a.lean - b.lean)).toBeLessThan(1e-3);
    }
  });

  it("is continuous out of the prelude and holds still at the end", () => {
    const a = haulPose(PULL.prelude - 1e-6);
    const b = haulPose(PULL.prelude + 1e-6);
    expect(Math.abs(a.right - b.right)).toBeLessThan(1e-3);
    expect(Math.abs(a.left - b.left)).toBeLessThan(1e-3);
    expect(haulPose(pullDuration() + 5)).toEqual(haulPose(pullDuration()));
  });

  it("leans hardest at the end of a drive and keeps values in 0..1", () => {
    const end = haulPose(at(2, PULL.drive));
    expect(end.lean).toBeCloseTo(1, 3);
    for (let t = -0.5; t < pullDuration() + 0.5; t += 0.01) {
      const p = haulPose(t);
      for (const v of Object.values(p)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
