"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeGlowTexture, makeStoneTexture } from "./textures";
import { lerp, rand, smoothstep } from "@/lib/utils";

type Prog = React.MutableRefObject<number>;

const GATE_Z = -16;
const IRON = { color: "#2b2622", metalness: 0.85, roughness: 0.42 };

/* ── Stone corridor with gothic arches ─────────────────── */
function Corridor() {
  const wallTex = useMemo(() => {
    const t = makeStoneTexture({ rows: 10, cols: 5, base: 30, seed: 2 });
    t.repeat.set(10, 2);
    return t;
  }, []);
  const floorTex = useMemo(() => {
    const t = makeStoneTexture({ rows: 4, cols: 4, base: 26, seed: 5 });
    t.repeat.set(3, 14);
    return t;
  }, []);
  const archTex = useMemo(() => {
    const t = makeStoneTexture({ rows: 2, cols: 12, base: 36, seed: 9 });
    t.repeat.set(4, 1);
    return t;
  }, []);

  const arches = useMemo(() => Array.from({ length: 8 }, (_, i) => 8 - i * 3.6), []);

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -6]} receiveShadow>
        <planeGeometry args={[8, 44]} />
        <meshStandardMaterial map={floorTex} bumpMap={floorTex} bumpScale={0.6} roughness={0.85} color="#8a7f74" />
      </mesh>
      {/* walls */}
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, 3.5, -6]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[44, 7]} />
          <meshStandardMaterial map={wallTex} bumpMap={wallTex} bumpScale={1.2} roughness={0.95} color="#7d7166" />
        </mesh>
      ))}
      {/* arches */}
      {arches.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-3.75, 3.75].map((x) => (
            <mesh key={x} position={[x, 1.6, 0]}>
              <boxGeometry args={[0.55, 3.2, 0.7]} />
              <meshStandardMaterial map={archTex} color="#8d8174" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 3.2, 0]}>
            <torusGeometry args={[3.75, 0.32, 8, 32, Math.PI]} />
            <meshStandardMaterial map={archTex} color="#8d8174" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* ceiling darkness */}
      <mesh position={[0, 7, -6]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[8, 44]} />
        <meshStandardMaterial color="#050404" roughness={1} />
      </mesh>
    </group>
  );
}

/* ── Flickering wall torches ───────────────────────────── */
function Torches() {
  const glow = useMemo(() => makeGlowTexture(), []);
  const torches = useMemo(() => {
    const list: { x: number; z: number; seed: number }[] = [];
    [6.2, 0.8, -4.6, -10].forEach((z, i) => {
      list.push({ x: -3.65, z, seed: i * 2 });
      list.push({ x: 3.65, z, seed: i * 2 + 1 });
    });
    return list;
  }, []);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const flames = useRef<(THREE.Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    torches.forEach((tc, i) => {
      const f = 0.78 + Math.sin(t * 11 + tc.seed) * 0.08 + Math.sin(t * 23 + tc.seed * 3) * 0.06 + Math.sin(t * 5.3 + tc.seed) * 0.08;
      const l = lights.current[i];
      if (l) l.intensity = 9 * f;
      const s = flames.current[i];
      if (s) s.scale.set(0.9 * f, 1.25 * f, 1);
    });
  });

  return (
    <group>
      {torches.map((tc, i) => {
        const dir = tc.x < 0 ? 1 : -1;
        return (
          <group key={i} position={[tc.x, 2.6, tc.z]}>
            <mesh position={[dir * 0.12, -0.25, 0]} rotation-z={dir * -0.5}>
              <cylinderGeometry args={[0.04, 0.05, 0.6, 8]} />
              <meshStandardMaterial {...IRON} />
            </mesh>
            <mesh position={[dir * 0.25, 0.05, 0]}>
              <cylinderGeometry args={[0.14, 0.07, 0.2, 10]} />
              <meshStandardMaterial {...IRON} />
            </mesh>
            <sprite ref={(el) => { flames.current[i] = el; }} position={[dir * 0.25, 0.4, 0]}>
              <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
            <pointLight
              ref={(el) => { lights.current[i] = el; }}
              position={[dir * 0.5, 0.4, 0]}
              color="#ff8a3d"
              distance={9}
              decay={1.6}
              intensity={9}
            />
          </group>
        );
      })}
    </group>
  );
}

/* ── The iron gate (two doors that swing open with scroll) ── */
function GateDoor({ side }: { side: 1 | -1 }) {
  // side = -1 → left door (hinge at x=-2.3); +1 → right door
  const bars = Array.from({ length: 7 }, (_, i) => 0.18 + i * 0.32);
  return (
    <group>
      {bars.map((b) => (
        <mesh key={b} position={[-side * b, 2.5, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 5, 8]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {[0.4, 1.9, 3.4, 4.8].map((y) => (
        <mesh key={y} position={[-side * 1.15, y, 0]}>
          <boxGeometry args={[2.3, 0.16, 0.12]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {/* gold emblem on each door */}
      <mesh position={[-side * 1.15, 2.65, 0.08]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.38, 0.05, 10, 32]} />
        <meshStandardMaterial color="#c9a24b" metalness={1} roughness={0.25} emissive="#7a5a1a" emissiveIntensity={0.6} />
      </mesh>
      {/* spikes on top */}
      {bars.map((b) => (
        <mesh key={`s${b}`} position={[-side * b, 5.12, 0]}>
          <coneGeometry args={[0.08, 0.28, 6]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
    </group>
  );
}

function Gate({ progress }: { progress: Prog }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const portal = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => makeGlowTexture("rgba(255,236,190,1)", "rgba(255,170,60,0)"), []);
  const open = useRef(0);

  useFrame((_, dt) => {
    const target = smoothstep(0.08, 0.62, progress.current);
    open.current = lerp(open.current, target, 1 - Math.exp(-dt * 5));
    const a = open.current * 1.75;
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;
    if (light.current) light.current.intensity = 4 + open.current * 60;
    if (portal.current) {
      const m = portal.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.25 + open.current * 0.75;
    }
  });

  return (
    <group position={[0, 0, GATE_Z]}>
      {/* frame */}
      {[-2.55, 2.55].map((x) => (
        <mesh key={x} position={[x, 2.8, 0]}>
          <boxGeometry args={[0.4, 5.6, 0.5]} />
          <meshStandardMaterial {...IRON} color="#1f1b18" />
        </mesh>
      ))}
      <mesh position={[0, 5.55, 0]}>
        <boxGeometry args={[5.5, 0.4, 0.5]} />
        <meshStandardMaterial {...IRON} color="#1f1b18" />
      </mesh>
      {/* wall around the gate */}
      {[-3.4, 3.4].map((x) => (
        <mesh key={`w${x}`} position={[x, 3.5, -0.1]}>
          <boxGeometry args={[1.4, 7, 0.4]} />
          <meshStandardMaterial color="#141110" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 6.3, -0.1]}>
        <boxGeometry args={[8, 1.5, 0.4]} />
        <meshStandardMaterial color="#141110" roughness={1} />
      </mesh>

      {/* doors pivot on their hinges at x = ±2.3 */}
      <group ref={left} position={[-2.3, 0, 0]}>
        <GateDoor side={-1} />
      </group>
      <group ref={right} position={[2.3, 0, 0]}>
        <GateDoor side={1} />
      </group>

      {/* light behind the gate */}
      <mesh ref={portal} position={[0, 2.8, -2.5]}>
        <planeGeometry args={[9, 7]} />
        <meshBasicMaterial color="#ffdca0" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <sprite position={[0, 2.6, -1.5]} scale={[14, 10, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.55} />
      </sprite>
      <pointLight ref={light} position={[0, 3, -1.2]} color="#ffc070" distance={30} decay={1.3} intensity={4} />
    </group>
  );
}

/* ── Rising embers ─────────────────────────────────────── */
function Embers({ count = 380 }) {
  const ref = useRef<THREE.Points>(null);
  const tex = useMemo(() => makeGlowTexture("rgba(255,200,120,1)", "rgba(255,80,0,0)"), []);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand(i) - 0.5) * 7.5;
      positions[i * 3 + 1] = rand(i + 500) * 7;
      positions[i * 3 + 2] = 9 - rand(i + 1000) * 28;
      speeds[i] = 0.25 + rand(i + 1500) * 0.7;
    }
    return { positions, speeds };
  }, [count]);

  useFrame(({ clock }, dt) => {
    const p = ref.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 1.3 + i) * dt * 0.15;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = 0;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.12}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#ffae5c"
        toneMapped={false}
      />
    </points>
  );
}

/* ── Camera flies down the corridor with scroll + mouse parallax ── */
function CameraRig({ progress }: { progress: Prog }) {
  const { camera, pointer } = useThree();
  const intro = useRef(0);
  const smooth = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    intro.current = Math.min(1, intro.current + dt * 0.35);
    const introEase = 1 - Math.pow(1 - intro.current, 3);
    smooth.current = lerp(smooth.current, progress.current, 1 - Math.exp(-dt * 4));
    const p = smooth.current;
    const travel = smoothstep(0.05, 1, p);

    const z = lerp(14, 9, introEase) - travel * 27.5;
    const bob = Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    camera.position.x = lerp(camera.position.x, pointer.x * 0.6, 1 - Math.exp(-dt * 2));
    camera.position.y = lerp(camera.position.y, 1.7 + pointer.y * 0.25 + bob, 1 - Math.exp(-dt * 2));
    camera.position.z = z;
    look.set(pointer.x * 0.3, 2.1, z - 10);
    camera.lookAt(look);
  });
  return null;
}

export default function GateScene({ progress, active = true }: { progress: Prog; active?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 1.7, 14], fov: 58, near: 0.1, far: 70 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#070605", 5, 30]} />
      <ambientLight intensity={0.12} color="#ffd9b0" />
      <hemisphereLight args={["#3a2a1a", "#000000", 0.25]} />
      <Corridor />
      <Torches />
      <Gate progress={progress} />
      <Embers />
      <CameraRig progress={progress} />
    </Canvas>
  );
}
