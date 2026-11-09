"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RIG, legIK, type Pose } from "@/lib/intro/choreography";

export type Joints = {
  root: THREE.Group | null;
  hips: THREE.Group | null;
  spine: THREE.Group | null;
  neck: THREE.Group | null;
  shoulderL: THREE.Group | null;
  shoulderR: THREE.Group | null;
  elbowL: THREE.Group | null;
  elbowR: THREE.Group | null;
  handL: THREE.Group | null;
  handR: THREE.Group | null;
  thighL: THREE.Group | null;
  thighR: THREE.Group | null;
  kneeL: THREE.Group | null;
  kneeR: THREE.Group | null;
  footL: THREE.Group | null;
  footR: THREE.Group | null;
  chest: THREE.Mesh | null;
};

export const emptyJoints = (): Joints => ({
  root: null, hips: null, spine: null, neck: null, shoulderL: null, shoulderR: null, elbowL: null, elbowR: null,
  handL: null, handR: null, thighL: null, thighR: null, kneeL: null, kneeR: null, footL: null, footR: null, chest: null,
});

/** Write a pose onto the rig (feet stay planted via legIK). `breath` adds a subtle idle chest swell. */
export function applyPose(j: Joints, p: Pose, breath = 0) {
  if (!j.hips) return;
  const { hipY, hipZ, footPitch } = legIK(p);
  j.hips.position.set(0, hipY, hipZ);
  j.hips.rotation.x = p.pelvis;
  j.spine!.rotation.x = p.spine;
  j.neck!.rotation.x = p.neck;
  j.shoulderL!.rotation.set(p.armFlex, 0, p.armAbd);
  j.shoulderR!.rotation.set(p.armFlex, 0, -p.armAbd);
  j.elbowL!.rotation.x = p.elbow;
  j.elbowR!.rotation.x = p.elbow;
  j.thighL!.rotation.set(p.legHip, 0, 0.06);
  j.thighR!.rotation.set(p.legHip, 0, -0.06);
  j.kneeL!.rotation.x = p.knee;
  j.kneeR!.rotation.x = p.knee;
  j.footL!.rotation.x = footPitch;
  j.footR!.rotation.x = footPitch;
  if (j.chest) j.chest.scale.set(0.27 + breath * 0.006, 0.2 + breath * 0.008, 0.16 + breath * 0.01);
}

// ── smooth anatomical shapes: lathe-turned limbs from a muscle profile [radius, y], sampled on a spline ──
type Profile = [number, number][];
function turned(profile: Profile, radial = 32) {
  const sorted = [...profile].sort((a, b) => a[1] - b[1]);
  const curve = new THREE.SplineCurve(sorted.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getPoints(40);
  const y0 = sorted[0][1];
  const y1 = sorted[sorted.length - 1][1];
  // close both ends so limbs have no open holes
  return new THREE.LatheGeometry([new THREE.Vector2(0, y0 - 0.008), ...pts, new THREE.Vector2(0, y1 + 0.008)], radial);
}

// Limb segments overlap across each joint (upper arm runs past the elbow, shin starts above the knee),
// so bending reads as one continuous limb instead of balls between tubes.
const GEO = {
  upperArm: turned([[0.062, 0.03], [0.068, 0], [0.07, -0.08], [0.072, -0.15], [0.062, -0.23], [0.05, -0.3], [0.046, -0.34], [0.044, -0.37]]),
  forearm: turned([[0.045, 0.04], [0.05, 0], [0.056, -0.05], [0.052, -0.1], [0.042, -0.18], [0.034, -0.26], [0.031, -0.3]]),
  thigh: turned([[0.1, 0.02], [0.118, -0.05], [0.116, -0.15], [0.105, -0.26], [0.086, -0.36], [0.068, -0.44], [0.064, -0.48]]),
  shin: turned([[0.06, 0.04], [0.063, 0], [0.07, -0.09], [0.064, -0.17], [0.05, -0.27], [0.04, -0.36], [0.037, -0.42], [0.035, -0.45]]),
  // torso: narrow waist flaring into the ribcage, then sloping into the neck (flattened front-to-back)
  torso: turned(
    [[0.14, -0.06], [0.15, 0], [0.145, 0.08], [0.155, 0.16], [0.18, 0.25], [0.212, 0.33], [0.228, 0.41], [0.215, 0.48], [0.17, 0.55], [0.1, 0.6], [0.065, 0.62]],
    40
  ),
  neck: turned([[0.085, -0.02], [0.074, 0.04], [0.066, 0.1], [0.064, 0.14]]),
  sphere: new THREE.SphereGeometry(1, 32, 24),
  // ribcage mass: slightly smaller than a unit sphere so it sits inside the torso (breathing scales it)
  chest: new THREE.SphereGeometry(0.88, 32, 24),
  smallSphere: new THREE.SphereGeometry(1, 16, 12),
  hairCap: new THREE.SphereGeometry(1, 36, 16, 0, Math.PI * 2, 0, 1.15),
  stubble: new THREE.SphereGeometry(1, 36, 12, 0, Math.PI * 2, 1.9, 1.0),
};
/** torso flattening front-to-back, and its radius at height y (so the abs sit on the skin) */
const TORSO_Z = 0.62;
const torsoR = (y: number) => (y < 0.16 ? 0.15 : y < 0.25 ? 0.155 + ((y - 0.16) / 0.09) * 0.025 : 0.18 + ((y - 0.25) / 0.08) * 0.032);

/**
 * Muscular athlete: smooth lathe-turned limbs with low-relief muscle heads blended into the skin,
 * tanned skin with a light sweat sheen, a human face (eyes, brow, nose, lips, cheekbones, stubble,
 * short hair) and gym kit: shorts, lifting belt, wrist wraps and lifting shoes.
 * Joint groups pivot at anatomical joints (see RIG).
 */
export function Athlete({ joints, shadows }: { joints: React.MutableRefObject<Joints>; shadows: boolean }) {
  const m = useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({
        color: "#8d5a3b",
        roughness: 0.56,
        metalness: 0,
        clearcoat: 0.15,
        clearcoatRoughness: 0.5,
        sheen: 0.4,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color("#ff9466"),
      }),
      lip: new THREE.MeshStandardMaterial({ color: "#6a3a29", roughness: 0.45 }),
      stubble: new THREE.MeshStandardMaterial({ color: "#3b2519", roughness: 0.95 }),
      hair: new THREE.MeshStandardMaterial({ color: "#120c09", roughness: 0.9 }),
      sclera: new THREE.MeshStandardMaterial({ color: "#d6ccc0", roughness: 0.2 }),
      iris: new THREE.MeshStandardMaterial({ color: "#1c120c", roughness: 0.1 }),
      cloth: new THREE.MeshStandardMaterial({ color: "#0d0d0e", roughness: 0.85 }),
      leather: new THREE.MeshStandardMaterial({ color: "#1d130c", roughness: 0.55 }),
      gold: new THREE.MeshStandardMaterial({ color: "#d4af37", roughness: 0.3, metalness: 0.9 }),
      wrap: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.8 }),
      sock: new THREE.MeshStandardMaterial({ color: "#b8b1a5", roughness: 0.9 }),
      shoe: new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.5, metalness: 0.15 }),
      sole: new THREE.MeshStandardMaterial({ color: "#d8d2c6", roughness: 0.7 }),
    }),
    []
  );
  const set = (k: keyof Joints) => (el: THREE.Group | THREE.Mesh | null) => {
    (joints.current as Record<string, unknown>)[k] = el;
  };
  const cs = shadows;
  type V3 = [number, number, number];
  /** an ellipsoid (muscle head / facial feature) */
  const blob = (key: string, pos: V3, scale: V3, rot?: V3, mat: THREE.Material = m.skin, shadow = false) => (
    <mesh key={key} geometry={GEO.sphere} material={mat} castShadow={shadow && cs} position={pos} scale={scale} rotation={rot} />
  );

  const arm = (side: 1 | -1) => (
    <group ref={set(side === 1 ? "shoulderL" : "shoulderR")} position={[side * RIG.shoulderX, RIG.shoulderY, -0.01]}>
      {/* deltoid: one rounded cap flowing into the arm */}
      {blob("delt", [side * 0.01, -0.035, 0], [0.082, 0.1, 0.085], undefined, m.skin, true)}
      <mesh geometry={GEO.upperArm} material={m.skin} castShadow={cs} scale={[1, 1, 1.05]} />
      {/* biceps in front, triceps behind: low relief */}
      {blob("bi", [0, -0.16, 0.03], [0.05, 0.08, 0.04])}
      {blob("tri", [0, -0.14, -0.028], [0.05, 0.1, 0.04])}
      <group ref={set(side === 1 ? "elbowL" : "elbowR")} position={[0, -RIG.upperArm, 0]}>
        {blob("elbow", [0, 0, -0.004], [0.045, 0.045, 0.045])}
        <mesh geometry={GEO.forearm} material={m.skin} castShadow={cs} scale={[1.08, 1, 0.95]} />
        {blob("brachio", [side * 0.018, -0.06, 0.01], [0.036, 0.07, 0.036])}
        {/* wrist wrap with a gold stripe */}
        <mesh material={m.wrap} position={[0, -0.275, 0]}>
          <cylinderGeometry args={[0.038, 0.036, 0.05, 20]} />
        </mesh>
        <mesh material={m.gold} position={[0, -0.262, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.038, 0.0028, 6, 24]} />
        </mesh>
        <group ref={set(side === 1 ? "handL" : "handR")} position={[0, -(RIG.forearm + RIG.hand / 2), 0]}>
          {/* closed fist: palm, knuckle roll, thumb */}
          {blob("palm", [0, 0.005, 0], [0.04, 0.05, 0.034], undefined, m.skin, true)}
          <mesh material={m.skin} position={[0, -0.03, 0.018]} rotation-z={Math.PI / 2}>
            <capsuleGeometry args={[0.022, 0.044, 4, 10]} />
          </mesh>
          <mesh material={m.skin} position={[-side * 0.034, -0.008, 0.02]} rotation={[0.3, 0, side * 0.5]}>
            <capsuleGeometry args={[0.012, 0.03, 4, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group ref={set(side === 1 ? "thighL" : "thighR")} position={[side * 0.11, -RIG.hipOffset, 0]}>
      {/* shorts */}
      <mesh material={m.cloth} castShadow={cs} position={[0, -0.11, 0]}>
        <cylinderGeometry args={[0.132, 0.124, 0.24, 28]} />
      </mesh>
      <mesh geometry={GEO.thigh} material={m.skin} castShadow={cs} scale={[1, 1, 1.08]} />
      {/* outer quad sweep and the teardrop above the knee: low relief */}
      {blob("vl", [side * 0.05, -0.22, 0], [0.07, 0.14, 0.08])}
      {blob("vmo", [-side * 0.04, -0.38, 0.035], [0.045, 0.06, 0.045])}
      <group ref={set(side === 1 ? "kneeL" : "kneeR")} position={[0, -RIG.thigh, 0]}>
        {/* knee: fills the joint without bulging past the limb */}
        {blob("knee", [0, 0, 0.004], [0.058, 0.06, 0.058])}
        <mesh geometry={GEO.shin} material={m.skin} castShadow={cs} />
        {blob("calf", [0, -0.13, -0.03], [0.058, 0.1, 0.055])}
        {/* sock */}
        <mesh material={m.sock} position={[0, -0.405, 0]}>
          <cylinderGeometry args={[0.042, 0.044, 0.07, 20]} />
        </mesh>
        <group ref={set(side === 1 ? "footL" : "footR")} position={[0, -RIG.shin, 0]}>
          {/* lifting shoe: rounded upper on a raised sole (sole bottom stays on the floor) */}
          <mesh material={m.shoe} castShadow={cs} position={[0, -0.012, 0.05]} rotation-x={Math.PI / 2} scale={[1, 1, 0.72]}>
            <capsuleGeometry args={[0.05, 0.16, 6, 16]} />
          </mesh>
          <mesh material={m.sole} position={[0, -0.0475, 0.055]}>
            <boxGeometry args={[0.1, 0.025, 0.27]} />
          </mesh>
          <mesh material={m.gold} position={[0, 0, 0.07]} rotation-x={-0.25}>
            <boxGeometry args={[0.085, 0.012, 0.03]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  return (
    <group ref={set("root")}>
      <group ref={set("hips")}>
        {/* pelvis / shorts */}
        <mesh geometry={GEO.sphere} material={m.cloth} castShadow={cs} scale={[0.2, 0.125, 0.135]} />
        {leg(1)}
        {leg(-1)}

        <group ref={set("spine")} position={[0, RIG.spineBase, 0]}>
          {/* one smooth torso: waist into the ribcage */}
          <mesh geometry={GEO.torso} material={m.skin} castShadow={cs} scale={[1.12, 1, TORSO_Z]} />
          {/* lats: V-taper */}
          {[1, -1].map((s) => blob(`lat${s}`, [s * 0.165, 0.33, -0.03], [0.08, 0.16, 0.07], [0, 0, s * -0.3], m.skin, true))}
          {/* ribcage (breathes): sits inside the torso surface */}
          <mesh ref={set("chest")} geometry={GEO.chest} material={m.skin} castShadow={cs} position={[0, 0.41, 0]} scale={[0.27, 0.2, 0.16]} />
          {/* pecs */}
          {[1, -1].map((s) => blob(`pec${s}`, [s * 0.088, 0.42, 0.105], [0.105, 0.07, 0.045], [0.1, 0, s * 0.18]))}
          {/* abs: shallow relief on the skin */}
          {[0.27, 0.2, 0.13].map((y) =>
            [1, -1].map((s) => blob(`ab${y}${s}`, [s * 0.042, y, torsoR(y) * TORSO_Z - 0.008], [0.036, 0.028, 0.016]))
          )}
          {/* obliques */}
          {[1, -1].map((s) => blob(`obl${s}`, [s * 0.13, 0.14, 0.02], [0.04, 0.09, 0.05], [0, 0, s * 0.15]))}
          {/* lifting belt with a gold buckle */}
          <mesh material={m.leather} position={[0, 0.045, 0]} scale={[1.13, 1, 0.66]}>
            <cylinderGeometry args={[0.152, 0.152, 0.095, 40, 1, true]} />
          </mesh>
          <mesh material={m.gold} position={[0, 0.045, 0.104]}>
            <boxGeometry args={[0.055, 0.05, 0.012]} />
          </mesh>
          {/* traps sloping from neck to shoulders */}
          {[1, -1].map((s) => blob(`trap${s}`, [s * 0.09, 0.56, -0.025], [0.1, 0.05, 0.065], [0, 0, s * -0.45]))}

          <group ref={set("neck")} position={[0, 0.6, 0]}>
            <mesh geometry={GEO.neck} material={m.skin} castShadow={cs} scale={[1.05, 1, 1]} />
            {/* skull and face */}
            {blob("cranium", [0, 0.19, -0.005], [0.085, 0.098, 0.098], undefined, m.skin, true)}
            {blob("jaw", [0, 0.14, 0.02], [0.07, 0.075, 0.08])}
            {[1, -1].map((s) => blob(`cheek${s}`, [s * 0.045, 0.158, 0.072], [0.025, 0.018, 0.02]))}
            {blob("chin", [0, 0.088, 0.064], [0.028, 0.024, 0.024])}
            {blob("brow", [0, 0.192, 0.08], [0.058, 0.012, 0.018])}
            {blob("nose", [0, 0.163, 0.094], [0.012, 0.026, 0.018], [-0.2, 0, 0])}
            {blob("lips", [0, 0.113, 0.087], [0.026, 0.008, 0.01], undefined, m.lip)}
            {[1, -1].map((s) => blob(`ear${s}`, [s * 0.085, 0.165, 0], [0.012, 0.025, 0.018]))}
            {/* eyes: white, dark iris, a hooded upper lid */}
            {[1, -1].map((s) => (
              <group key={`eye${s}`} position={[s * 0.03, 0.172, 0.076]}>
                <mesh geometry={GEO.smallSphere} material={m.sclera} scale={0.011} />
                <mesh geometry={GEO.smallSphere} material={m.iris} position={[0, 0, 0.0085]} scale={0.0055} />
                <mesh geometry={GEO.sphere} material={m.skin} position={[0, 0.006, 0.004]} scale={[0.014, 0.006, 0.009]} />
              </group>
            ))}
            {/* short hair and stubble: thin layers hugging the skull and jaw */}
            <mesh geometry={GEO.hairCap} material={m.hair} position={[0, 0.195, -0.008]} scale={[0.088, 0.1, 0.101]} rotation-x={-0.35} />
            <mesh geometry={GEO.stubble} material={m.stubble} position={[0, 0.14, 0.02]} scale={[0.0715, 0.0765, 0.0815]} />
          </group>

          {arm(1)}
          {arm(-1)}
        </group>
      </group>
    </group>
  );
}
