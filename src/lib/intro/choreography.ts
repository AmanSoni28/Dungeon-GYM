// Athlete choreography: rig dimensions, key poses and the beat sheet for the lift-and-throw.
// Angles are radians. Sign conventions (rotation about X, athlete faces +Z / the camera):
//   spine/pelvis/neck  +  = lean forward          armFlex  -  = raise arm forward/up (−π = overhead)
//   legHip             -  = thigh forward          knee     +  = bend knee
//   elbow              -  = bend elbow             armAbd   +  = arm out to the side

export const RIG = {
  hipOffset: 0.05,
  thigh: 0.45,
  shin: 0.44,
  ankle: 0.06,
  spineBase: 0.1,
  shoulderX: 0.25,
  shoulderY: 0.5,
  upperArm: 0.33,
  forearm: 0.3,
  hand: 0.08,
};

export type Pose = {
  pelvis: number;
  spine: number;
  neck: number;
  legHip: number;
  knee: number;
  armFlex: number;
  armAbd: number;
  elbow: number;
};

export type PoseName = "stand" | "dip" | "pull" | "pressDip" | "overhead" | "windup" | "throw" | "follow" | "recover";

export const POSES: Record<PoseName, Pose> = {
  stand: { pelvis: 0, spine: 0.02, neck: 0.04, legHip: -0.04, knee: 0.08, armFlex: -0.28, armAbd: 0.1, elbow: -0.05 },
  dip: { pelvis: 0.15, spine: 0.3, neck: 0.1, legHip: -0.55, knee: 0.95, armFlex: -0.12, armAbd: 0.1, elbow: -0.02 },
  pull: { pelvis: -0.05, spine: -0.08, neck: -0.05, legHip: -0.12, knee: 0.2, armFlex: -0.75, armAbd: 0.32, elbow: -2.3 },
  pressDip: { pelvis: 0.05, spine: 0.02, neck: 0, legHip: -0.3, knee: 0.55, armFlex: -0.85, armAbd: 0.3, elbow: -2.25 },
  overhead: { pelvis: -0.02, spine: -0.06, neck: -0.08, legHip: -0.06, knee: 0.1, armFlex: -2.95, armAbd: 0.32, elbow: -0.15 },
  windup: { pelvis: -0.06, spine: -0.22, neck: -0.15, legHip: -0.02, knee: 0.12, armFlex: -3.25, armAbd: 0.3, elbow: -0.35 },
  throw: { pelvis: 0.25, spine: 0.5, neck: 0.15, legHip: -0.55, knee: 0.75, armFlex: -1.2, armAbd: 0.22, elbow: -0.05 },
  follow: { pelvis: 0.2, spine: 0.45, neck: 0.25, legHip: -0.45, knee: 0.6, armFlex: -0.6, armAbd: 0.2, elbow: -0.1 },
  recover: { pelvis: 0, spine: 0.04, neck: 0.3, legHip: -0.06, knee: 0.1, armFlex: -0.1, armAbd: 0.32, elbow: -0.45 },
};

export type Beat = { pose: PoseName; at: number; dur: number; ease: string };

/** Beat sheet (seconds on the GSAP timeline, which itself is time-scaled for slow motion). */
export const BEATS: Beat[] = [
  { pose: "dip", at: 1.0, dur: 0.5, ease: "power2.inOut" },
  { pose: "pull", at: 1.5, dur: 0.32, ease: "power3.out" },
  { pose: "pressDip", at: 1.86, dur: 0.18, ease: "power2.in" },
  { pose: "overhead", at: 2.06, dur: 0.32, ease: "power3.out" },
  { pose: "windup", at: 2.6, dur: 0.32, ease: "sine.inOut" },
  { pose: "throw", at: 2.95, dur: 0.32, ease: "power2.in" },
  { pose: "follow", at: 3.27, dur: 0.3, ease: "power2.out" },
  { pose: "recover", at: 3.75, dur: 0.9, ease: "power2.inOut" },
];

/** The barbell leaves the hands part-way through the throw. */
export const RELEASE_AT = 3.19;

/** Scripted launch velocity + spin at release (m/s, rad/s): forward and down, onto the floor. */
export const RELEASE_VELOCITY = { x: 0, y: -0.3, z: 2.6 };
export const RELEASE_SPIN = 7;

/** Height of hips + forward offset needed to keep the feet planted for a given leg pose. */
export function legIK(p: Pick<Pose, "pelvis" | "legHip" | "knee">) {
  const thighAngle = p.pelvis + p.legHip;
  const shinAngle = thighAngle + p.knee;
  const hipY =
    RIG.ankle + RIG.thigh * Math.cos(thighAngle) + RIG.shin * Math.cos(shinAngle) + RIG.hipOffset * Math.cos(p.pelvis);
  const hipZ = RIG.thigh * Math.sin(thighAngle) + RIG.shin * Math.sin(shinAngle) + RIG.hipOffset * Math.sin(p.pelvis);
  return { hipY, hipZ, footPitch: -shinAngle };
}

/** World-space foot position (relative to the root) that legIK produces: should stay at (y=ankle, z=0). */
export function footPosition(p: Pick<Pose, "pelvis" | "legHip" | "knee">) {
  const { hipY, hipZ } = legIK(p);
  const t = p.pelvis + p.legHip;
  const s = t + p.knee;
  const y = hipY - RIG.hipOffset * Math.cos(p.pelvis) - RIG.thigh * Math.cos(t) - RIG.shin * Math.cos(s);
  const z = hipZ - RIG.hipOffset * Math.sin(p.pelvis) - RIG.thigh * Math.sin(t) - RIG.shin * Math.sin(s);
  return { y, z };
}

export function timelineDuration() {
  return Math.max(...BEATS.map((b) => b.at + b.dur));
}
