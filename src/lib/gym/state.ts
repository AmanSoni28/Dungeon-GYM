/** Shared, mutable state between the scroll section, drag handlers and the 3D view (no re-renders).
 *  Kept in its own module so the page doesn't import the (lazy-loaded) Three.js viewer. */
export type GymLookState = {
  /** section scroll progress 0..1 */
  progress: number;
  /** user drag offsets (radians), relative to the scroll-driven yaw */
  dragYaw: number;
  dragPitch: number;
  /** performance.now() of the last drag / key press */
  lastInteraction: number;
};

export const createLookState = (): GymLookState => ({ progress: 0, dragYaw: 0, dragPitch: 0, lastInteraction: 0 });
