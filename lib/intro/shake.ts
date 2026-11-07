// "Trauma" based camera shake (as used in many AAA games):
// intensity = trauma², offsets come from smooth layered noise, trauma decays over time.

export type ShakeOffset = { x: number; y: number; roll: number };
export type ShakeLimits = { pos: number; roll: number };

export const SHAKE_LIMITS: ShakeLimits = { pos: 0.14, roll: 0.035 };

// smooth pseudo-noise in [-1, 1] built from incommensurate sines
function noise(t: number, seed: number) {
  return (Math.sin(t * 31.7 + seed) * 0.5 + Math.sin(t * 57.3 + seed * 2.1) * 0.3 + Math.sin(t * 89.1 + seed * 3.7) * 0.2);
}

export function shakeOffset(trauma: number, t: number, limits: ShakeLimits = SHAKE_LIMITS): ShakeOffset {
  const tr = Math.min(1, Math.max(0, trauma));
  const amt = tr * tr;
  if (amt === 0) return { x: 0, y: 0, roll: 0 };
  return {
    x: limits.pos * amt * noise(t, 1.3),
    y: limits.pos * amt * noise(t, 4.7),
    roll: limits.roll * amt * noise(t, 9.1),
  };
}

export function addTrauma(trauma: number, amount: number) {
  return Math.min(1, Math.max(0, trauma + amount));
}

export function decayTrauma(trauma: number, dt: number, rate = 1.4) {
  return Math.max(0, trauma - rate * dt);
}
