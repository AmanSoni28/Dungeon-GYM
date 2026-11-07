"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import { makeGlowTexture, makeStoneTexture, makeTextTexture } from "./textures";
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
// Premium black + metallic-gold gate materials
const BLACK_METAL = { color: "#0c0c0d", metalness: 0.92, roughness: 0.3 };
const GOLD_METAL = { color: "#D4AF37", metalness: 1, roughness: 0.22, emissive: "#4a3608", emissiveIntensity: 0.35 };
const CHAMPAGNE = { color: "#F5D98B", metalness: 1, roughness: 0.18, emissive: "#5a4512", emissiveIntensity: 0.3 };

function GateDoor({ side }: { side: 1 | -1 }) {
  // side = -1 → left door (hinge at x=-2.3); +1 → right door. Door extends from the hinge toward the centre.
  const bars = Array.from({ length: 7 }, (_, i) => 0.18 + i * 0.32);
  const x = (v: number) => -side * v;
  return (
    <group>
      {/* stiles (hinge side + meeting side) */}
      {[0.05, 2.25].map((v) => (
        <mesh key={v} position={[x(v), 2.55, 0]}>
          <boxGeometry args={[0.12, 5.1, 0.14]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      {/* bars with gold collars */}
      {bars.map((b) => (
        <group key={b}>
          <mesh position={[x(b), 2.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 5, 12]} />
            <meshStandardMaterial {...BLACK_METAL} />
          </mesh>
          {[1.15, 3.95].map((y) => (
            <mesh key={y} position={[x(b), y, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
              <meshStandardMaterial {...GOLD_METAL} />
            </mesh>
          ))}
          {/* gold spear finial */}
          <mesh position={[x(b), 5.2, 0]}>
            <coneGeometry args={[0.085, 0.32, 8]} />
            <meshStandardMaterial {...CHAMPAGNE} />
          </mesh>
          <mesh position={[x(b), 5.02, 0]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial {...GOLD_METAL} />
          </mesh>
        </group>
      ))}
      {/* rails with a gold inlay line */}
      {[0.95, 2.0, 3.3, 4.85].map((y) => (
        <group key={y}>
          <mesh position={[x(1.15), y, 0]}>
            <boxGeometry args={[2.3, 0.15, 0.13]} />
            <meshStandardMaterial {...BLACK_METAL} />
          </mesh>
          <mesh position={[x(1.15), y, 0.068]}>
            <boxGeometry args={[2.22, 0.025, 0.01]} />
            <meshStandardMaterial {...GOLD_METAL} />
          </mesh>
        </group>
      ))}
      {/* solid kick plate with gold border */}
      <mesh position={[x(1.15), 0.5, 0]}>
        <boxGeometry args={[2.3, 0.85, 0.08]} />
        <meshStandardMaterial {...BLACK_METAL} roughness={0.38} />
      </mesh>
      <mesh position={[x(1.15), 0.5, 0.045]}>
        <boxGeometry args={[2.05, 0.6, 0.005]} />
        <meshStandardMaterial {...GOLD_METAL} roughness={0.35} />
      </mesh>
      <mesh position={[x(1.15), 0.5, 0.05]}>
        <boxGeometry args={[1.97, 0.52, 0.005]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      {/* medallion */}
      <group position={[x(1.15), 2.65, 0.09]} rotation-x={Math.PI / 2}>
        <mesh>
          <torusGeometry args={[0.4, 0.055, 14, 48]} />
          <meshStandardMaterial {...GOLD_METAL} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.04, 48]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation-y={Math.PI / 4}>
          <boxGeometry args={[0.24, 0.03, 0.24]} />
          <meshStandardMaterial {...CHAMPAGNE} />
        </mesh>
      </group>
      {/* hinge straps with rivets */}
      {[0.95, 2.65, 4.35].map((y) => (
        <group key={`h${y}`} position={[x(0.3), y, 0.085]}>
          <mesh>
            <boxGeometry args={[0.55, 0.11, 0.03]} />
            <meshStandardMaterial {...BLACK_METAL} />
          </mesh>
          {[-0.18, 0, 0.18].map((r) => (
            <mesh key={r} position={[r, 0, 0.02]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial {...GOLD_METAL} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Gate({ progress }: { progress: Prog }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const portal = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => makeGlowTexture("rgba(255,240,205,1)", "rgba(212,175,55,0)"), []);
  const sign = useMemo(() => makeTextTexture("DUNGEON", { color: "#F5D98B", font: "bold 150px Anton, Impact, sans-serif" }), []);
  const open = useRef(0);
  const vel = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const target = smoothstep(0.08, 0.62, progress.current);
    // heavy gate on hinges: spring-damper (inertia + a tiny settle) instead of a linear follow
    const k = 26;
    const c = 9;
    vel.current += ((target - open.current) * k - vel.current * c) * dt;
    open.current += vel.current * dt;
    const a = Math.max(0, open.current) * 1.75;
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;
    if (light.current) light.current.intensity = 4 + open.current * 60;
    if (portal.current) {
      const m = portal.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.2 + open.current * 0.8;
    }
  });

  return (
    <group position={[0, 0, GATE_Z]}>
      {/* frame: black posts with gold capitals and bases */}
      {[-2.55, 2.55].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.8, 0]}>
            <boxGeometry args={[0.4, 5.6, 0.5]} />
            <meshStandardMaterial {...BLACK_METAL} />
          </mesh>
          {[0.12, 5.3].map((y) => (
            <mesh key={y} position={[x, y, 0]}>
              <boxGeometry args={[0.5, 0.18, 0.6]} />
              <meshStandardMaterial {...GOLD_METAL} />
            </mesh>
          ))}
          {/* hinge knuckles on the frame */}
          {[0.95, 2.65, 4.35].map((y) => (
            <mesh key={`k${y}`} position={[x * 0.93, y, 0.12]}>
              <cylinderGeometry args={[0.075, 0.075, 0.34, 16]} />
              <meshStandardMaterial {...GOLD_METAL} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 5.55, 0]}>
        <boxGeometry args={[5.5, 0.4, 0.5]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <mesh position={[0, 5.55, 0.26]}>
        <boxGeometry args={[5.3, 0.04, 0.01]} />
        <meshStandardMaterial {...GOLD_METAL} />
      </mesh>
      {/* gold DUNGEON sign above the gate */}
      <mesh position={[0, 6.35, 0.13]}>
        <planeGeometry args={[4.4, 1.1]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
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
        <meshBasicMaterial color="#F5D98B" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <sprite position={[0, 2.6, -1.5]} scale={[14, 10, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.5} />
      </sprite>
      <pointLight ref={light} position={[0, 3, -1.2]} color="#f5c870" distance={30} decay={1.3} intensity={4} />
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

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20); // the scene may resume after being paused: avoid a jump
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
      {/* warm reflections so the black metal and gold read as real metal */}
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2.5} color="#F5D98B" position={[0, 3, -12]} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#D4AF37" position={[-6, 4, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#D4AF37" position={[6, 4, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <Gate progress={progress} />
      <Embers />
      <CameraRig progress={progress} />
    </Canvas>
  );
}
