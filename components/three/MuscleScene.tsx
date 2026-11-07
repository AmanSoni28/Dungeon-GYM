"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MuscleId } from "@/data/site";

type Props = {
  active: MuscleId;
  hover: MuscleId | null;
  onHover: (m: MuscleId | null) => void;
  onSelect: (m: MuscleId) => void;
  running: boolean;
};

const GROUPS: MuscleId[] = ["chest", "shoulders", "arms", "core", "legs", "back"];
const EMBER = new THREE.Color("#ff5a1f");
const GOLD = new THREE.Color("#ffb347");

function useMuscleMaterials() {
  return useMemo(() => {
    const m = {} as Record<MuscleId, THREE.MeshStandardMaterial>;
    GROUPS.forEach((g) => {
      m[g] = new THREE.MeshStandardMaterial({
        color: "#2c2622",
        metalness: 0.75,
        roughness: 0.32,
        emissive: EMBER.clone(),
        emissiveIntensity: 0,
      });
    });
    return m;
  }, []);
}

function Body({ active, hover, onHover, onSelect }: Omit<Props, "running">) {
  const mats = useMuscleMaterials();
  const base = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#151311", metalness: 0.85, roughness: 0.38 }),
    []
  );

  useFrame(({ clock }, dt) => {
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 4) * 0.15;
    GROUPS.forEach((g) => {
      const mat = mats[g];
      const target = g === active ? 1.6 * pulse : g === hover ? 0.9 : 0.04;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * (1 - Math.exp(-dt * 8));
      mat.emissive.lerp(g === active ? GOLD : EMBER, 0.1);
    });
  });

  const bind = (g: MuscleId) => ({
    material: mats[g],
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(g);
    },
    onPointerOut: () => onHover(null),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(g);
    },
  });

  return (
    <group position={[0, -0.25, 0]}>
      {/* neutral frame */}
      <mesh material={base} position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
      </mesh>
      <mesh material={base} position={[0, 1.44, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.2, 16]} />
      </mesh>
      <mesh material={base} position={[0, 0.96, 0]} scale={[1.18, 1, 0.68]}>
        <capsuleGeometry args={[0.27, 0.55, 8, 24]} />
      </mesh>
      <mesh material={base} position={[0, 0.42, 0]} scale={[1.05, 0.6, 0.75]}>
        <sphereGeometry args={[0.3, 24, 24]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={base} position={[s * 0.6, 0.27, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>
          <mesh material={base} position={[s * 0.17, -1.05, 0.06]}>
            <boxGeometry args={[0.13, 0.08, 0.3]} />
          </mesh>
        </group>
      ))}

      {/* chest */}
      {[-1, 1].map((s) => (
        <mesh key={s} {...bind("chest")} position={[s * 0.14, 1.13, 0.12]} scale={[1.4, 0.95, 0.65]}>
          <sphereGeometry args={[0.17, 32, 32]} />
        </mesh>
      ))}
      {/* shoulders */}
      {[-1, 1].map((s) => (
        <mesh key={s} {...bind("shoulders")} position={[s * 0.41, 1.22, 0]}>
          <sphereGeometry args={[0.135, 32, 32]} />
        </mesh>
      ))}
      {/* arms */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh {...bind("arms")} position={[s * 0.5, 0.9, 0.01]} rotation-z={s * 0.12}>
            <capsuleGeometry args={[0.085, 0.32, 8, 16]} />
          </mesh>
          <mesh {...bind("arms")} position={[s * 0.56, 0.5, 0.03]} rotation-z={s * 0.06}>
            <capsuleGeometry args={[0.068, 0.3, 8, 16]} />
          </mesh>
        </group>
      ))}
      {/* core (six-pack) */}
      {[0.86, 0.72, 0.58].map((y) =>
        [-1, 1].map((s) => (
          <RoundedBox key={`${y}${s}`} {...bind("core")} args={[0.12, 0.11, 0.07]} radius={0.03} position={[s * 0.068, y, 0.165]} />
        ))
      )}
      {/* legs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh {...bind("legs")} position={[s * 0.16, -0.02, 0.02]}>
            <capsuleGeometry args={[0.13, 0.52, 8, 16]} />
          </mesh>
          <mesh {...bind("legs")} position={[s * 0.17, -0.65, 0]}>
            <capsuleGeometry args={[0.09, 0.42, 8, 16]} />
          </mesh>
        </group>
      ))}
      {/* back (lats + traps), visible when rotated */}
      {[-1, 1].map((s) => (
        <mesh key={s} {...bind("back")} position={[s * 0.17, 1.0, -0.12]} scale={[1, 1.6, 0.5]}>
          <sphereGeometry args={[0.18, 32, 32]} />
        </mesh>
      ))}
      <mesh {...bind("back")} position={[0, 1.32, -0.08]} scale={[1.8, 0.6, 0.6]}>
        <sphereGeometry args={[0.13, 24, 24]} />
      </mesh>
    </group>
  );
}

/* holographic platform + scanning plane */
function Platform() {
  const ring = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.4;
    if (scan.current) scan.current.position.y = -1.2 + ((t * 0.5) % 1) * 3.1;
  });
  return (
    <group>
      <mesh ref={ring} position={[0, -1.32, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 0.9, 64, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#e8b450" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.33, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.8, 64]} />
        <meshBasicMaterial color="#c9a24b" transparent opacity={0.08} />
      </mesh>
      <mesh ref={scan} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0, 0.75, 48]} />
        <meshBasicMaterial color="#ffcf70" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function MuscleScene(props: Props) {
  return (
    <Canvas dpr={[1, 1.6]} frameloop={props.running ? "always" : "never"} camera={{ position: [0, 0.2, 4.2], fov: 38 }}>
      <ambientLight intensity={0.2} />
      <spotLight position={[3, 4, 4]} angle={0.5} penumbra={1} intensity={60} color="#ffd8a8" />
      <pointLight position={[-3, 1, -2]} intensity={20} color="#ff6a2a" />
      <pointLight position={[2, -1, -3]} intensity={14} color="#c9a24b" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 4, 2]} scale={[6, 2, 1]} color="#ffe2b8" />
        <Lightformer form="rect" intensity={1.5} position={[-4, 0, 0]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} color="#ff7a30" />
        <Lightformer form="rect" intensity={1.2} position={[4, 0, -1]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} color="#c9a24b" />
      </Environment>
      <Body {...props} />
      <Platform />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={!props.hover}
        autoRotateSpeed={1.2}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}
