// "Rope pull" entrance of the Group Classes rail. Pure + deterministic (unit tested).
//
// An athlete hauls a battle rope, one stroke per class (drive: lean back, elbows back / reach: re-grip).
// The class cards are threaded on the rope; each drive hauls exactly one card-pitch of rope, bringing
// the next card into the centre of the screen. During the re-grip the rope rests and the centred card
// holds the spotlight. Cards already shown are hauled on toward the athlete and fade behind him.
//
//   −∞ ── ready ── 0 ── prelude ── strokes × (drive | reach) ── done
//
// The haul is scrubbed by the visitor's scroll (the section pins while it plays; scrolling back reverses it).

import type { Pose } from "@/lib/intro/choreography";

export const PULL = {
  /** strokes: one per class card */
  strokes: 6,
  /** seconds per stroke, and the share of it spent driving (the rope only moves on the drive) */
  stroke: 0.9,
  drive: 0.55,
  /** grip + settle into the lean before the first stroke */
  prelude: 0.55,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
/** a heavy pull: explosive start, decelerating into the lockout */
const drivePower = (x: number) => 1 - Math.pow(1 - clamp01(x), 2.4);

export const pullDuration = () => PULL.prelude + PULL.strokes * PULL.stroke;

export type PullState = {
  /** rope hauled in so far (px) */
  hauled: number;
  /** rope tension 0..1 (slack → taut): drives sag and vibration */
  tension: number;
  /** athlete pose blend 0..1 (0 = reaching forward, 1 = fully driven back) */
  drive: number;
  done: boolean;
};

/** Pull state at t seconds after the start, for a train that needs `total` px of rope hauled in. */
export function pullAt(t: number, total: number): PullState {
  if (t < 0) return { hauled: 0, tension: 0.12, drive: 0, done: false };
  if (t < PULL.prelude) {
    const k = smooth(t / PULL.prelude);
    return { hauled: 0, tension: 0.12 + 0.38 * k, drive: 0.12 * k, done: false };
  }
  const per = total / PULL.strokes;
  const s = t - PULL.prelude;
  const k = Math.floor(s / PULL.stroke);
  if (k >= PULL.strokes) return { hauled: total, tension: 0.5, drive: 0.32, done: true };
  const u = (s - k * PULL.stroke) / PULL.stroke;
  if (u < PULL.drive) {
    const x = u / PULL.drive;
    return { hauled: per * (k + drivePower(x)), tension: 0.82 + 0.18 * Math.sin(Math.PI * x), drive: smooth(x), done: false };
  }
  const x = (u - PULL.drive) / (1 - PULL.drive);
  // re-grip: the rope rests, slack comes back into it as the hands travel forward
  const last = k === PULL.strokes - 1;
  return {
    hauled: per * (k + 1),
    tension: 0.82 - 0.5 * smooth(x * 2.5),
    drive: last ? 1 - 0.68 * smooth(x) : 1 - smooth(x),
    done: false,
  };
}

/** Scroll progress (0..1 of the pinned section) → seconds into the haul (with a beat of rest at the end). */
export const HOLD_END = 0.3;
export const scrollToHaul = (p: number) => clamp01(p) * (pullDuration() + HOLD_END);

/** Chase the scroll position smoothly (frame-rate independent), snapping when close. */
export function chase(t: number, goal: number, dt: number, rate = 7) {
  const next = goal + (t - goal) * Math.exp(-rate * dt);
  return Math.abs(next - goal) < 1e-4 ? goal : next;
}

/** Rope to haul for `count` cards, one pitch (card width + gap) per stroke. */
export const haulTotal = (count: number, pitch: number) => count * pitch;

/**
 * Which card is at the centre (fractional index) once `hauled` px are in.
 * −1: the first card is still queued one pitch to the right; count − 1: the last card is centred.
 */
export const carouselPos = (hauled: number, pitch: number) => (pitch > 0 ? hauled / pitch - 1 : -1);

/**
 * Look of a card at signed distance `d` (in cards) from the centre: 0 = in the spotlight,
 * > 0 = queued on the right, < 0 = already shown, being hauled on toward the athlete.
 */
export function cardLook(d: number) {
  const a = Math.abs(d);
  const f = a >= 1 ? 0 : 1 - a * a * (3 - 2 * a);
  const opacity = d < 0 ? clamp01(1 - (-d - 0.35) / 0.85) : 1 - 0.38 * clamp01(d) - 0.62 * clamp01(d - 2);
  return { focus: f, scale: 0.8 + 0.2 * f, opacity, dim: 1 - f };
}

/** Where the centred card sits (px): the middle of the screen, but never under the athlete. */
export function focusX(stageWidth: number, athleteRight: number, cardWidth: number, gap = 16) {
  const want = Math.max(stageWidth / 2, athleteRight + cardWidth / 2 + gap);
  return Math.min(want, stageWidth - cardWidth / 2 - 8);
}

/** Damped spring (slightly under-damped: a heavy card overshoots its slot a touch and settles). */
export const SPRING = { k: 150, zeta: 0.52 };
export type Body1D = { x: number; v: number };
export function springStep(b: Body1D, target: number, dt: number, k: number = SPRING.k): Body1D & { a: number } {
  const c = 2 * SPRING.zeta * Math.sqrt(k);
  let { x, v } = b;
  let a = 0;
  const STEP = 1 / 240;
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    a = k * (target - x) - c * v;
    v += a * h;
    x += v * h;
  }
  return { x, v, a };
}

/**
 * Cards hang on the rope through their eyelets: they swing (radians) against their acceleration
 * like a damped pendulum, clamped to a dignified few degrees.
 */
export const SWING = { w2: 38, damp: 5.5, gain: 0.00022, max: 0.09 };
export function swingStep(s: { th: number; w: number }, accel: number, dt: number) {
  let { th, w } = s;
  const STEP = 1 / 240;
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    left -= h;
    w += (-SWING.w2 * th - SWING.damp * w - accel * SWING.gain) * h;
    th += w * h;
    th = Math.max(-SWING.max, Math.min(SWING.max, th));
  }
  return { th, w };
}

/** Rope vibration envelope after a jolt (px of extra sag, signed). */
export const vibration = (energy: number, time: number, phase = 0) => energy * Math.sin(time * 30 + phase) * 7;

export type RopePoint = { x: number; y: number };

/**
 * SVG path for the rope through the given points (left → right). Each free span hangs with a sag
 * that grows with its length and with slack, plus a little vibration. `rigid` spans (behind a card,
 * between its two eyelets) stay straight.
 */
export function ropePath(points: RopePoint[], tension: number, wobble: (i: number) => number, rigid: (i: number) => boolean) {
  if (points.length < 2) return "";
  const slack = 1 - clamp01(tension);
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (rigid(i - 1)) {
      d += `L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      continue;
    }
    const span = Math.abs(b.x - a.x);
    const sag = Math.min(90, span * (0.012 + 0.11 * slack)) + wobble(i - 1);
    // quadratic control point twice the sag below the chord's midpoint (the curve dips by `sag`)
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2 + sag * 2;
    d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

// ── Athlete poses (side-on, facing the cards) ──
export const ROPE_POSES: Record<"reach" | "drive", Pose> = {
  // hips back in an athletic squat, arms long toward the rope, eyes on the cards
  reach: { pelvis: 0.22, spine: 0.12, neck: -0.2, legHip: -0.78, knee: 0.98, armFlex: -1.45, armAbd: 0.06, elbow: -0.12 },
  // lean back into the rope, elbows driven past the ribs, hands at the chest
  drive: { pelvis: -0.14, spine: -0.18, neck: 0.04, legHip: -0.4, knee: 0.64, armFlex: -0.5, armAbd: 0.1, elbow: -1.8 },
};

export function ropePose(drive: number, breath = 0): Pose {
  const k = clamp01(drive);
  const r = ROPE_POSES.reach;
  const d = ROPE_POSES.drive;
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    pelvis: mix(r.pelvis, d.pelvis),
    spine: mix(r.spine, d.spine) - breath * 0.015,
    neck: mix(r.neck, d.neck),
    legHip: mix(r.legHip, d.legHip),
    knee: mix(r.knee, d.knee),
    armFlex: mix(r.armFlex, d.armFlex),
    armAbd: mix(r.armAbd, d.armAbd),
    elbow: mix(r.elbow, d.elbow),
  };
}

/** Shared between the DOM rope/cards loop and the 3D athlete (written every frame, no React state). */
export type RopeRig = {
  /** seconds into the haul (smoothed toward `goal`, which the scroll position sets) */
  t: number;
  goal: number;
  /** reduced motion: everything is already in place */
  reduced: boolean;
  /** total rope to haul (px), from the layout */
  total: number;
  /** athlete's hands on the canvas (px, canvas space) and their resting height */
  hand: { x: number; y: number; ready: boolean; restY: number };
};

export const createRopeRig = (): RopeRig => ({ t: 0, goal: 0, reduced: false, total: 1, hand: { x: 0, y: 0, ready: false, restY: 0 } });

/** Athlete drive + rope tension right now. */
export function rigState(rig: RopeRig): PullState {
  if (rig.reduced) return { hauled: rig.total, tension: 0.5, drive: 0.32, done: true };
  return pullAt(rig.t, rig.total);
}
