// Development-only switch for iterating on the gate smash (never active in production builds):
//   ?gate=2.2   freeze the sequence at t = 2.2 s (skips the preloader + intro)
//   ?gate=play  play the sequence immediately (skips the preloader + intro)
export type GateDebug = number | "play" | null;

export function readGateDebug(search = typeof window === "undefined" ? "" : window.location.search): GateDebug {
  if (process.env.NODE_ENV === "production") return null;
  const v = new URLSearchParams(search).get("gate");
  if (v === null) return null;
  if (v === "play" || v === "") return "play";
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
