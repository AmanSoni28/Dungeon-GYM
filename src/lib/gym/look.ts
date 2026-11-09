// Look-around maths for the real-gym viewer. Pure functions (unit tested).
//
// Two kinds of source imagery:
//  • "photo"    – a single wide photo. It is projected on a curved screen covering exactly the
//                 photo's real field of view, and the camera may only look where the photo has
//                 content (nothing is invented beyond its edges).
//  • "equirect" – a true 360° panorama (2:1 equirectangular). Full horizontal rotation.

export type GymView = {
  id: string;
  label: string;
  src: string;
  kind: "photo" | "equirect";
  /** horizontal field of view the photo actually captured, degrees (photo only) */
  hfov: number;
  /** image width / height */
  aspect: number;
  /** resting tilt in degrees (negative = look down toward the floor); clamped to what the photo shows */
  pitch?: number;
  /** equirect only: camera vertical FOV in degrees (default 55) */
  fov?: number;
  /** equirect only: how far the camera may tilt up/down, degrees (default: nearly to the poles) */
  maxPitch?: number;
};

export type LookLimits = {
  wrap: boolean;
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
};

export const DEG = Math.PI / 180;
/** radius of the curved photo screen (scene units) */
export const SCREEN_RADIUS = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Vertical angle covered by a photo projected on the cylinder (radians). */
export function photoVerticalCoverage(view: GymView) {
  const hfov = view.hfov * DEG;
  const arc = SCREEN_RADIUS * hfov;
  const height = arc / view.aspect;
  return 2 * Math.atan(height / 2 / SCREEN_RADIUS);
}

/** Horizontal FOV of a perspective camera given its vertical FOV and aspect (radians). */
export function horizontalFov(vfov: number, aspect: number) {
  return 2 * Math.atan(Math.tan(vfov / 2) * aspect);
}

/** Vertical FOV for a camera with the given horizontal FOV (radians). */
export function verticalFovFor(hfov: number, aspect: number) {
  return 2 * Math.atan(Math.tan(hfov / 2) / aspect);
}

/**
 * Pick a camera vertical FOV (radians) that never shows past the photo's edges:
 * at most `preferred`, and small enough that the view fits inside the photo with headroom to look around.
 */
export function fitCameraFov(view: GymView, aspect: number, preferred = 55 * DEG, lookRoom = 0.78) {
  if (view.kind === "equirect") return view.fov ? view.fov * DEG : preferred;
  const maxV = photoVerticalCoverage(view) * lookRoom;
  const maxVFromH = verticalFovFor(view.hfov * DEG * lookRoom, aspect);
  return Math.min(preferred, maxV, maxVFromH);
}

/** How far the camera may turn without revealing anything outside the photo. */
export function lookLimits(view: GymView, cameraVFov: number, aspect: number, margin = 1.5 * DEG): LookLimits {
  if (view.kind === "equirect") {
    let p = Math.min(1.25, Math.PI / 2 - cameraVFov / 2 - 0.05);
    if (view.maxPitch !== undefined) p = Math.min(p, view.maxPitch * DEG);
    return { wrap: true, yawMin: -Infinity, yawMax: Infinity, pitchMin: -p, pitchMax: p };
  }
  const halfH = (view.hfov * DEG) / 2;
  const halfV = photoVerticalCoverage(view) / 2;
  const camHalfH = horizontalFov(cameraVFov, aspect) / 2;
  const camHalfV = cameraVFov / 2;
  const y = Math.max(0, halfH - camHalfH - margin);
  const p = Math.max(0, halfV - camHalfV - margin);
  return { wrap: false, yawMin: -y, yawMax: y, pitchMin: -p, pitchMax: p };
}

export function clampLook(yaw: number, pitch: number, l: LookLimits) {
  return {
    yaw: l.wrap ? yaw : clamp(yaw, l.yawMin, l.yawMax),
    pitch: clamp(pitch, l.pitchMin, l.pitchMax),
  };
}

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** 0..1 position of the view across the photo (0 = left edge view, 1 = right edge view). */
export function viewPosition(yaw: number, l: LookLimits) {
  if (l.wrap) {
    const t = (-yaw / (Math.PI * 2)) % 1;
    return t < 0 ? t + 1 : t;
  }
  if (l.yawMax - l.yawMin < 1e-6) return 0.5;
  // positive yaw turns left in three.js, so invert for a natural left→right indicator
  return (l.yawMax - yaw) / (l.yawMax - l.yawMin);
}

/** Tracks which share of the available view range has been seen (0..1), for the explore meter. */
export function createExploreTracker(buckets = 24) {
  const seen = new Array<boolean>(buckets).fill(false);
  return {
    visit(position: number) {
      const i = Math.min(buckets - 1, Math.max(0, Math.floor(position * buckets)));
      seen[i] = true;
      return seen.filter(Boolean).length / buckets;
    },
    get explored() {
      return seen.filter(Boolean).length / buckets;
    },
  };
}
