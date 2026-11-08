// The bench-press finale of the real-gym 360°: an athlete pressing on a flat bench, then a camera
// fly-through that threads the gap between his chest and the locked-out bar. Pure maths (unit tested).
//
// World layout (camera starts at the origin, looking down −Z; the panorama sphere has radius 10):
//   the athlete lies on his back, feet toward the camera, head away (−Z).

import * as THREE from "three";
import { RIG } from "@/lib/intro/choreography";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

export const BENCH = {
  floorY: -1.45,
  /** top of the bench pad */
  padY: -1.0,
  /** athlete root (hips) – resting on the pad */
  rootY: -0.85,
  rootZ: -2.9,
  /** shoulder joint height and depth in the athlete's body frame (body y → world −z, body z → world +y) */
  shoulderBodyY: RIG.spineBase + RIG.shoulderY,
  shoulderBodyZ: -0.01,
  /** bar sits over the lower chest: hand target slightly below the shoulder line (body y) */
  barBodyDy: -0.06,
  /** front of the chest (pecs) in body z */
  chestFrontZ: 0.17,
};

/** upper arm and forearm (to the centre of the hand) */
export const ARM = { l1: RIG.upperArm, l2: RIG.forearm + RIG.hand / 2 };

/** distance of the bar above the shoulder joint: on the chest → locked out */
export const REACH = { bottom: 0.24, top: ARM.l1 + ARM.l2 - 0.015 };

/**
 * Two-bone arm IK in the shoulder's local y–z plane (y = toward the hips/head axis, z = in front of the chest).
 * Returns the shoulder flexion and elbow rotations (radians, about local X) for the hand to reach (ty, tz).
 * Elbows bend back toward the bench, as in a real press.
 */
export function armIK(ty: number, tz: number) {
  const { l1, l2 } = ARM;
  const L = Math.min(Math.hypot(ty, tz), l1 + l2 - 1e-4);
  const aim = Math.atan2(-tz, -ty);
  const alpha = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L))));
  const beta = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2))));
  return { shoulder: aim + alpha, elbow: -(Math.PI - beta) };
}

/** Forward kinematics matching armIK (for tests): hand position in shoulder space. */
export function armFK(shoulder: number, elbow: number) {
  const { l1, l2 } = ARM;
  return {
    y: -l1 * Math.cos(shoulder) - l2 * Math.cos(shoulder + elbow),
    z: -l1 * Math.sin(shoulder) - l2 * Math.sin(shoulder + elbow),
  };
}

/** bar height above the shoulder for press amount q (0 = bar on the chest, 1 = locked out) */
export const pressReach = (q: number) => REACH.bottom + (REACH.top - REACH.bottom) * clamp01(q);

/**
 * One rep every 3.2 s with real tempo: hold at the top, slow controlled descent,
 * a beat on the chest, then an explosive press.  Returns 0..1 (1 = locked out).
 */
export function repPress(time: number) {
  const T = 3.2;
  const t = ((time % T) + T) % T;
  if (t < 0.6) return 1; // lockout
  if (t < 2.1) return 1 - smooth((t - 0.6) / 1.5); // eccentric
  if (t < 2.35) return 0; // touch
  const u = clamp01((t - 2.35) / 0.85);
  return 1 - Math.pow(1 - u, 3); // drive
}

/** Where the bar is (world) when locked out: the camera threads the gap under it. */
export function lockoutBarY() {
  return BENCH.rootY + BENCH.shoulderBodyZ + Math.sqrt(REACH.top ** 2 - BENCH.barBodyDy ** 2);
}
export const chestFrontY = () => BENCH.rootY + BENCH.chestFrontZ;
/** world z of the bar / the chest under it */
export const barZ = () => BENCH.rootZ - (BENCH.shoulderBodyY + BENCH.barBodyDy);
/** world z of the head */
export const headZ = () => BENCH.rootZ - (RIG.spineBase + 0.6 + 0.17);

/** the middle of the chest–bar gap */
export const gapY = () => (chestFrontY() + lockoutBarY()) / 2;

/** what the camera frames during the reveal (the chest under the bar) */
export const FOCUS = new THREE.Vector3(0, BENCH.rootY + 0.2, barZ() + 0.15);

/** downward tilt (radians, negative) from the origin to the focus point */
export const revealPitch = () => Math.atan2(FOCUS.y, -FOCUS.z);

/** Camera flight: from the panorama centre, over the knees, under the bar, past the head. */
export function createFlyPath() {
  const g = gapY();
  const bz = barZ();
  const hz = headZ();
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.3, -0.2, -1.2),
      new THREE.Vector3(0.07, g + 0.1, BENCH.rootZ + 0.65),
      new THREE.Vector3(0, g + 0.01, bz + 0.45),
      new THREE.Vector3(0, g, bz),
      new THREE.Vector3(0, g + 0.04, hz - 0.45),
      new THREE.Vector3(0, g + 0.18, hz - 1.9),
    ],
    false,
    "centripetal"
  );
}

/** arc-length fraction (0..1) of the path where it passes under the bar */
export function passFraction(path: THREE.CatmullRomCurve3, samples = 400) {
  const bz = barZ();
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const d = Math.abs(path.getPointAt(u).z - bz);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

/**
 * Scroll (0..1) → position along the path (0..1): eases out of the start, lingers a moment
 * right under the bar (the money shot), then accelerates away.
 */
export function flyParam(f: number, pass: number) {
  const N = 240;
  let total = 0;
  const w = (u: number) => 1 + 2.2 * Math.exp(-(((u - pass) / 0.07) ** 2)) + 1.6 * Math.exp(-((u / 0.12) ** 2));
  const cum: number[] = [0];
  for (let i = 1; i <= N; i++) {
    total += w((i - 0.5) / N) / N;
    cum.push(total);
  }
  const goal = clamp01(f) * total;
  let i = 1;
  while (i < N && cum[i] < goal) i++;
  const span = cum[i] - cum[i - 1];
  return clamp01((i - 1 + (span > 0 ? (goal - cum[i - 1]) / span : 0)) / N);
}

/** FOV (degrees) along the flight: a dolly-zoom that opens wide as the bar rushes overhead, then settles. */
export function flyFov(u: number, pass: number, start: number) {
  const open = smooth(u / pass);
  const settle = smooth((u - pass) / (1 - pass));
  return start + (82 - start) * open - (82 - 62) * settle;
}

/** cinematic bank (radians): a gentle dutch roll into the dive, level under the bar */
export function flyRoll(u: number, pass: number) {
  return Math.sin(Math.PI * clamp01(u / pass)) * -0.14 + Math.sin(Math.PI * clamp01((u - pass) / (1 - pass))) * 0.06;
}
