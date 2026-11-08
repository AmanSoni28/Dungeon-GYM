import { describe, expect, it } from "vitest";
import { loadKg, photoLook, plateLifted, progressForPhoto, pulleyTurn, REP, repAt, REST, scrollToReps } from "../pulldown";

const N = 7;

describe("lat pulldown reps", () => {
  it("starts with the bar up, nothing pulled", () => {
    const s = repAt(0, N);
    expect(s).toMatchObject({ rep: -1, bar: 0, lift: 0 });
    expect(s.reveal.every((r) => r === 0)).toBe(true);
  });

  it("pulls each photo fully into the frame, one per rep, keeping the earlier ones", () => {
    for (let k = 0; k < N; k++) {
      const s = repAt(k + 0.99, N);
      expect(s.rep).toBe(k);
      expect(s.bar).toBe(1);
      expect(s.reveal.slice(0, k + 1).every((r) => r === 1)).toBe(true);
      expect(s.reveal.slice(k + 1).every((r) => r === 0)).toBe(true);
    }
  });

  it("rides the bar back up between reps while the stack lands, then the pin hops a plate", () => {
    const mid = repAt(3 + REP.ret * 0.5, N);
    expect(mid.bar).toBeGreaterThan(0.2);
    expect(mid.bar).toBeLessThan(0.8);
    expect(Math.round(mid.pin)).toBe(2); // still on the old plate while the stack is in the air
    const landed = repAt(3 + REP.ret * 0.999, N);
    expect(landed.lift).toBeLessThan(0.01);
    expect(landed.pin).toBeCloseTo(3, 2);
    // the pin never moves while the stack is lifted
    for (let t = 0; t < N; t += 0.005) {
      const a = repAt(t, N);
      const b = repAt(t + 0.005, N);
      if (Math.round(a.pin) !== Math.round(b.pin)) expect(Math.max(a.lift, b.lift)).toBeLessThan(0.08);
    }
  });

  it("ties the stack to the bar through the cable", () => {
    for (let t = 0; t < N + REST; t += 0.05) {
      const s = repAt(t, N);
      expect(s.lift).toBe(s.bar);
    }
  });

  it("is continuous (no jumps in bar, pin or reveal)", () => {
    let prev = repAt(0, N);
    for (let t = 0.002; t <= N + REST; t += 0.002) {
      const s = repAt(t, N);
      expect(Math.abs(s.bar - prev.bar)).toBeLessThan(0.05);
      expect(Math.abs(s.pin - prev.pin)).toBeLessThan(0.08); // the pin hops quickly, but never teleports
      s.reveal.forEach((r, i) => expect(Math.abs(r - prev.reveal[i])).toBeLessThan(0.05));
      prev = s;
    }
  });

  it("loads one plate heavier each rep (progressive overload)", () => {
    expect(loadKg(repAt(0.9, N).pin)).toBe(10);
    expect(loadKg(repAt(N - 0.01, N).pin)).toBe(N * 10);
    expect(plateLifted(0, 0)).toBe(true);
    expect(plateLifted(1, 0)).toBe(false);
    expect(plateLifted(4, 4)).toBe(true);
  });
});

describe("scroll + visuals", () => {
  it("maps the pinned scroll to the whole set, with a rest at the end", () => {
    expect(scrollToReps(0, N)).toBe(0);
    expect(scrollToReps(1, N)).toBe(N + REST);
    expect(repAt(scrollToReps(1, N), N).reveal.every((r) => r === 1)).toBe(true);
  });

  it("jumps to the scroll position where a photo is fully in", () => {
    for (let k = 0; k < N; k++) {
      const s = repAt(scrollToReps(progressForPhoto(k, N), N), N);
      expect(s.rep).toBe(k);
      expect(s.reveal[k]).toBe(1);
    }
  });

  it("wipes a photo in from the top out of a slow zoom, caption last", () => {
    expect(photoLook(0)).toMatchObject({ clipBottom: 100, caption: 0 });
    expect(photoLook(0).scale).toBeGreaterThan(1.1);
    const done = photoLook(1);
    expect(done.clipBottom).toBe(0);
    expect(done.scale).toBeCloseTo(1, 9);
    expect(done.caption).toBe(1);
    expect(photoLook(0.5).caption).toBe(0);
  });

  it("spins the pulleys with the cable", () => {
    expect(pulleyTurn(100, 20)).toBe(5);
    expect(pulleyTurn(100, 0)).toBe(0);
  });
});
