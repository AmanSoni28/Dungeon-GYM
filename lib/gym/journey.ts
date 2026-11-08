// Scroll choreography of the "step inside the real gym" section. Pure + unit tested.
//
//   progress 0 ─ entry ─ 0.08 ─ explore ─ 0.48 ─ reveal ─ 0.66 ─ fly ─ 1
//   entry:   golden light from the gate fades, camera settles from a push-in
//   explore: one full 360° turn of the real gym (drag to look around)
//   reveal:  the gym dims, a spotlight finds an athlete on the bench press; the camera zooms in
//   fly:     the camera dives over the bench and threads the gap between his chest and the bar,
//            past his head, and fades into the next homepage section

import type { LookLimits } from "./look";

export const JOURNEY = { entryEnd: 0.08, exploreEnd: 0.48, revealEnd: 0.66 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

export function journeyPhases(p: number) {
  const x = clamp01(p);
  return {
    entry: clamp01(x / JOURNEY.entryEnd),
    explore: clamp01((x - JOURNEY.entryEnd) / (JOURNEY.exploreEnd - JOURNEY.entryEnd)),
    reveal: clamp01((x - JOURNEY.exploreEnd) / (JOURNEY.revealEnd - JOURNEY.exploreEnd)),
    fly: clamp01((x - JOURNEY.revealEnd) / (1 - JOURNEY.revealEnd)),
  };
}

/** Scroll-driven yaw: a slow sweep across the photo while exploring (left → right). */
export function scrollYaw(explore: number, l: LookLimits) {
  if (l.wrap) return -ease(clamp01(explore)) * Math.PI * 2; // one full turn: the whole 360°
  const span = Math.min(l.yawMax, -l.yawMin) * 0.85;
  return span - ease(clamp01(explore)) * span * 2; // +span (left) → −span (right)
}

/** Visual parameters for a given section progress. */
export function journeyVisuals(p: number) {
  const { entry, reveal, fly } = journeyPhases(p);
  const fade = ease(clamp01((fly - 0.8) / 0.2));
  return {
    /** golden light carried over from the gate, fades out on entry */
    light: 1 - ease(entry),
    /** zoom (multiplies the FOV): pushed-in on entry, pushing in on the athlete during the reveal */
    fovScale: (1 - 0.18 * (1 - ease(entry))) * (1 - 0.3 * ease(reveal)) * (1 - 0.3 * ease(fly)),
    /** the bench-press stage: dims the gym and lights the athlete (0..1) */
    reveal: ease(reveal),
    /** camera flight through the bench (0..1) */
    fly,
    blur: (1 - ease(entry)) * 6 + ease(clamp01((fly - 0.7) / 0.3)) * 8,
    /** final fade to the page background */
    fade,
    /** brightness of the real-gym panorama: dims for the spotlight, then goes dark */
    gym: (1 - 0.72 * ease(reveal)) * (1 - fade),
    /** UI overlays of the 360° (title, hint, meter) */
    ui: clamp01(entry * 1.4) * (1 - clamp01(reveal * 2.5)),
    /** "Enter Dungeon": late in the 360°, gone before the bench appears */
    prompt: clamp01((p - 0.32) / 0.07) * (1 - clamp01((p - JOURNEY.exploreEnd + 0.01) / 0.05)),
    /** bench-press caption: rises with the spotlight, clears as the camera dives */
    caption: ease(clamp01((reveal - 0.3) / 0.45)) * (1 - ease(clamp01(fly / 0.16))),
    /** speed rush vignette while threading the bar */
    rush: Math.sin(Math.PI * clamp01((fly - 0.25) / 0.55)),
  };
}
