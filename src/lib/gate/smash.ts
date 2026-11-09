// "Dumbbell gate smash": the entrance sequence of the 3D gate (Hero). Pure + deterministic (unit tested).
//
//   0 ── approach ── 1.5 ── flight ── 2.1 impact ── recoil ── 2.35 ── opening ── 4.6 ── hold ── 5.0 done
//
//   approach: camera creeps toward the closed gate (suspense)
//   flight:   a heavy dumbbell flies in from the foreground, spinning, and hits the centre of the gate
//   impact:   sparks, flash, shake; the doors are punched in and wobble against the latch
//   opening:  the latch gives, both doors swing open on their hinges, golden light floods out
//   hold:     doors settle open; scrolling on carries the visitor through into the gym
//
// The whole shot is scrubbed by the visitor's scroll (see SCRUB); scrolling back rewinds it.

export const SMASH_T = {
  throw: 1.5,
  impact: 2.0,
  openStart: 2.3,
  openEnd: 4.5,
  end: 4.9,
} as const;

/** door opening (0..1, 1 = fully open) that the latch can hold before it gives way */
const RECOIL_MAX = 0.085;

export type SmashPhase = "idle" | "approach" | "flight" | "impact" | "opening" | "hold" | "done";

export function smashPhase(t: number): SmashPhase {
  if (t < 0) return "idle";
  if (t < SMASH_T.throw) return "approach";
  if (t < SMASH_T.impact) return "flight";
  if (t < SMASH_T.openStart) return "impact";
  if (t < SMASH_T.openEnd) return "opening";
  if (t < SMASH_T.end) return "hold";
  return "done";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

// ── Geometry of the shot (world units, gate at z = -16) ──
export const GATE_FACE = { x: 0, y: 2.55, z: -15.72 };
/** the dumbbell enters low and to the right, right in front of the lens (fills the frame) */
export const LAUNCH = { x: 0.95, y: 1.05, z: -3.1 };
/** camera z once the approach push-in is complete */
export const CAMERA_PUSH_Z = -1.6;

export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number };

/**
 * Dumbbell pose during the flight (u = 0..1 from launch to the gate).
 * Near-constant speed (it was thrown hard), a slight ballistic arc, and a heavy tumble.
 */
export function flightPose(u: number): Pose {
  const s = clamp01(u);
  // a touch of deceleration so the last metres read as "heavy" without losing speed
  const p = s * (1.08 - 0.08 * s);
  return {
    x: LAUNCH.x + (GATE_FACE.x - LAUNCH.x) * p,
    y: LAUNCH.y + (GATE_FACE.y - LAUNCH.y) * p + Math.sin(Math.PI * p) * 0.9,
    z: LAUNCH.z + (GATE_FACE.z - LAUNCH.z) * p,
    rx: s * Math.PI * 3.2, // end-over-end tumble
    ry: 0.35 + s * 0.6,
    rz: s * Math.PI * 1.4,
  };
}

export const flightProgress = (t: number) => clamp01((t - SMASH_T.throw) / (SMASH_T.impact - SMASH_T.throw));

/** Speed of the dumbbell along its path at impact (m/s): used to scale sparks, shake and sound. */
export function impactSpeed() {
  const a = flightPose(0.98);
  const b = flightPose(1);
  const dt = (SMASH_T.impact - SMASH_T.throw) * 0.02;
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt;
}

// ── After impact: the dumbbell rebounds off the iron and drops to the floor ──
export type Body = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  rz: number;
  wx: number;
  wz: number;
  resting: boolean;
};
export type FloorHit = { speed: number; x: number; z: number };

export const DUMBBELL = {
  /** plate radius: the dumbbell rests on its plates */
  radius: 0.34,
  gravity: 9.81,
  restitution: 0.3,
  friction: 0.6,
};

export function reboundBody(): Body {
  const f = flightPose(1);
  return { x: f.x, y: f.y, z: f.z + 0.05, vx: -0.7, vy: 2.4, vz: 3.6, rx: f.rx, rz: f.rz, wx: -9, wz: 4, resting: false };
}

/** Advance the rebounding dumbbell (fixed sub-steps, deterministic). */
export function stepBody(prev: Body, dt: number): { body: Body; hits: FloorHit[] } {
  const b = { ...prev };
  const hits: FloorHit[] = [];
  if (b.resting || dt <= 0) return { body: b, hits };
  const STEP = 1 / 240;
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    b.vy -= DUMBBELL.gravity * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
    b.rx += b.wx * h;
    b.rz += b.wz * h;
    if (b.y <= DUMBBELL.radius) {
      b.y = DUMBBELL.radius;
      if (b.vy < -0.5) {
        hits.push({ speed: -b.vy, x: b.x, z: b.z });
        b.vy = -b.vy * DUMBBELL.restitution;
        b.vx *= DUMBBELL.friction;
        b.vz *= DUMBBELL.friction;
        b.wx *= 0.5;
        b.wz *= 0.4;
      } else {
        b.vy = 0;
        // rolling to a stop
        const sp = Math.hypot(b.vx, b.vz);
        const dec = Math.max(0, sp - 3 * h);
        const k = sp > 0 ? dec / sp : 0;
        b.vx *= k;
        b.vz *= k;
        b.wx *= 0.97;
        b.wz *= 0.9;
        if (sp < 0.03) {
          b.vx = b.vz = 0;
          b.resting = true;
          break;
        }
      }
    }
  }
  return { body: b, hits };
}

/**
 * How far the doors are open (0..1) at time t.
 * Impact: punched in against the latch and shuddering; then the latch gives and the heavy doors
 * swing open with real inertia (slow start, momentum, soft settle).
 */
export function doorOpen(t: number): number {
  if (t < SMASH_T.impact) return 0;
  const k = t - SMASH_T.impact;
  const recoil = RECOIL_MAX * Math.exp(-6 * k) * Math.abs(Math.sin(k * 26)) + RECOIL_MAX * 0.45 * smooth(k / 0.12);
  if (t < SMASH_T.openStart) return recoil;
  const u = clamp01((t - SMASH_T.openStart) / (SMASH_T.openEnd - SMASH_T.openStart));
  // ease-in-out-cubic: heavy iron has to get going, then glides into place
  const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const from = RECOIL_MAX * 0.45;
  return from + (1 - from) * e;
}

/** brightness of the golden light behind the gate (0..1) */
export function gateLight(t: number) {
  if (t < SMASH_T.impact) return 0;
  return Math.max(0.25 * Math.exp(-4 * (t - SMASH_T.impact)), doorOpen(t));
}

/**
 * Playback speed of the sequence clock (1 = real time).
 * Bullet time over the last metres of the flight, then a split-second hit-stop on impact.
 */
export function timeScale(t: number) {
  const slowFrom = SMASH_T.impact - 0.2;
  const slowFull = SMASH_T.impact - 0.13;
  if (t < slowFrom) return 1;
  if (t < slowFull) return 1 - 0.72 * smooth((t - slowFrom) / (slowFull - slowFrom));
  if (t < SMASH_T.impact) return 0.28;
  if (t < SMASH_T.impact + 0.012) return 0.1; // hit-stop
  if (t < SMASH_T.impact + 0.25) return 0.45 + 0.55 * smooth((t - SMASH_T.impact - 0.012) / 0.24);
  return 1;
}

/** Camera field of view (degrees): tightens in bullet time, kicks wide on impact, settles. */
export function cameraFov(t: number, base = 58) {
  if (t < SMASH_T.throw) return base;
  if (t < SMASH_T.impact) return base - 9 * smooth((t - (SMASH_T.impact - 0.25)) / 0.25);
  const k = t - SMASH_T.impact;
  return base + 6 * Math.exp(-k * 7) - 9 * Math.exp(-k * 30);
}

/** camera push-in during the approach (0..1) */
export function cameraPush(t: number) {
  return smooth(t / (SMASH_T.throw + 0.4));
}

/** how much the camera looks toward the dumbbell (0..1): follows the flight, lets go after impact */
export function trackWeight(t: number) {
  if (t < SMASH_T.throw - 0.05 || t > SMASH_T.openStart + 0.6) return 0;
  const inn = smooth((t - (SMASH_T.throw - 0.05)) / 0.18);
  const out = 1 - smooth((t - SMASH_T.impact) / 0.85);
  return inn * out;
}

// ── Scroll-driven playback ──
// The visitor drives the shot with the scroll wheel: the first part of the pinned hero scrubs the
// sequence (dumbbell → impact → doors), the rest carries the camera through the open gate.
export const SCRUB = {
  /** fraction of the hero's pinned scroll that plays the smash */
  share: 0.5,
  /** fastest the clock may run, in sequence-seconds per second (scaled by bullet time) */
  maxSpeed: 2.4,
  /** how quickly the clock catches up with the scroll position (1/s) */
  follow: 7,
};

/** how much scroll each second of the sequence gets: slow motion takes more scroll, like the timed cut */
function scrollWeight(t: number) {
  if (t < SMASH_T.throw) return 0.85;
  if (t >= SMASH_T.openEnd) return 0.6;
  return 1 / timeScale(t);
}

const WARP_N = 600;
let warp: Float64Array | null = null;
function warpTable() {
  if (warp) return warp;
  warp = new Float64Array(WARP_N + 1);
  const h = SMASH_T.end / WARP_N;
  for (let i = 1; i <= WARP_N; i++) warp[i] = warp[i - 1] + scrollWeight((i - 0.5) * h) * h;
  return warp;
}

/** Sequence time (s) for a hero scroll progress p (0..1). Monotonic, 0 at the top, SMASH_T.end at SCRUB.share. */
export function scrollToSmashTime(p: number) {
  const tab = warpTable();
  const goal = clamp01(p / SCRUB.share) * tab[WARP_N];
  let lo = 0;
  let hi = WARP_N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tab[mid] < goal) lo = mid;
    else hi = mid;
  }
  const span = tab[hi] - tab[lo];
  const f = span > 0 ? (goal - tab[lo]) / span : 0;
  return Math.min(SMASH_T.end, ((lo + clamp01(f)) / WARP_N) * SMASH_T.end);
}

/**
 * One frame of the scroll-scrubbed clock: chase the scroll position smoothly, but never faster
 * than the cinematic allows (bullet time and the hit-stop survive even a hard flick of the wheel).
 */
export function scrubStep(t: number, goal: number, dt: number): { t: number; scale: number } {
  const d = goal - t;
  if (Math.abs(d) < 1e-4) return { t: goal, scale: 1 };
  let step = d * (1 - Math.exp(-dt * SCRUB.follow));
  if (step > 0) step = Math.min(step, dt * SCRUB.maxSpeed * timeScale(t));
  else step = Math.max(step, -dt * SCRUB.maxSpeed * 2);
  const next = t + step;
  return { t: next, scale: step > 0 ? timeScale(next) : 1 };
}

// ── Shared clock between the page overlay (Hero) and the 3D scene ──
export type SmashBeat = "throw" | "impact" | "open" | "end";

export type SmashClock = {
  /** seconds into the sequence; -1 = never played (scroll alone opens the gate, as before) */
  t: number;
  running: boolean;
  /** increments on every (re)play so effects can re-arm */
  run: number;
  /** camera-shake trauma 0..1 */
  trauma: number;
  /** current playback speed (bullet time / hit-stop), for effects that run on their own clocks */
  scale: number;
  /** dev freeze-frame: hold every effect still */
  frozen?: boolean;
  /** scroll-driven: the clock chases `goal` (set from the scroll position) instead of running on its own */
  scrub: boolean;
  goal: number;
  /** live dumbbell position, for camera tracking */
  target: { x: number; y: number; z: number };
  onBeat?: (beat: SmashBeat) => void;
};

export const createSmashClock = (): SmashClock => ({
  t: -1,
  running: false,
  run: 0,
  trauma: 0,
  scale: 1,
  scrub: false,
  goal: 0,
  target: { x: 0, y: 0, z: 0 },
});

const BEATS: [SmashBeat, number][] = [
  ["throw", SMASH_T.throw],
  ["impact", SMASH_T.impact],
  ["open", SMASH_T.openStart],
  ["end", SMASH_T.end],
];

/** Beats passed when the clock moves from prev to next (in order). */
export function beatsCrossed(prev: number, next: number): SmashBeat[] {
  return BEATS.filter(([, at]) => prev < at && next >= at).map(([b]) => b);
}
