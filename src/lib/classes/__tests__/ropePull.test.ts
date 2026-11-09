import { describe, expect, it } from "vitest";
import { footPosition } from "@/lib/intro/choreography";
import {
  cardLook,
  carouselPos,
  chase,
  createRopeRig,
  PULL,
  pullAt,
  pullDuration,
  rigState,
  ropePath,
  ropePose,
  ROPE_POSES,
  springStep,
  SWING,
  swingStep,
  scrollToHaul,
  focusX,
  haulTotal,
} from "../ropePull";

const TOTAL = 2000;

describe("rope haul timeline", () => {
  it("waits slack, then hauls the whole train in over the strokes", () => {
    expect(pullAt(-1, TOTAL)).toMatchObject({ hauled: 0, drive: 0, done: false });
    expect(pullAt(PULL.prelude * 0.99, TOTAL).hauled).toBe(0);
    const end = pullAt(pullDuration() + 0.01, TOTAL);
    expect(end.hauled).toBe(TOTAL);
    expect(end.done).toBe(true);
  });

  it("only moves the rope on the drive; the re-grip holds it still", () => {
    const k = 1;
    const t0 = PULL.prelude + k * PULL.stroke;
    const driveEnd = t0 + PULL.stroke * PULL.drive;
    const a = pullAt(driveEnd + 0.02, TOTAL).hauled;
    const b = pullAt(t0 + PULL.stroke * 0.98, TOTAL).hauled;
    expect(a).toBeCloseTo(b, 6);
    expect(pullAt(t0 + 0.05, TOTAL).hauled).toBeGreaterThan(pullAt(t0, TOTAL).hauled);
  });

  it("is monotonic and continuous (no jumps in rope or pose)", () => {
    let prev = pullAt(0, TOTAL);
    for (let t = 0.005; t <= pullDuration() + 0.3; t += 0.005) {
      const s = pullAt(t, TOTAL);
      expect(s.hauled).toBeGreaterThanOrEqual(prev.hauled - 1e-9);
      expect(s.hauled - prev.hauled).toBeLessThan(TOTAL / PULL.strokes / 6);
      expect(Math.abs(s.drive - prev.drive)).toBeLessThan(0.12);
      prev = s;
    }
  });

  it("is taut while driving and slackens on the re-grip", () => {
    const t0 = PULL.prelude + 2 * PULL.stroke;
    const driving = pullAt(t0 + PULL.stroke * PULL.drive * 0.5, TOTAL);
    const regrip = pullAt(t0 + PULL.stroke * 0.95, TOTAL);
    expect(driving.tension).toBeGreaterThan(0.9);
    expect(regrip.tension).toBeLessThan(0.5);
    expect(driving.drive).toBeGreaterThan(regrip.drive);
  });
});

describe("rope-pulled showcase", () => {
  const pitch = 370;
  const total = haulTotal(6, pitch);

  it("brings each of the six cards to the centre in turn, one per stroke", () => {
    expect(carouselPos(0, pitch)).toBe(-1); // first card queued on the right
    for (let k = 0; k < PULL.strokes; k++) {
      // end of each stroke's re-grip: card k is exactly centred and holds there
      const t = PULL.prelude + (k + 1) * PULL.stroke - 0.01;
      expect(carouselPos(pullAt(t, total).hauled, pitch)).toBeCloseTo(k, 6);
    }
    expect(carouselPos(pullAt(pullDuration() + 1, total).hauled, pitch)).toBe(5);
  });

  it("spotlights the centred card; queued ones wait dimmed, shown ones fade toward the athlete", () => {
    const c = cardLook(0);
    expect(c).toMatchObject({ focus: 1, scale: 1, opacity: 1, dim: 0 });
    const next = cardLook(1);
    expect(next.scale).toBeLessThan(0.85);
    expect(next.opacity).toBeGreaterThan(0.55);
    expect(next.dim).toBe(1);
    expect(cardLook(-1).opacity).toBeLessThan(0.3);
    expect(cardLook(-1.3).opacity).toBe(0);
    expect(cardLook(3.2).opacity).toBe(0); // far down the queue: off in the dark
  });

  it("changes look continuously as cards travel", () => {
    let prev = cardLook(-2);
    for (let d = -2; d <= 4; d += 0.01) {
      const l = cardLook(d);
      expect(Math.abs(l.opacity - prev.opacity)).toBeLessThan(0.03);
      expect(Math.abs(l.scale - prev.scale)).toBeLessThan(0.01);
      prev = l;
    }
  });

  it("centres the spotlight on screen, but never under the athlete or off the edge", () => {
    expect(focusX(1360, 290, 330)).toBe(680);
    expect(focusX(400, 120, 250)).toBe(120 + 125 + 16);
    expect(focusX(300, 200, 250)).toBe(300 - 125 - 8);
  });
});

describe("physics", () => {
  it("springs a card home with a small elastic overshoot, then settles", () => {
    let b = { x: 600, v: 0 };
    let min = Infinity;
    for (let i = 0; i < 240; i++) {
      b = springStep(b, 0, 1 / 60);
      min = Math.min(min, b.x);
    }
    expect(min).toBeLessThan(0); // overshoot
    expect(min).toBeGreaterThan(-120); // but a controlled one
    expect(Math.abs(b.x)).toBeLessThan(0.5);
  });

  it("is frame-rate independent", () => {
    let a = { x: 500, v: 0 };
    let b = { x: 500, v: 0 };
    for (let i = 0; i < 30; i++) a = springStep(a, 0, 1 / 30);
    for (let i = 0; i < 120; i++) b = springStep(b, 0, 1 / 120);
    expect(a.x).toBeCloseTo(b.x, 1);
  });

  it("swings a hanging card against its acceleration, within a few degrees, and settles", () => {
    let s = { th: 0, w: 0 };
    for (let i = 0; i < 30; i++) s = swingStep(s, -20000, 1 / 60); // hard pull to the left
    expect(s.th).toBeGreaterThan(0);
    expect(Math.abs(s.th)).toBeLessThanOrEqual(SWING.max);
    for (let i = 0; i < 400; i++) s = swingStep(s, 0, 1 / 60);
    expect(Math.abs(s.th)).toBeLessThan(0.002);
  });
});

describe("rope path", () => {
  const pts = [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 530, y: 100 },
    { x: 900, y: 100 },
  ];
  const sagOf = (d: string) => Number(d.split("Q")[1].split(" ")[1]) - 100;

  it("starts in the hands and runs through every point", () => {
    const d = ropePath(pts, 0.5, () => 0, () => false);
    expect(d.startsWith("M0.0 100.0")).toBe(true);
    expect(d.endsWith("900.0 100.0")).toBe(true);
    expect(d.match(/[QL]/g)!.length).toBe(3);
  });

  it("sags more when slack than when taut, and stays straight behind a card", () => {
    expect(sagOf(ropePath(pts, 0, () => 0, () => false))).toBeGreaterThan(sagOf(ropePath(pts, 1, () => 0, () => false)));
    const d = ropePath(pts, 0.5, () => 0, (i) => i === 1);
    expect(d).toContain("L530.0 100.0");
  });

  it("returns nothing without two points", () => {
    expect(ropePath([pts[0]], 1, () => 0, () => false)).toBe("");
  });
});

describe("athlete", () => {
  it("keeps the feet planted through the whole pull", () => {
    for (let k = 0; k <= 1; k += 0.1) {
      const f = footPosition(ropePose(k));
      expect(Math.abs(f.y - 0.06)).toBeLessThan(1e-6);
      expect(Math.abs(f.z)).toBeLessThan(1e-6);
    }
  });

  it("drives the elbows back and leans away from the rope", () => {
    expect(ROPE_POSES.drive.elbow).toBeLessThan(ROPE_POSES.reach.elbow - 1);
    expect(ROPE_POSES.drive.pelvis).toBeLessThan(0);
    expect(ROPE_POSES.reach.armFlex).toBeLessThan(-1.2); // arms long toward the rope
  });

  it("is already in place for reduced motion", () => {
    const rig = createRopeRig();
    rig.total = 900;
    rig.reduced = true;
    expect(rigState(rig)).toMatchObject({ hauled: 900, done: true });
  });
});

describe("scroll scrubbing", () => {
  it("maps the pinned scroll to the whole haul, ending with a beat of rest", () => {
    expect(scrollToHaul(0)).toBe(0);
    expect(scrollToHaul(1)).toBeGreaterThan(pullDuration());
    expect(pullAt(scrollToHaul(1), TOTAL).done).toBe(true);
    expect(scrollToHaul(-1)).toBe(0);
  });

  it("chases the scroll smoothly in both directions and settles exactly", () => {
    let t = 0;
    t = chase(t, 3, 1 / 60);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(3);
    for (let i = 0; i < 400; i++) t = chase(t, 3, 1 / 60);
    expect(t).toBe(3);
    expect(chase(3, 1, 1 / 60)).toBeLessThan(3); // scrolling back reverses the haul
  });

  it("drives the rig from its scrubbed time", () => {
    const rig = createRopeRig();
    rig.total = TOTAL;
    rig.t = pullDuration() + 0.1;
    expect(rigState(rig)).toMatchObject({ hauled: TOTAL, done: true });
    rig.t = 0;
    expect(rigState(rig).hauled).toBe(0);
  });
});
