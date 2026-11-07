import { describe, expect, it } from "vitest";
import { initialIntroState, introReducer, isActive, type IntroEvent, type IntroState } from "../machine";

const run = (events: IntroEvent["type"][], from: IntroState = initialIntroState) =>
  events.reduce((s, type) => introReducer(s, { type } as IntroEvent), from);

describe("intro state machine", () => {
  it("follows the cinematic path: waiting → playing → impact → leaving → done", () => {
    expect(run(["START"]).phase).toBe("playing");
    expect(run(["START", "IMPACT"]).phase).toBe("impact");
    expect(run(["START", "IMPACT", "LEAVE"]).phase).toBe("leaving");
    const end = run(["START", "IMPACT", "LEAVE", "DONE"]);
    expect(end.phase).toBe("done");
    expect(end.skipped).toBe(false);
    expect(isActive(end)).toBe(false);
  });

  it("counts every impact (bounces included)", () => {
    expect(run(["START", "IMPACT", "IMPACT", "IMPACT"]).impacts).toBe(3);
  });

  it.each([[[]], [["START"]], [["START", "IMPACT"]]] as IntroEvent["type"][][][])(
    "Skip Intro works from any active phase (%j)",
    (before) => {
      const s = run([...before, "SKIP"]);
      expect(s.phase).toBe("leaving");
      expect(s.skipped).toBe(true);
    }
  );

  it("ignores Skip while already leaving (no double exit)", () => {
    const leaving = run(["START", "IMPACT", "LEAVE"]);
    expect(introReducer(leaving, { type: "SKIP" })).toBe(leaving);
  });

  it("only finishes from the leaving phase", () => {
    expect(run(["DONE"]).phase).toBe("waiting");
    expect(run(["START", "DONE"]).phase).toBe("playing");
  });

  it("cannot be restarted once done (plays once per page load)", () => {
    const done = run(["START", "LEAVE", "DONE"]);
    expect(run(["START", "IMPACT", "SKIP"], done)).toBe(done);
  });

  it("FINISH jumps straight to done (reduced motion)", () => {
    expect(run(["FINISH"]).phase).toBe("done");
  });

  it("does not leave before the sequence has started", () => {
    expect(run(["LEAVE"]).phase).toBe("waiting");
    expect(run(["IMPACT"]).phase).toBe("waiting");
  });
});
