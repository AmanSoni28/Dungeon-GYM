// Scroll choreography of the "step inside the real gym" section. Pure + unit tested.
//
//   progress 0 ─ entry ─ 0.1 ─ explore ─ 0.85 ─ outro ─ 1
//   entry:   golden light from the gate fades, camera settles from a push-in
//   explore: one full 360° turn of the real gym (drag to look around)
//   outro:   the camera eases forward, blurs and fades into the next homepage section

import type { LookLimits } from "./look";

export const JOURNEY = { entryEnd: 0.1, exploreEnd: 0.85 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

export function journeyPhases(p: number) {
  const x = clamp01(p);
  return {
    entry: clamp01(x / JOURNEY.entryEnd),
    explore: clamp01((x - JOURNEY.entryEnd) / (JOURNEY.exploreEnd - JOURNEY.entryEnd)),
    outro: clamp01((x - JOURNEY.exploreEnd) / (1 - JOURNEY.exploreEnd)),
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
  const { entry, outro } = journeyPhases(p);
  const fade = ease(clamp01((outro - 0.35) / 0.65));
  return {
    /** golden light carried over from the gate, fades out on entry */
    light: 1 - ease(entry),
    /** zoom (multiplies the FOV): pushed-in on entry, then a gentle push forward on the way out */
    fovScale: (1 - 0.18 * (1 - ease(entry))) * (1 - 0.15 * ease(outro)),
    blur: (1 - ease(entry)) * 6 + ease(clamp01((outro - 0.3) / 0.7)) * 8,
    /** final fade to the page background */
    fade,
    /** brightness of the real-gym panorama: goes dark as the section hands over */
    gym: 1 - fade,
    /** UI overlays of the 360° (title, hint, meter) */
    ui: clamp01(entry * 1.4) * (1 - clamp01(outro * 2.5)),
    /** "Enter Dungeon": late in the 360°, stays up until the fade takes over */
    prompt: clamp01((p - 0.55) / 0.08) * (1 - fade),
  };
}
