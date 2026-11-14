// "Rope pull" entrance of the Group Classes rail. Pure + deterministic (unit tested).
//
// Two hands haul a heavy rope, one stroke per class (drive: grip hard and pull back / reach: ease the grip, re-set).
// The class cards are threaded on the rope; each drive hauls exactly one card-pitch of rope, bringing
// the next card into the centre of the screen. During the re-grip the rope rests and the centred card
// holds the spotlight. Cards already shown are hauled on toward the hands and fade out.
//
//   −∞ ── ready ── 0 ── prelude ── strokes × (drive | reach) ── done
//
// The haul is scrubbed by the visitor's scroll (the section pins while it plays; scrolling back reverses it).

export const PULL = {
  /** strokes: one per class card */
  strokes: 6,
  /** seconds per stroke, and the share of it spent driving (the rope only moves on the drive) */
  stroke: 0.9,
  drive: 0.62,
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
  /** hands pose blend 0..1 (0 = reaching forward, 1 = fully driven back) */
  drive: number;
  done: boolean;
};

/** Pull state at t seconds after the start, for a train that needs `total` px of rope hauled in. */
export function pullAt(t: number, total: number): PullState {
  if (t < 0) return { hauled: 0, tension: 0.12, drive: 0, done: false };
  if (t < PULL.prelude) {
    const k = smooth(t / PULL.prelude);
    return { hauled: 0, tension: 0.12 + 0.2 * k, drive: 0, done: false }; // the hands settle their grip
  }
  const per = total / PULL.strokes;
  const s = t - PULL.prelude;
  const k = Math.floor(s / PULL.stroke);
  if (k >= PULL.strokes) return { hauled: total, tension: 0.32, drive: 0.32, done: true };
  const u = (s - k * PULL.stroke) / PULL.stroke;
  if (u < PULL.drive) {
    const x = u / PULL.drive;
    // the slack is taken up in the first moment of the drive, then the rope stays bar-tight
    const tension = 0.32 + 0.5 * smooth(x * 4) + 0.18 * Math.sin(Math.PI * x);
    return { hauled: per * (k + drivePower(x)), tension, drive: smooth(x), done: false };
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
  return {
    focus: f,
    scale: 0.8 + 0.2 * f,
    opacity,
    dim: 1 - f,
    /** 3D: off-centre cards turn in toward the spotlight (degrees) and sit back in depth (px) */
    turn: -Math.sign(d) * 18 * smooth(a),
    depth: -140 * smooth(a / 1.5),
    /** the photo wipes in as the card is hauled up to the spotlight (0 = hidden, 1 = shown) */
    reveal: smooth((1.25 - d) / 0.95),
  };
}

/** Where the centred card sits (px): the middle of the screen, but never under the hands. */
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

// ── The winch ──
/**
 * The machine hauling the rope: a geared drum, seen side-on, in its own 240 x 300 unit box. The rope comes off
 * the top of the coil wound on the drum and runs right to the cards; as rope is hauled in the drum turns and
 * the coil thickens. A pawl rides the ratchet teeth on the flange.
 */
export const WINCH = {
  w: 240,
  h: 300,
  /** drum centre */
  cx: 120,
  cy: 118,
  /** coil radius: bare drum (nothing hauled) → full haul */
  coil0: 46,
  coil1: 72,
  /** ratchet teeth on the flange */
  teeth: 36,
  /** rope thickness in winch units */
  rope: 15,
  /** where the rope line sits (winch units from the top): the top of a half-wound coil */
  ropeY: 118 - 59,
};

/**
 * Winch state for `hauled` px of rope in (of `total`), with `scale` px per winch unit: the drum angle (degrees)
 * follows the rope exactly (arc length = rope hauled), the coil radius grows with the haul, and the pawl lifts
 * as each tooth passes under it, then drops (the click).
 */
export function winchAt(hauled: number, total: number, scale: number) {
  const f = total > 0 ? clamp01(hauled / total) : 0;
  const coil = WINCH.coil0 + (WINCH.coil1 - WINCH.coil0) * f;
  // integrate rope over the growing radius: angle = ∫ dh / r(h), exact for a linear r(h)
  const dr = (WINCH.coil1 - WINCH.coil0) * scale;
  const r0 = WINCH.coil0 * scale;
  const rad = dr > 1e-9 && total > 0 ? (total / dr) * Math.log((r0 + dr * f) / r0) : r0 > 0 ? hauled / r0 : 0;
  const angle = (rad * 180) / Math.PI;
  const step = 360 / WINCH.teeth;
  const phase = ((angle % step) + step) % step / step; // 0 → 1 as a tooth passes
  return { angle, coil, pawl: phase < 0.85 ? phase / 0.85 : 1 - (phase - 0.85) / 0.15 };
}

/** The haul's live state, shared by the per-frame loop (written every frame, no React state). */
export type RopeRig = {
  /** seconds into the haul (smoothed toward `goal`, which the scroll position sets) */
  t: number;
  goal: number;
  /** reduced motion: everything is already in place */
  reduced: boolean;
  /** total rope to haul (px), from the layout */
  total: number;
};

export const createRopeRig = (): RopeRig => ({ t: 0, goal: 0, reduced: false, total: 1 });

/** Hands drive + rope tension right now. */
export function rigState(rig: RopeRig): PullState {
  if (rig.reduced) return { hauled: rig.total, tension: 0.5, drive: 0.32, done: true };
  return pullAt(rig.t, rig.total);
}

// ── The athlete ──
/**
 * Hand-over-hand haul, one stroke per card. On each drive one hand (alternating, right first) pulls the rope from
 * out in front back to the hip while the other slides forward along it to re-grip; in the rest both hands hold.
 * Hand positions run 0 (out in front) → 1 (back at the hip). `lean` (0..1) is how far he hangs back on the rope,
 * `sit` (0..1) how deep he sinks into his legs, `grip` (0..1) how tightly each fist is closed.
 */
export type HaulPose = { right: number; left: number; lean: number; sit: number; gripR: number; gripL: number };

export function haulPose(t: number): HaulPose {
  if (t < 0) return { right: 0, left: 0.85, lean: 0, sit: 0, gripR: 0.6, gripL: 0.6 };
  if (t < PULL.prelude) {
    // take the grip and settle down into the stance
    const k = smooth(t / PULL.prelude);
    return { right: 0, left: 0.85 + 0.15 * k, lean: 0.35 * k, sit: 0.4 * k, gripR: 0.6 + 0.4 * k, gripL: 0.6 + 0.4 * k };
  }
  const s = t - PULL.prelude;
  const k = Math.min(PULL.strokes - 1, Math.floor(s / PULL.stroke));
  const u = Math.min(1, (s - k * PULL.stroke) / PULL.stroke);
  let pull: number; // the hand driving this stroke
  let slide: number; // the other hand, travelling forward
  let effort: number;
  let open = 0;
  if (u < PULL.drive) {
    const x = u / PULL.drive;
    pull = drivePower(x);
    slide = 1 - smooth(x);
    effort = 0.35 + 0.65 * smooth(x);
    open = Math.sin(Math.PI * x) * 0.75; // the sliding hand loosens to run along the rope
  } else {
    const x = (u - PULL.drive) / (1 - PULL.drive);
    pull = 1;
    slide = 0;
    effort = 1 - 0.65 * smooth(x);
  }
  const rightPulls = k % 2 === 0;
  return {
    right: rightPulls ? pull : slide,
    left: rightPulls ? slide : pull,
    lean: effort,
    sit: 0.4 + 0.6 * effort,
    gripR: rightPulls ? 1 : 1 - open,
    gripL: rightPulls ? 1 - open : 1,
  };
}

/** Where the athlete's hands and the rope's tail are on screen (written by the 3D view every frame). */
export type HandMarks = {
  ready: boolean;
  front: RopePoint;
  back: RopePoint;
  /** where the hauled rope meets the floor behind him, and the floor line */
  tail: RopePoint;
  /** the rope height at rest (card connectors hang on this line) */
  restY: number;
};
export const createHandMarks = (): HandMarks => ({
  ready: false,
  front: { x: 0, y: 0 },
  back: { x: 0, y: 0 },
  tail: { x: 0, y: 0 },
  restY: 0,
});
