import { describe, expect, it } from "vitest";
import { chooseIntroMode, detectWebGL, readEnvironment } from "../capabilities";

const env = { reducedMotion: false, webgl: true, mobile: false, lowPower: false };

describe("intro capability detection", () => {
  it("plays the full cinematic on capable desktops", () => {
    expect(chooseIntroMode(env)).toBe("full");
  });
  it("uses the lightweight 3D version on mobile or low-power devices", () => {
    expect(chooseIntroMode({ ...env, mobile: true })).toBe("lite");
    expect(chooseIntroMode({ ...env, lowPower: true })).toBe("lite");
  });
  it("falls back to the non-WebGL version when WebGL is unavailable", () => {
    expect(chooseIntroMode({ ...env, webgl: false })).toBe("fallback");
    expect(chooseIntroMode({ ...env, webgl: false, mobile: true })).toBe("fallback");
  });
  it("skips the intro entirely when the user prefers reduced motion", () => {
    expect(chooseIntroMode({ ...env, reducedMotion: true })).toBe("none");
    expect(chooseIntroMode({ ...env, reducedMotion: true, webgl: false })).toBe("none");
  });

  const fakeDoc = (getContext: (t: string) => unknown) =>
    ({ createElement: () => ({ getContext }) }) as unknown as Document;

  it("detects WebGL2, WebGL1, none, and survives exceptions", () => {
    expect(detectWebGL(fakeDoc((t) => (t === "webgl2" ? {} : null)))).toBe(true);
    expect(detectWebGL(fakeDoc((t) => (t === "webgl" ? {} : null)))).toBe(true);
    expect(detectWebGL(fakeDoc(() => null))).toBe(false);
    expect(
      detectWebGL(
        fakeDoc(() => {
          throw new Error("blocked");
        })
      )
    ).toBe(false);
  });

  it("reads media queries and hardware hints from the window", () => {
    const win = {
      matchMedia: (q: string) => ({ matches: q.includes("reduce") || q.includes("coarse") }),
      navigator: { hardwareConcurrency: 2 },
      document: fakeDoc(() => ({})),
    } as unknown as Window;
    expect(readEnvironment(win)).toEqual({ reducedMotion: true, webgl: true, mobile: true, lowPower: true });
  });

  it("assumes a capable device when hints are missing", () => {
    const win = { navigator: {}, document: fakeDoc(() => ({})) } as unknown as Window;
    expect(readEnvironment(win)).toEqual({ reducedMotion: false, webgl: true, mobile: false, lowPower: false });
  });
});
