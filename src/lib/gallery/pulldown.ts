// "Lat pulldown" gallery. Pure + deterministic (unit tested).
//
// A cable machine: a selectorised weight stack on the left, a lat-pulldown bar above a big photo frame.
// One rep per photo, scrubbed by the visitor's scroll:
//   return: the bar rides back up, the stack lowers and lands, the selector pin hops one plate down
//   pull:   the bar is hauled down, dragging the next photo over the frame like a blind,
//           while the cable lifts the stack (one plate heavier each rep: progressive overload)
//   hold:   the photo rests in the frame
//
//   0 ── rep 0 ── rep 1 ── … ── rep n−1 ── (rest)

export const REP = {
  /** share of each rep (time units = 1 per rep) */
  ret: 0.34,
  pull: 0.42,
  /** plates in the stack: one per photo */
  kgPerPlate: 10,
};

/** a beat of rest after the last photo */
export const REST = 0.35;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
/** a strong pull: explosive off the top, decelerating into the bottom */
const power = (x: number) => 1 - Math.pow(1 - clamp01(x), 2.2);

export type RepState = {
  /** index of the photo on the bar right now (−1 before the first rep) */
  rep: number;
  /** bar height: 0 = up at the top pulley, 1 = pulled all the way down */
  bar: number;
  /** stack lift (0 = resting on the base, 1 = full lift); tied to the bar by the cable */
  lift: number;
  /** selector pin position (plate index, fractional while it hops) */
  pin: number;
  /** how far each photo has been pulled down over the frame (0..1) */
  reveal: number[];
};

/** State of the machine `t` reps into the set, for `n` photos. */
export function repAt(t: number, n: number): RepState {
  const reveal = new Array<number>(n).fill(0);
  if (n <= 0) return { rep: -1, bar: 0, lift: 0, pin: 0, reveal };
  if (t <= 0) return { rep: -1, bar: 0, lift: 0, pin: 0, reveal };
  const k = Math.min(n - 1, Math.floor(t));
  const u = t >= n ? 1 : t - k;
  for (let j = 0; j < k; j++) reveal[j] = 1;

  let bar: number;
  let pin = k;
  if (u < REP.ret) {
    // the bar rides back up (the previous rep left it at the bottom); the stack lowers onto the base
    const x = u / REP.ret;
    bar = k === 0 ? 0 : 1 - smooth(x);
    // the pin hops one plate down once the stack has landed
    pin = k === 0 ? 0 : k - 1 + smooth((x - 0.85) / 0.15);
  } else if (u < REP.ret + REP.pull) {
    bar = power((u - REP.ret) / REP.pull);
    reveal[k] = bar;
  } else {
    bar = 1;
    reveal[k] = 1;
  }
  return { rep: k, bar, lift: bar, pin, reveal };
}

/** Scroll progress (0..1 of the pinned section) → reps into the set. */
export const scrollToReps = (p: number, n: number) => clamp01(p) * (n + REST);

/** Scroll progress at which photo k has just been pulled fully into the frame. */
export const progressForPhoto = (k: number, n: number) => clamp01((k + REP.ret + REP.pull + 0.04) / (n + REST));

/** Load on the cable for the current rep (kg). */
export const loadKg = (pin: number) => (Math.round(pin) + 1) * REP.kgPerPlate;

/** Does plate `i` ride up with the stack? (the pin carries every plate above and including it) */
export const plateLifted = (i: number, pin: number) => i <= Math.round(pin);

/** Photo layer look while it is pulled down: wipes in from the top, settling out of a slow zoom. */
export function photoLook(r: number) {
  const x = clamp01(r);
  return { clipBottom: (1 - x) * 100, scale: 1.14 - 0.14 * smooth(x), caption: smooth((x - 0.55) / 0.45) };
}

/** Pulley spin (radians) for a given cable travel (px) and pulley radius (px). */
export const pulleyTurn = (travel: number, radius: number) => (radius > 0 ? travel / radius : 0);
