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

/**
 * Stylised muscular athlete built from primitives, a dark-bronze "statue" look that reads as
 * a powerful silhouette under rim lighting. Joint groups pivot at anatomical joints.
 */
export function Athlete({ joints, shadows }: { joints: React.MutableRefObject<Joints>; shadows: boolean }) {
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3a281b", roughness: 0.38, metalness: 0.35 }),
    []
  );
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0c0c0c", roughness: 0.85 }), []);
  const shoe = useMemo(() => new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.5, metalness: 0.2 }), []);
  const set = (k: keyof Joints) => (el: THREE.Group | THREE.Mesh | null) => {
    (joints.current as Record<string, unknown>)[k] = el;
  };
  const cs = shadows;

  const arm = (side: 1 | -1) => (
    <group
      ref={set(side === 1 ? "shoulderL" : "shoulderR")}
      position={[side * RIG.shoulderX, RIG.shoulderY, -0.01]}
    >
      {/* deltoid */}
      <mesh material={skin} castShadow={cs} scale={[1.05, 1, 1]}>
        <sphereGeometry args={[0.088, 20, 20]} />
      </mesh>
      {/* upper arm + biceps/triceps */}
      <mesh material={skin} castShadow={cs} position={[0, -0.17, 0]}>
        <capsuleGeometry args={[0.06, 0.2, 6, 14]} />
      </mesh>
      <mesh material={skin} castShadow={cs} position={[0, -0.15, 0.03]} scale={[0.066, 0.1, 0.07]}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>
      <mesh material={skin} castShadow={cs} position={[0, -0.14, -0.035]} scale={[0.06, 0.11, 0.06]}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>
      <group ref={set(side === 1 ? "elbowL" : "elbowR")} position={[0, -RIG.upperArm, 0]}>
        <mesh material={skin} castShadow={cs} scale={0.055}>
          <sphereGeometry args={[1, 12, 12]} />
        </mesh>
        <mesh material={skin} castShadow={cs} position={[0, -0.14, 0]}>
          <capsuleGeometry args={[0.048, 0.19, 6, 12]} />
        </mesh>
        <mesh material={skin} castShadow={cs} position={[0, -0.07, 0.01]} scale={[0.055, 0.08, 0.055]}>
          <sphereGeometry args={[1, 14, 14]} />
        </mesh>
        <group ref={set(side === 1 ? "handL" : "handR")} position={[0, -(RIG.forearm + RIG.hand / 2), 0]}>
          <mesh material={skin} castShadow={cs} scale={[0.045, 0.055, 0.04]}>
            <sphereGeometry args={[1, 12, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group ref={set(side === 1 ? "thighL" : "thighR")} position={[side * 0.11, -RIG.hipOffset, 0]}>
      {/* shorts */}
      <mesh material={cloth} castShadow={cs} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.112, 0.1, 0.22, 16]} />
      </mesh>
      {/* quads */}
      <mesh material={skin} castShadow={cs} position={[0, -0.25, 0.005]}>
        <capsuleGeometry args={[0.092, 0.22, 6, 14]} />
      </mesh>
      <mesh material={skin} castShadow={cs} position={[side * 0.03, -0.28, 0.04]} scale={[0.06, 0.12, 0.06]}>
        <sphereGeometry args={[1, 14, 14]} />
      </mesh>
      <group ref={set(side === 1 ? "kneeL" : "kneeR")} position={[0, -RIG.thigh, 0]}>
        {/* knee joint: closes the gap between thigh and shin when bent */}
        <mesh material={skin} castShadow={cs} scale={[0.072, 0.075, 0.07]}>
          <sphereGeometry args={[1, 14, 14]} />
        </mesh>
        <mesh material={skin} castShadow={cs} position={[0, -0.21, 0]}>
          <capsuleGeometry args={[0.06, 0.34, 6, 12]} />
        </mesh>
        {/* calf */}
        <mesh material={skin} castShadow={cs} position={[0, -0.13, -0.03]} scale={[0.07, 0.11, 0.075]}>
          <sphereGeometry args={[1, 14, 14]} />
        </mesh>
        <group ref={set(side === 1 ? "footL" : "footR")} position={[0, -RIG.shin, 0]}>
          <mesh material={shoe} castShadow={cs} position={[0, -0.025, 0.055]}>
            <boxGeometry args={[0.1, 0.07, 0.26]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  return (
    <group ref={set("root")}>
      <group ref={set("hips")}>
        {/* pelvis / shorts */}
        <mesh material={cloth} castShadow={cs} scale={[0.19, 0.12, 0.13]}>
          <sphereGeometry args={[1, 20, 20]} />
        </mesh>
        {leg(1)}
        {leg(-1)}

        <group ref={set("spine")} position={[0, RIG.spineBase, 0]}>
          {/* waist + obliques: reaches down into the shorts so the torso reads as one piece */}
          <mesh material={skin} castShadow={cs} position={[0, 0.1, 0]} scale={[1.08, 1, 0.78]}>
            <capsuleGeometry args={[0.14, 0.24, 6, 16]} />
          </mesh>
          {/* lats: V-taper */}
          {[1, -1].map((s) => (
            <mesh key={s} material={skin} castShadow={cs} position={[s * 0.16, 0.33, -0.03]} scale={[0.11, 0.21, 0.1]} rotation-z={s * -0.25}>
              <sphereGeometry args={[1, 16, 16]} />
            </mesh>
          ))}
          {/* broad chest */}
          <mesh ref={set("chest")} material={skin} castShadow={cs} position={[0, 0.41, 0]} scale={[0.27, 0.2, 0.16]}>
            <sphereGeometry args={[1, 24, 24]} />
          </mesh>
          {/* pecs */}
          {[1, -1].map((s) => (
            <mesh key={`p${s}`} material={skin} castShadow={cs} position={[s * 0.095, 0.43, 0.105]} scale={[0.12, 0.085, 0.065]}>
              <sphereGeometry args={[1, 16, 16]} />
            </mesh>
          ))}
          {/* abs */}
          {[0.27, 0.19, 0.11].map((y) =>
            [1, -1].map((s) => (
              <mesh key={`a${y}${s}`} material={skin} position={[s * 0.045, y, 0.1]} scale={[0.04, 0.035, 0.03]}>
                <sphereGeometry args={[1, 10, 10]} />
              </mesh>
            ))
          )}
          {/* traps */}
          <mesh material={skin} castShadow={cs} position={[0, 0.555, -0.02]} scale={[0.17, 0.07, 0.09]}>
            <sphereGeometry args={[1, 16, 16]} />
          </mesh>

          <group ref={set("neck")} position={[0, 0.6, 0]}>
            <mesh material={skin} castShadow={cs} position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.062, 0.075, 0.13, 14]} />
            </mesh>
            <mesh material={skin} castShadow={cs} position={[0, 0.17, 0.01]} scale={[0.095, 0.118, 0.105]}>
              <sphereGeometry args={[1, 24, 24]} />
            </mesh>
          </group>

          {arm(1)}
          {arm(-1)}
        </group>
      </group>
    </group>
  );
}
