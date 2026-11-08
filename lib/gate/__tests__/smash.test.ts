import { describe, expect, it, vi } from "vitest";
import {
  beatsCrossed,
  cameraFov,
  cameraPush,
  doorOpen,
  DUMBBELL,
  flightPose,
  GATE_FACE,
  gateLight,
  hasSeenSmash,
  impactSpeed,
  initialSmashState,
  LAUNCH,
  markSmashSeen,
  reboundBody,
  SEEN_KEY,
  SMASH_T,
  smashPhase,
  smashReducer,
  stepBody,
  timeScale,
  trackWeight,
} from "../smash";

describe("smash timeline", () => {
  it("has beats in cinematic order", () => {
    expect(SMASH_T.throw).toBeGreaterThanOrEqual(1); // 1–2 s of suspense first
    expect(SMASH_T.throw).toBeLessThanOrEqual(2);
    expect(SMASH_T.throw).toBeLessThan(SMASH_T.impact);
    expect(SMASH_T.impact).toBeLessThan(SMASH_T.openStart);
    expect(SMASH_T.openStart).toBeLessThan(SMASH_T.openEnd);
    expect(SMASH_T.openEnd).toBeLessThan(SMASH_T.end);
  });

  it("maps time to phases", () => {
    expect(smashPhase(-1)).toBe("idle");
    expect(smashPhase(0.5)).toBe("approach");
    expect(smashPhase((SMASH_T.throw + SMASH_T.impact) / 2)).toBe("flight");
    expect(smashPhase(SMASH_T.impact)).toBe("impact");
    expect(smashPhase(SMASH_T.openStart + 0.1)).toBe("opening");
    expect(smashPhase(SMASH_T.openEnd + 0.01)).toBe("hold");
    expect(smashPhase(SMASH_T.end)).toBe("done");
  });

  it("reports every beat crossed, once, in order (even on a big jump)", () => {
    expect(beatsCrossed(0, 1)).toEqual([]);
    expect(beatsCrossed(1.4, 1.6)).toEqual(["throw"]);
    expect(beatsCrossed(SMASH_T.impact - 0.01, SMASH_T.impact)).toEqual(["impact"]);
    expect(beatsCrossed(SMASH_T.impact, SMASH_T.impact + 0.01)).toEqual([]);
    expect(beatsCrossed(0, 99)).toEqual(["throw", "impact", "open", "end"]);
  });
});

describe("dumbbell flight", () => {
  it("launches from the foreground and lands on the centre of the gate", () => {
    const a = flightPose(0);
    const b = flightPose(1);
    expect(a.z).toBeCloseTo(LAUNCH.z, 6);
    expect(b.x).toBeCloseTo(GATE_FACE.x, 6);
    expect(b.y).toBeCloseTo(GATE_FACE.y, 6);
    expect(b.z).toBeCloseTo(GATE_FACE.z, 6);
  });

  it("travels monotonically toward the gate while tumbling", () => {
    let prev = flightPose(0);
    for (let u = 0.05; u <= 1; u += 0.05) {
      const p = flightPose(u);
      expect(p.z).toBeLessThan(prev.z);
      expect(p.rx).toBeGreaterThan(prev.rx);
      prev = p;
    }
  });

  it("arcs above the straight line and is fast at impact", () => {
    const mid = flightPose(0.5);
    expect(mid.y).toBeGreaterThan((LAUNCH.y + GATE_FACE.y) / 2);
    expect(impactSpeed()).toBeGreaterThan(20); // m/s: a hard throw
  });

  it("rebounds off the gate, falls to the floor and comes to rest", () => {
    let b = reboundBody();
    expect(b.vz).toBeGreaterThan(0); // bounces back toward the camera
    const hits: number[] = [];
    for (let i = 0; i < 400 && !b.resting; i++) {
      const r = stepBody(b, 1 / 60);
      b = r.body;
      r.hits.forEach((h) => hits.push(h.speed));
    }
    expect(b.resting).toBe(true);
    expect(b.y).toBeCloseTo(DUMBBELL.radius, 6);
    expect(hits.length).toBeGreaterThan(0);
    for (let i = 1; i < hits.length; i++) expect(hits[i]).toBeLessThan(hits[i - 1]); // each bounce weaker
    expect(b.z).toBeGreaterThan(GATE_FACE.z); // still in front of the gate
  });

  it("is deterministic regardless of frame size", () => {
    let a = reboundBody();
    let b = reboundBody();
    for (let i = 0; i < 60; i++) a = stepBody(a, 1 / 60).body;
    for (let i = 0; i < 30; i++) b = stepBody(b, 1 / 30).body;
    expect(a.x).toBeCloseTo(b.x, 3);
    expect(a.z).toBeCloseTo(b.z, 3);
  });
});

describe("gate doors", () => {
  it("stay shut until the impact, react to it, then open fully", () => {
    expect(doorOpen(0)).toBe(0);
    expect(doorOpen(SMASH_T.impact - 0.01)).toBe(0);
    const shudder = Math.max(...[0.02, 0.05, 0.08, 0.12].map((d) => doorOpen(SMASH_T.impact + d)));
    expect(shudder).toBeGreaterThan(0.02); // visibly punched in
    expect(shudder).toBeLessThan(0.15); // but the latch holds at first
    expect(doorOpen(SMASH_T.openEnd)).toBeCloseTo(1, 6);
    expect(doorOpen(SMASH_T.end + 5)).toBeCloseTo(1, 6);
  });

  it("swing open smoothly (monotonic, no jumps)", () => {
    let prev = doorOpen(SMASH_T.openStart);
    for (let t = SMASH_T.openStart + 0.02; t <= SMASH_T.openEnd; t += 0.02) {
      const o = doorOpen(t);
      expect(o).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(o - prev).toBeLessThan(0.05);
      prev = o;
    }
  });

  it("is continuous where the latch gives way", () => {
    expect(Math.abs(doorOpen(SMASH_T.openStart - 1e-4) - doorOpen(SMASH_T.openStart))).toBeLessThan(0.02);
  });

  it("brightens the golden light as they open", () => {
    expect(gateLight(0)).toBe(0);
    expect(gateLight(SMASH_T.openEnd)).toBeCloseTo(1, 6);
    expect(gateLight(SMASH_T.openStart + 1)).toBeGreaterThan(gateLight(SMASH_T.openStart + 0.2));
  });
});

describe("camera", () => {
  it("pushes in during the approach and holds", () => {
    expect(cameraPush(0)).toBe(0);
    expect(cameraPush(SMASH_T.throw)).toBeGreaterThan(0.8);
    expect(cameraPush(SMASH_T.end)).toBe(1);
  });

  it("tracks the dumbbell only around its flight", () => {
    expect(trackWeight(0.5)).toBe(0);
    expect(trackWeight((SMASH_T.throw + SMASH_T.impact) / 2)).toBeGreaterThan(0.5);
    expect(trackWeight(SMASH_T.end)).toBe(0);
  });
});

describe("time remapping", () => {
  it("runs in real time outside the slow-motion window", () => {
    expect(timeScale(0)).toBe(1);
    expect(timeScale(SMASH_T.throw)).toBe(1);
    expect(timeScale(SMASH_T.openStart)).toBe(1);
  });
  it("goes bullet-time just before impact and freezes for a moment on it", () => {
    expect(timeScale(SMASH_T.impact - 0.05)).toBeLessThan(0.35);
    expect(timeScale(SMASH_T.impact + 0.005)).toBeLessThan(timeScale(SMASH_T.impact - 0.05));
    expect(timeScale(SMASH_T.impact + 0.005)).toBeGreaterThan(0); // never stops the clock
  });
  it("is continuous where slow motion ramps in", () => {
    for (let t = SMASH_T.impact - 0.25; t < SMASH_T.impact - 0.01; t += 0.002) {
      expect(Math.abs(timeScale(t + 0.002) - timeScale(t))).toBeLessThan(0.05);
    }
  });
  it("punches the lens in during bullet time and kicks it on impact", () => {
    expect(cameraFov(0)).toBe(58);
    expect(cameraFov(SMASH_T.impact - 0.01)).toBeLessThan(52);
    expect(cameraFov(SMASH_T.impact + 0.1)).toBeGreaterThan(58);
    expect(cameraFov(SMASH_T.end)).toBeCloseTo(58, 1);
  });
});

describe("skip / replay lifecycle", () => {
  it("plays, finishes and replays", () => {
    let s = smashReducer(initialSmashState, { type: "START" });
    expect(s).toMatchObject({ status: "playing", run: 1, skipped: false });
    s = smashReducer(s, { type: "FINISH" });
    expect(s.status).toBe("done");
    s = smashReducer(s, { type: "REPLAY" });
    expect(s).toMatchObject({ status: "playing", run: 2, skipped: false });
  });

  it("skips immediately and remembers it was skipped", () => {
    let s = smashReducer(initialSmashState, { type: "START" });
    s = smashReducer(s, { type: "SKIP" });
    expect(s).toMatchObject({ status: "done", skipped: true });
    // a late FINISH from the scene cannot change anything
    expect(smashReducer(s, { type: "FINISH" })).toBe(s);
    // replay clears the skipped flag
    expect(smashReducer(s, { type: "REPLAY" }).skipped).toBe(false);
  });

  it("ignores events that make no sense in the current state", () => {
    expect(smashReducer(initialSmashState, { type: "SKIP" })).toBe(initialSmashState);
    expect(smashReducer(initialSmashState, { type: "REPLAY" })).toBe(initialSmashState);
    expect(smashReducer(initialSmashState, { type: "FINISH" })).toBe(initialSmashState);
    const playing = smashReducer(initialSmashState, { type: "START" });
    expect(smashReducer(playing, { type: "START" })).toBe(playing);
    expect(smashReducer(playing, { type: "REPLAY" })).toBe(playing);
  });

  it("bypasses straight to done (already seen / reduced motion) without counting a run", () => {
    const s = smashReducer(initialSmashState, { type: "BYPASS" });
    expect(s).toMatchObject({ status: "done", run: 0 });
    // the visitor can still choose to replay it
    expect(smashReducer(s, { type: "REPLAY" }).status).toBe("playing");
  });
});

describe("once per visit", () => {
  it("remembers that the sequence was seen", () => {
    const data: Record<string, string> = {};
    const store = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
    };
    expect(hasSeenSmash(store)).toBe(false);
    markSmashSeen(store);
    expect(data[SEEN_KEY]).toBe("1");
    expect(hasSeenSmash(store)).toBe(true);
  });

  it("never throws when storage is blocked", () => {
    const broken = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    expect(hasSeenSmash(broken)).toBe(false);
    expect(() => markSmashSeen(broken)).not.toThrow();
    expect(hasSeenSmash(null)).toBe(false);
  });
});
