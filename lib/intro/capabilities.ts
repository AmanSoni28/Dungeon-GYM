// Decide how rich the intro can be on this device.

export type IntroMode = "none" | "fallback" | "lite" | "full";

export type IntroEnvironment = {
  reducedMotion: boolean;
  webgl: boolean;
  mobile: boolean;
  lowPower: boolean;
};

export function chooseIntroMode(env: IntroEnvironment): IntroMode {
  if (env.reducedMotion) return "none";
  if (!env.webgl) return "fallback";
  if (env.mobile || env.lowPower) return "lite";
  return "full";
}

export function detectWebGL(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export function readEnvironment(win: Window = window): IntroEnvironment {
  const mq = (q: string) => (typeof win.matchMedia === "function" ? win.matchMedia(q).matches : false);
  const cores = win.navigator?.hardwareConcurrency ?? 8;
  return {
    reducedMotion: mq("(prefers-reduced-motion: reduce)"),
    webgl: detectWebGL(win.document),
    mobile: mq("(max-width: 760px)") || mq("(pointer: coarse)"),
    lowPower: cores <= 4,
  };
}
