"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { lerp } from "@/lib/utils";

type Prog = React.MutableRefObject<number>;

const CHROME = { color: "#d8d4cc", metalness: 1, roughness: 0.15 };
const RUBBER = { color: "#121110", metalness: 0.2, roughness: 0.55 };
const GOLD = { color: "#d4a94e", metalness: 1, roughness: 0.22 };

function DumbbellModel() {
  return (
    <group rotation={[0.3, 0, 0.35]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.1, 0.1, 1.3, 32]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      {/* knurling rings */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.36 + i * 0.09, 0, 0]} rotation-z={Math.PI / 2}>
          <torusGeometry args={[0.1, 0.008, 6, 24]} />
          <meshStandardMaterial {...CHROME} roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.82, 0, 0]}>
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.5, 0.5, 0.5, 6]} />
            <meshStandardMaterial {...RUBBER} />
          </mesh>
          <mesh position={[s * 0.255, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 6]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <mesh position={[-s * 0.29, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.17, 0.17, 0.08, 32]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function KettlebellModel() {
  return (
    <group rotation={[0.15, 0, 0]} position={[0, -0.2, 0]}>
      <mesh scale={[1, 0.92, 1]}>
        <sphereGeometry args={[0.72, 64, 64]} />
        <meshStandardMaterial color="#b8892f" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.42, 0.45, 0.1, 48]} />
        <meshStandardMaterial color="#8a6420" metalness={1} roughness={0.35} />
      </mesh>
      {/* handle */}
      <mesh position={[0, 0.78, 0]}>
        <torusGeometry args={[0.42, 0.085, 24, 64, Math.PI]} />
        <meshStandardMaterial color="#1a1816" metalness={0.9} roughness={0.3} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.6, 0]}>
          <cylinderGeometry args={[0.085, 0.11, 0.38, 24]} />
          <meshStandardMaterial color="#1a1816" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.705]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.22, 0.02, 12, 48]} />
        <meshStandardMaterial color="#141210" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function PlateModel() {
  const profile = useMemo(() => {
    // lathe profile: hub → raised lip → flat face → rim
    const pts = [
      [0.16, -0.08], [0.32, -0.12], [0.36, -0.08], [0.95, -0.08], [1.0, -0.13],
      [1.04, -0.11], [1.04, 0.11], [1.0, 0.13], [0.95, 0.08], [0.36, 0.08], [0.32, 0.12], [0.16, 0.08],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return pts;
  }, []);
  return (
    <group rotation={[0.25, -0.5, 0]}>
      <mesh rotation-x={Math.PI / 2}>
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial {...RUBBER} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 0.3, 48, 1, true]} />
        <meshStandardMaterial {...CHROME} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.09]}>
          <torusGeometry args={[0.7, 0.012, 8, 96]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, 0, s * 0.13]}>
          <torusGeometry args={[0.24, 0.035, 12, 48]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
    </group>
  );
}

const MODELS = [DumbbellModel, KettlebellModel, PlateModel];

function Carousel({ progress }: { progress: Prog }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const smooth = useRef(0);

  useFrame(({ clock }, dt) => {
    smooth.current = lerp(smooth.current, progress.current * (MODELS.length - 1), 1 - Math.exp(-dt * 6));
    const s = smooth.current;
    groups.current.forEach((g, i) => {
      if (!g) return;
      const d = i - s; // distance from the active slot
      const vis = Math.max(0, 1 - Math.abs(d) * 1.4);
      const scale = 0.0001 + vis;
      g.scale.setScalar(scale);
      g.position.set(d * 3.2, -Math.abs(d) * 0.6, -Math.abs(d) * 2);
      g.rotation.y = clock.elapsedTime * 0.35 + d * 2.2;
      g.visible = vis > 0.01;
    });
  });

  return (
    <>
      {MODELS.map((M, i) => (
        <group key={i} ref={(el) => { groups.current[i] = el; }}>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
            <M />
          </Float>
        </group>
      ))}
    </>
  );
}

export default function EquipmentScene({ progress, running }: { progress: Prog; running: boolean }) {
  return (
    <Canvas dpr={[1, 1.6]} frameloop={running ? "always" : "never"} camera={{ position: [0, 0, 5], fov: 35 }}>
      <ambientLight intensity={0.15} />
      <spotLight position={[4, 5, 5]} angle={0.4} penumbra={1} intensity={80} color="#ffe0b0" />
      <pointLight position={[-4, -1, -2]} intensity={30} color="#ff6020" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -3]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[3, 8, 1]} color="#ff8a40" />
        <Lightformer form="rect" intensity={2} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[3, 8, 1]} color="#e8c070" />
        <Lightformer form="ring" intensity={2} position={[0, 0, 6]} scale={3} color="#ffffff" />
      </Environment>
      <Carousel progress={progress} />
    </Canvas>
  );
}
