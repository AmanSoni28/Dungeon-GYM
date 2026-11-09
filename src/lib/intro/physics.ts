// Lightweight rigid-body sim for a thrown barbell: gravity, floor bounce, rolling friction.
// Pure + deterministic so it can be unit tested and driven by a time-scaled clock (slow motion).

export type BarState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** roll angle about the bar's long axis (radians) */
  roll: number;
  /** angular velocity about the long axis (rad/s) */
  spin: number;
  grounded: boolean;
  resting: boolean;
};

export type BarConfig = {
  plateRadius: number;
  gravity: number;
  restitution: number;
  /** horizontal speed kept after each floor impact */
  impactFriction: number;
  /** rolling deceleration on the floor (m/s²) */
  rollingFriction: number;
  /** minimum vertical speed that counts as an impact (and bounces) */
  impactThreshold: number;
  restSpeed: number;
};

export type Impact = { speed: number; x: number; z: number };

export const BAR_CONFIG: BarConfig = {
  plateRadius: 0.225, // Olympic bumper plate, 45 cm
  gravity: 9.81,
  restitution: 0.32,
  impactFriction: 0.55,
  rollingFriction: 2.5,
  impactThreshold: 0.6,
  restSpeed: 0.04,
};

export function createBar(
  pos: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  spin = 0
): BarState {
  return { x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, roll: 0, spin, grounded: false, resting: false };
}

const SUBSTEP = 1 / 240;

/** Advance the bar by dt seconds. Returns the new state and every floor impact that occurred. */
export function stepBar(prev: BarState, dt: number, cfg: BarConfig = BAR_CONFIG): { state: BarState; impacts: Impact[] } {
  const s: BarState = { ...prev };
  const impacts: Impact[] = [];
  if (s.resting || dt <= 0) return { state: s, impacts };

  let remaining = Math.min(dt, 0.1);
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;

    if (!s.grounded) {
      s.vy -= cfg.gravity * h;
      s.x += s.vx * h;
      s.y += s.vy * h;
      s.z += s.vz * h;
      s.roll += s.spin * h;

      if (s.y <= cfg.plateRadius) {
        s.y = cfg.plateRadius;
        const speed = -s.vy;
        if (speed >= cfg.impactThreshold) {
          impacts.push({ speed, x: s.x, z: s.z });
          s.vy = speed * cfg.restitution;
          s.vx *= cfg.impactFriction;
          s.vz *= cfg.impactFriction;
          if (s.vy < cfg.impactThreshold) {
            s.vy = 0;
            s.grounded = true;
          }
        } else {
          s.vy = 0;
          s.grounded = true;
        }
      }
    } else {
      // rolling without slipping: ω = v / r about the long (x) axis
      const speed = Math.hypot(s.vx, s.vz);
      if (speed <= cfg.restSpeed) {
        s.vx = 0;
        s.vz = 0;
        s.spin = 0;
        s.resting = true;
        break;
      }
      const decel = Math.min(speed, cfg.rollingFriction * h);
      const k = (speed - decel) / speed;
      s.vx *= k;
      s.vz *= k;
      s.x += s.vx * h;
      s.z += s.vz * h;
      s.spin = s.vz / cfg.plateRadius;
      s.roll += s.spin * h;
    }
  }
  return { state: s, impacts };
}
