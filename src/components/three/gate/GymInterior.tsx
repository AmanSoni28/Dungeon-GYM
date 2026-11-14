"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeGlowTexture, makeTextTexture } from "../textures";
import { rand, smoothstep } from "@/lib/utils";

/**
 * The gym behind the gate, built in 3D (no photos). Dark hall, black iron and gold.
 * As the doors open (`level` 0 → 1) the hall powers up front to back: ceiling light bars flicker on,
 * gold wall strips ignite, floor lines draw forward, then the spotlight lands on the lifting platform
 * and the DUNGEON wordmark ignites last. Coordinates are local to the gate (z = 0 at the gate, room goes to −11.9).
 */
const ROOM = { w: 7.8, h: 6.88, z0: -0.15, z1: -11.9 };
const ROWS = [-1.6, -3.2, -4.8, -6.4, -8, -9.6, -11.1]; // ceiling bars / wall strips, front → back
const PLATFORM_Z = -7;

/** Stagger: row i turns on a little after row i − 1. */
const rowOn = (level: number, i: number) => smoothstep(0.12 + i * 0.07, 0.24 + i * 0.07, level);
/** A tube light catching: hard on/off stutter while it's warming up. */
const stutter = (on: number, t: number, seed: number) => (on > 0.02 && on < 0.97 && Math.sin(t * 57 + seed * 7.3) < -0.2 ? 0.2 : 1);

function Dumbbell({ position, size }: { position: [number, number, number]; size: number }) {
  return (
    <group position={position}>
      <mesh rotation-z={Math.PI / 2} material={MATS().steel}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2} material={MATS().rubber}>
          <cylinderGeometry args={[size, size, 0.09, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Barbell({ position, rotationY = 0, plates = 2 }: { position: [number, number, number]; rotationY?: number; plates?: number }) {
  const m = MATS();
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh rotation-z={Math.PI / 2} material={m.steel}>
        <cylinderGeometry args={[0.022, 0.022, 2.2, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: plates }, (_, i) => (
            <mesh key={i} position={[s * (0.72 + i * 0.07), 0, 0]} rotation-z={Math.PI / 2} material={m.rubber}>
              <cylinderGeometry args={[0.22 - i * 0.04, 0.22 - i * 0.04, 0.06, 28]} />
            </mesh>
          ))}
          <mesh position={[s * (0.68 + plates * 0.07), 0, 0]} rotation-z={Math.PI / 2} material={m.gold}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PowerRack({ position }: { position: [number, number, number] }) {
  const m = MATS();
  return (
    <group position={position}>
      {[-0.55, 0.55].flatMap((x) =>
        [-1.05, 1.05].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.25, z]} material={m.iron}>
            <boxGeometry args={[0.08, 2.5, 0.08]} />
          </mesh>
        ))
      )}
      {[-1.05, 1.05].map((z) => (
        <mesh key={z} position={[0, 2.5, z]} material={m.iron}>
          <boxGeometry args={[1.18, 0.08, 0.08]} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.5, 0]} material={m.iron}>
            <boxGeometry args={[0.08, 0.08, 2.18]} />
          </mesh>
          {/* gold J-hooks */}
          <mesh position={[x, 1.38, -0.88]} material={m.gold}>
            <boxGeometry args={[0.1, 0.05, 0.08]} />
          </mesh>
          <mesh position={[x, 1.38, 0.88]} material={m.gold}>
            <boxGeometry args={[0.1, 0.05, 0.08]} />
          </mesh>
        </group>
      ))}
      <Barbell position={[0, 1.43, 0]} rotationY={Math.PI / 2} />
      {/* bench in front of the rack */}
      <group position={[-0.05, 0, 0]}>
        <mesh position={[0, 0.44, 0]} material={m.pad}>
          <boxGeometry args={[0.3, 0.08, 1.2]} />
        </mesh>
        {[-0.45, 0.45].map((z) => (
          <mesh key={z} position={[0, 0.2, z]} material={m.iron}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function DumbbellRack({ x, dir }: { x: number; dir: 1 | -1 }) {
  const m = MATS();
  const zs = Array.from({ length: 9 }, (_, i) => -2.6 - i * 0.42);
  return (
    <group position={[x, 0, 0]}>
      {[0.5, 0.92].map((y, tier) => (
        <group key={y}>
          <mesh position={[0, y - 0.07, -4.28]} material={m.iron}>
            <boxGeometry args={[0.5, 0.04, 3.9]} />
          </mesh>
          {zs.map((z, i) => (
            <Dumbbell key={z} position={[0, y, z]} size={0.075 + (tier ? i : i + 9) * 0.003} />
          ))}
        </group>
      ))}
      {[-2.3, -6.25].map((z) => (
        <mesh key={z} position={[0, 0.45, z]} material={m.iron}>
          <boxGeometry args={[0.5, 0.9, 0.05]} />
        </mesh>
      ))}
      {/* gold edge along the rack */}
      <mesh position={[dir * 0.26, 0.94, -4.28]} material={m.gold}>
        <boxGeometry args={[0.012, 0.012, 3.9]} />
      </mesh>
    </group>
  );
}

// one material set per mount (the scene has a single gym); lazily created so SSR never touches WebGL
let mats: ReturnType<typeof createMats> | null = null;
function createMats() {
  return {
    iron: new THREE.MeshStandardMaterial({ color: "#121113", metalness: 0.9, roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: "#8c8a86", metalness: 1, roughness: 0.25 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#0d0d0e", metalness: 0.2, roughness: 0.55 }),
    pad: new THREE.MeshStandardMaterial({ color: "#1a1412", metalness: 0.1, roughness: 0.6 }),
    gold: new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 1, roughness: 0.2, emissive: "#D4AF37", emissiveIntensity: 0.15 }),
  };
}
function MATS() {
  return (mats ??= createMats());
}

export function GymInterior({ level }: { level: React.MutableRefObject<number> }) {
  const bars = useMemo(() => ROWS.map(() => new THREE.MeshBasicMaterial({ color: "#000", toneMapped: false })), []);
  const strips = useMemo(() => ROWS.map(() => new THREE.MeshBasicMaterial({ color: "#000", toneMapped: false })), []);
  const line = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000", toneMapped: false }), []);
  const logo = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: makeTextTexture("DUNGEON", { color: "#F5D98B", font: "bold 150px Anton, Impact, sans-serif" }),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        color: "#000",
      }),
    []
  );
  const beam = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    []
  );
  const glow = useMemo(() => makeGlowTexture("rgba(255,225,170,1)", "rgba(212,175,55,0)"), []);
  const pool = useRef<THREE.SpriteMaterial>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const lineL = useRef<THREE.Mesh>(null);
  const lineR = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Points>(null);
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, PLATFORM_Z);
    return o;
  }, []);
  const dustPos = useMemo(() => {
    const a = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const r = Math.sqrt(rand(i + 3)) * 1.1;
      const th = rand(i + 99) * Math.PI * 2;
      a[i * 3] = Math.cos(th) * r;
      a[i * 3 + 1] = rand(i + 7) * 5.5;
      a[i * 3 + 2] = PLATFORM_Z + Math.sin(th) * r;
    }
    return a;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const L = level.current;
    ROWS.forEach((_, i) => {
      const on = rowOn(L, i);
      const k = on * stutter(on, t, i);
      bars[i].color.setRGB(2.1 * k, 1.85 * k, 1.45 * k);
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.6 - i * 0.6); // a slow gold wave running down the hall
      strips[i].color.setRGB(1.9 * k * pulse, 1.35 * k * pulse, 0.45 * k * pulse);
    });
    // floor lines draw from the gate toward the platform
    const draw = smoothstep(0.2, 0.75, L);
    for (const m of [lineL.current, lineR.current]) {
      if (!m) continue;
      m.scale.z = Math.max(0.001, draw);
      m.position.z = ROOM.z0 + ((ROOM.z1 - ROOM.z0) * draw) / 2;
    }
    line.color.setRGB(1.6 * draw, 1.15 * draw, 0.4 * draw);
    // the hero moment: spotlight lands on the platform, then the wordmark ignites
    const hero = smoothstep(0.55, 0.85, L);
    const brand = smoothstep(0.7, 1, L);
    if (spot.current) spot.current.intensity = 90 * hero;
    if (fill.current) fill.current.intensity = 14 * smoothstep(0.15, 0.6, L);
    beam.opacity = 0.05 * hero;
    if (pool.current) pool.current.opacity = 0.35 * hero;
    logo.color.setScalar(1.7 * brand * (0.92 + 0.08 * Math.sin(t * 2.1)));
    // dust drifting in the beam
    const p = dust.current;
    if (p) {
      (p.material as THREE.PointsMaterial).opacity = 0.7 * hero;
      const arr = p.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 90; i++) {
        arr[i * 3 + 1] += dt * (0.05 + rand(i) * 0.08);
        arr[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.03;
        if (arr[i * 3 + 1] > 5.5) arr[i * 3 + 1] = 0;
      }
      p.geometry.attributes.position.needsUpdate = true;
    }
  });

  const zMid = (ROOM.z0 + ROOM.z1) / 2;
  const depth = ROOM.z0 - ROOM.z1;
  const hw = ROOM.w / 2;
  const m = MATS();

  return (
    <group>
      {/* shell: polished black rubber floor, matte black walls and ceiling */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, zMid]}>
        <planeGeometry args={[ROOM.w, depth]} />
        <meshStandardMaterial color="#0c0b0b" metalness={0.5} roughness={0.32} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, ROOM.h, zMid]}>
        <planeGeometry args={[ROOM.w, depth]} />
        <meshStandardMaterial color="#060606" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * hw, ROOM.h / 2, zMid]} rotation-y={-s * (Math.PI / 2)}>
          <planeGeometry args={[depth, ROOM.h]} />
          <meshStandardMaterial color="#0e0d0c" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, ROOM.h / 2, ROOM.z1]}>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial color="#0b0a0a" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* ceiling light bars + gold wall strips, one pair per row */}
      {ROWS.map((z, i) => (
        <group key={z}>
          <mesh position={[0, 5.9, z]} material={bars[i]}>
            <boxGeometry args={[5.2, 0.05, 0.14]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (hw - 0.03), 2.9, z]} material={strips[i]}>
              <boxGeometry args={[0.03, 4.4, 0.05]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* floor runway lines (full length, scaled from the gate end) */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} ref={x < 0 ? lineL : lineR} position={[x, 0.03, ROOM.z0]} material={line}>
          <boxGeometry args={[0.03, 0.01, depth]} />
        </mesh>
      ))}

      {/* equipment */}
      <DumbbellRack x={-hw + 0.4} dir={1} />
      <PowerRack position={[hw - 1.1, 0, -4]} />
      <PowerRack position={[hw - 1.1, 0, -8.6]} />
      <group position={[-hw + 1.5, 0, -8.8]}>
        {[0.32, 0.46, 0.6].map((y, i) => (
          <mesh key={y} position={[0, y / 2, i * 0.02]} rotation-x={Math.PI / 2} material={i === 2 ? m.gold : m.rubber}>
            <cylinderGeometry args={[0.24 - i * 0.03, 0.24 - i * 0.03, y, 28]} />
          </mesh>
        ))}
      </group>

      {/* lifting platform under the spotlight, with a loaded bar */}
      <group position={[0, 0, PLATFORM_Z]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[2.6, 0.06, 2.4]} />
          <meshStandardMaterial color="#1a1310" metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.072, 0]} material={m.gold}>
          <boxGeometry args={[2.66, 0.004, 2.46]} />
        </mesh>
        <mesh position={[0, 0.076, 0]}>
          <boxGeometry args={[2.5, 0.004, 2.3]} />
          <meshStandardMaterial color="#1a1310" metalness={0.2} roughness={0.5} />
        </mesh>
        <Barbell position={[0, 0.3, 0]} plates={3} />
        <sprite position={[0, 0.1, 0]} scale={[4.2, 2.4, 1]}>
          <spriteMaterial ref={pool} map={glow} blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
        </sprite>
        <mesh position={[0, 3.2, 0]} material={beam}>
          <coneGeometry args={[1.4, 6, 32, 1, true]} />
        </mesh>
        <points ref={dust}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dustPos, 3]} />
          </bufferGeometry>
          <pointsMaterial map={glow} size={0.05} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#ffe2b0" toneMapped={false} />
        </points>
      </group>
      <primitive object={spotTarget} />
      <spotLight ref={spot} position={[0, 6.6, PLATFORM_Z]} target={spotTarget} angle={0.38} penumbra={0.7} intensity={0} decay={1.4} distance={12} color="#ffe2b8" />
      <pointLight ref={fill} position={[0, 4.8, -5]} color="#ffd29a" intensity={0} distance={16} decay={1.5} />

      {/* back wall: the wordmark between two gold rules */}
      <mesh position={[0, 4.3, ROOM.z1 + 0.02]} material={logo}>
        <planeGeometry args={[4.4, 1.1]} />
      </mesh>
      {[3.6, 5.0].map((y) => (
        <mesh key={y} position={[0, y, ROOM.z1 + 0.03]} material={m.gold}>
          <boxGeometry args={[3.6, 0.02, 0.01]} />
        </mesh>
      ))}
    </group>
  );
}
