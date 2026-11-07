// Scroll choreography of the "step inside the real gym" section. Pure + unit tested.
//
//   progress 0 ─ entry ─ 0.14 ─ explore ─ 0.70 ─ exit ─ 1
//   entry:   golden light from the gate fades, camera settles from a push-in
//   explore: visitor looks around (drag), scroll also pans gently across the photo
//   exit:    camera moves forward, zoom + blur + fade into the next homepage section

import type { LookLimits } from "./look";

export const JOURNEY = { entryEnd: 0.14, exploreEnd: 0.7 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

export function journeyPhases(p: number) {
  const x = clamp01(p);
  return {
    entry: clamp01(x / JOURNEY.entryEnd),
    explore: clamp01((x - JOURNEY.entryEnd) / (JOURNEY.exploreEnd - JOURNEY.entryEnd)),
    exit: clamp01((x - JOURNEY.exploreEnd) / (1 - JOURNEY.exploreEnd)),
  };
}

/** Scroll-driven yaw: a slow sweep across the photo while exploring (left → right). */
export function scrollYaw(explore: number, l: LookLimits) {
  if (l.wrap) return -ease(clamp01(explore)) * Math.PI * 1.2;
  const span = Math.min(l.yawMax, -l.yawMin) * 0.85;
  return span - ease(clamp01(explore)) * span * 2; // +span (left) → −span (right)
}

/** Visual parameters for a given section progress. */
export function journeyVisuals(p: number) {
  const { entry, exit } = journeyPhases(p);
  return {
    /** golden light carried over from the gate, fades out on entry */
    light: 1 - ease(entry),
    /** extra zoom: pushed-in on entry, pushing forward on exit (multiplies the FOV) */
    fovScale: (1 - 0.18 * (1 - ease(entry))) * (1 - 0.45 * ease(exit)),
    /** camera dolly toward the photo on exit (scene units) */
    dolly: ease(exit) * 4.5,
    blur: ease(exit) * 14 + (1 - ease(entry)) * 6,
    /** final fade to the page background */
    fade: ease(clamp01((exit - 0.35) / 0.65)),
    /** UI overlays */
    ui: clamp01(entry * 1.4) * (1 - clamp01(exit * 3)),
    /** "Enter Dungeon": fully up from 0.55 until the camera is well into its forward move */
    prompt: clamp01((p - 0.45) / 0.1) * (1 - clamp01((p - 0.8) / 0.08)),
  };
}
