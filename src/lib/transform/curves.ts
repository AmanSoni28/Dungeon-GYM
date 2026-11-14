import { clamp } from "@/lib/utils";

export type Metrics = { weight: number; fat: number; strength: number };

/**
 * How far along a change is at time t (0..1). Losses come fast early and then plateau (water and
 * easy fat go first); gains build steadily and keep coming.
 */
export function progress(from: number, to: number, t: number) {
  const x = clamp(t);
  if (to < from) {
    const k = 2.2;
    return (1 - Math.exp(-k * x)) / (1 - Math.exp(-k));
  }
  return 1 - Math.pow(1 - x, 1.6);
}

export const metricAt = (from: number, to: number, t: number) => from + (to - from) * progress(from, to, t);

export const metricsAt = (a: Metrics, b: Metrics, t: number): Metrics => ({
  weight: metricAt(a.weight, b.weight, t),
  fat: metricAt(a.fat, b.fat, t),
  strength: metricAt(a.strength, b.strength, t),
});

/**
 * Body shape the 3D athlete is morphed to for a set of metrics.
 * `fat` 0 = lean, 1 = heavy (≈32% body fat). `muscle` −1 = slight, 0 = average, 1 = built.
 */
export function shapeFor(m: Metrics) {
  return {
    fat: clamp((m.fat - 14) / 18, 0, 1.1),
    muscle: clamp((m.strength - 50) / 50, -0.8, 1),
  };
}

/** Whole month reached at t for a story `months` long. */
export const monthAt = (t: number, months: number) => Math.round(clamp(t) * months);

/** The latest milestone reached by `month`. */
export function milestoneAt<M extends { month: number }>(milestones: readonly M[], month: number): M {
  let cur = milestones[0];
  for (const m of milestones) if (m.month <= month) cur = m;
  return cur;
}
