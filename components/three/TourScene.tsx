"use client";

import { Canvas, useFrame, useThree, useLoader, type ThreeElements } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeFloorTexture, makeGlowTexture, makeStoneTexture, makeTextTexture } from "./textures";
import type { TourZone } from "@/data/site";
import { rand } from "@/lib/utils";

const IRON = { color: "#2a2724", metalness: 0.8, roughness: 0.35 };
const CHROME = { color: "#c8c4bd", metalness: 1, roughness: 0.18 };
const GOLD = { color: "#c9a24b", metalness: 1, roughness: 0.28, emissive: "#3a2808", emissiveIntensity: 0.5 };
const RUBBER = { color: "#151413", metalness: 0.1, roughness: 0.7 };

/* ── Room shell ─────────────────────────────── */
function Hall() {
  const floor = useMemo(() => {
    const t = makeFloorTexture();
    t.repeat.set(10, 9);
    return t;
  }, []);
  const stone = useMemo(() => {
    const t = makeStoneTexture({ rows: 8, cols: 4, base: 32, seed: 3 });
    t.repeat.set(8, 2);
    return t;
  }, []);
  const sign = useMemo(() => makeTextTexture("DUNGEON", { color: "#e8c063" }), []);
  const fire = useMemo(() => makeTextTexture("NO PAIN · NO GAIN", { color: "#ff7a2f", font: "bold 110px Impact, sans-serif" }), []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[40, 36]} />
        <meshStandardMaterial map={floor} roughness={0.75} metalness={0.1} />
      </mesh>
      <mesh position={[0, 8, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[40, 36]} />
        <meshStandardMaterial color="#0b0a09" roughness={1} />
      </mesh>
      {/* walls */}
      {[
        { p: [0, 4, -18], r: 0 },
        { p: [0, 4, 18], r: Math.PI },
        { p: [-20, 4, 0], r: Math.PI / 2 },
        { p: [20, 4, 0], r: -Math.PI / 2 },
      ].map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]} rotation-y={w.r}>
          <planeGeometry args={[i < 2 ? 40 : 36, 8]} />
          <meshStandardMaterial map={stone} bumpMap={stone} bumpScale={0.8} color="#6e655c" roughness={0.95} />
        </mesh>
      ))}
      {/* ceiling light strips */}
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={x} position={[x, 7.9, 0]}>
          <boxGeometry args={[0.18, 0.05, 30]} />
          <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
        </mesh>
      ))}
      {/* gold sign on back wall */}
      <mesh position={[0, 5.4, -17.9]}>
        <planeGeometry args={[12, 3]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      {/* "wall of fire" on the cardio side */}
      <mesh position={[19.9, 5.2, 2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[12, 3]} />
        <meshBasicMaterial map={fire} transparent toneMapped={false} />
      </mesh>
      <mesh position={[19.85, 0.5, 2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[18, 0.08]} />
        <meshBasicMaterial color="#ff6a20" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── Iron Pit ───────────────────────────────── */
function Dumbbell({ size = 1, ...props }: { size?: number } & ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 8]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x * size, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.08 * size, 0.08 * size, 0.1 * size, 6]} />
          <meshStandardMaterial {...RUBBER} />
        </mesh>
      ))}
    </group>
  );
}

function IronPit() {
  return (
    <group position={[-13, 0, 2]}>
      {/* dumbbell rack along the wall */}
      <group position={[-5.5, 0, 0]} rotation-y={Math.PI / 2}>
        {[0.55, 1.05].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[9, 0.06, 0.7]} />
            <meshStandardMaterial {...IRON} />
          </mesh>
        ))}
        {[-4.4, 0, 4.4].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]}>
            <boxGeometry args={[0.08, 1.1, 0.7]} />
            <meshStandardMaterial {...IRON} />
          </mesh>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <group key={i}>
            <Dumbbell size={0.8 + i * 0.05} position={[-4 + i * 0.6, 0.66, 0.15]} rotation-y={Math.PI / 2} />
            <Dumbbell size={1.2 + i * 0.04} position={[-4 + i * 0.6, 1.16, -0.1]} rotation-y={Math.PI / 2} />
          </group>
        ))}
      </group>
      {/* power racks */}
      {[-2, 2.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[
            [-0.7, -0.6],
            [0.7, -0.6],
            [-0.7, 0.6],
            [0.7, 0.6],
          ].map(([x, zz], i) => (
            <mesh key={i} position={[x, 1.25, zz]}>
              <boxGeometry args={[0.08, 2.5, 0.08]} />
              <meshStandardMaterial {...IRON} color="#1d1b19" />
            </mesh>
          ))}
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[1.5, 0.08, 1.3]} />
            <meshStandardMaterial {...IRON} color="#1d1b19" />
          </mesh>
          {/* barbell */}
          <group position={[0, 1.45, -0.6]}>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 2.2, 8]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
            {[-0.95, 0.95].map((x) => (
              <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
                <meshStandardMaterial {...RUBBER} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {/* bench */}
      <group position={[2.5, 0, -4.5]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.35, 0.1, 1.3]} />
          <meshStandardMaterial color="#3a1f12" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 1]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      </group>
      <pointLight position={[0, 5, 0]} intensity={30} distance={14} color="#ffb070" />
    </group>
  );
}

/* ── Cardio deck ────────────────────────────── */
function Cardio() {
  return (
    <group position={[14, 0, 2]}>
      {[-4.5, -1.5, 1.5, 4.5].map((z) => (
        <group key={z} position={[0, 0, z]} rotation-y={-Math.PI / 2}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.85, 0.22, 2]} />
            <meshStandardMaterial color="#1a1918" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <boxGeometry args={[0.6, 0.02, 1.7]} />
            <meshStandardMaterial color="#080808" roughness={0.9} />
          </mesh>
          {[-0.38, 0.38].map((x) => (
            <mesh key={x} position={[x, 0.75, -0.85]} rotation-x={0.15}>
              <boxGeometry args={[0.05, 1.1, 0.05]} />
              <meshStandardMaterial {...IRON} />
            </mesh>
          ))}
          <mesh position={[0, 1.32, -0.95]} rotation-x={-0.5}>
            <boxGeometry args={[0.8, 0.35, 0.06]} />
            <meshStandardMaterial color="#111" emissive="#ff6a20" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      <pointLight position={[2, 4, 0]} intensity={26} distance={14} color="#ff8040" />
    </group>
  );
}

/* ── Combat zone ────────────────────────────── */
function Combat() {
  const bags = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    bags.current?.children.forEach((b, i) => {
      b.rotation.z = Math.sin(clock.elapsedTime * 1.2 + i) * 0.04;
    });
  });
  return (
    <group position={[-10, 0, -11]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <planeGeometry args={[12, 9]} />
        <meshStandardMaterial color="#14241a" roughness={1} />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.02, 0]}>
          <planeGeometry args={[0.06, 9]} />
          <meshBasicMaterial color="#d9d3c7" />
        </mesh>
      ))}
      <group ref={bags}>
        {[-3.5, -1.2, 1.2, 3.5].map((x) => (
          <group key={x} position={[x, 7.5, -2.5]}>
            <mesh position={[0, -1.4, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 2.8, 4]} />
              <meshStandardMaterial {...CHROME} />
            </mesh>
            <mesh position={[0, -3.9, 0]}>
              <capsuleGeometry args={[0.33, 1.5, 6, 16]} />
              <meshStandardMaterial color="#5c1810" roughness={0.45} />
            </mesh>
            <mesh position={[0, -3.5, 0]}>
              <cylinderGeometry args={[0.345, 0.345, 0.12, 20]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
          </group>
        ))}
      </group>
      {/* rig */}
      {[-5, 5].map((x) => (
        <mesh key={x} position={[x, 1.6, 2.5]}>
          <boxGeometry args={[0.1, 3.2, 0.1]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 2.5]}>
        <boxGeometry args={[10.1, 0.1, 0.1]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {[-2, 0, 2].map((x) => (
        <mesh key={x} position={[x, 2.5, 2.5]}>
          <torusGeometry args={[0.12, 0.025, 8, 20]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      <pointLight position={[0, 5, 0]} intensity={24} distance={13} color="#ff9050" />
    </group>
  );
}

/* ── Spa sanctum ────────────────────────────── */
function Spa() {
  const water = useRef<THREE.MeshStandardMaterial>(null);
  const steam = useRef<THREE.Points>(null);
  const tex = useMemo(() => makeGlowTexture("rgba(220,245,245,0.6)", "rgba(200,240,240,0)"), []);
  const count = 120;
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (rand(i + 3) - 0.5) * 6;
      a[i * 3 + 1] = rand(i + 9) * 3;
      a[i * 3 + 2] = (rand(i + 17) - 0.5) * 3;
    }
    return a;
  }, []);

  useFrame(({ clock }, dt) => {
    if (water.current) water.current.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 1.5) * 0.12;
    const p = steam.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * 0.35;
      if (arr[i * 3 + 1] > 3.5) arr[i * 3 + 1] = 0;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group position={[11, 0, -11]}>
      {/* plunge pool */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[7, 0.5, 4]} />
        <meshStandardMaterial color="#d9d0c2" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.51, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6.4, 3.4]} />
        <meshStandardMaterial ref={water} color="#0d4a52" emissive="#2fb5c0" emissiveIntensity={0.6} metalness={0.3} roughness={0.08} />
      </mesh>
      <points ref={steam} position={[0, 0.6, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex} size={1.2} transparent depthWrite={false} opacity={0.35} />
      </points>
      {/* sauna cabin */}
      <group position={[0, 0, -5]}>
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[5, 3.2, 2.5]} />
          <meshStandardMaterial color="#7a4c2a" roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.4, 1.26]}>
          <planeGeometry args={[1.2, 2.4]} />
          <meshStandardMaterial color="#ffb070" emissive="#ff9a40" emissiveIntensity={0.8} transparent opacity={0.85} />
        </mesh>
      </group>
      {/* teal arch */}
      <mesh position={[0, 0, 3]}>
        <torusGeometry args={[2.6, 0.05, 8, 48, Math.PI]} />
        <meshBasicMaterial color="#7fe0e6" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={30} distance={14} color="#6ad8e0" />
    </group>
  );
}

/* ── Entry / reception ──────────────────────── */
function Entry() {
  return (
    <group position={[0, 0, 15]}>
      <mesh position={[4, 0.55, 0]}>
        <boxGeometry args={[4, 1.1, 1]} />
        <meshStandardMaterial color="#121110" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[4, 1.11, 0.51]}>
        <boxGeometry args={[4, 0.03, 0.02]} />
        <meshBasicMaterial color="#e8c063" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={18} distance={12} color="#ffd7a0" />
    </group>
  );
}

/* ── Optional real 360° photo (equirectangular) ── */
function Panorama({ url }: { url: string }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const { camera } = useThree();
  return (
    <mesh position={camera.position.toArray()} scale={[-1, 1, 1]}>
      <sphereGeometry args={[30, 64, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

/* ── Drag-to-look camera that glides between zones ── */
function LookRig({ zone }: { zone: TourZone }) {
  const { camera, gl } = useThree();
  const s = useRef({ yaw: zone.look, pitch: 0, tYaw: zone.look, tPitch: 0, drag: false, lx: 0, ly: 0, idle: 0 });
  const target = useMemo(() => new THREE.Vector3(...zone.position), [zone]);

  useEffect(() => {
    const st = s.current;
    // turn the shortest way round to the new zone's view
    st.tYaw = zone.look + Math.PI * 2 * Math.round((st.yaw - zone.look) / (Math.PI * 2));
    st.tPitch = 0;
    st.idle = 0;
  }, [zone]);

  useEffect(() => {
    const el = gl.domElement;
    const st = s.current;
    const down = (e: PointerEvent) => {
      st.drag = true;
      st.lx = e.clientX;
      st.ly = e.clientY;
      st.idle = 0;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!st.drag) return;
      st.tYaw += (e.clientX - st.lx) * 0.005;
      st.tPitch = Math.max(-0.7, Math.min(0.7, st.tPitch + (e.clientY - st.ly) * 0.004));
      st.lx = e.clientX;
      st.ly = e.clientY;
    };
    const up = () => (st.drag = false);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const st = s.current;
    if (!st.drag) st.idle += dt;
    if (st.idle > 2.5) st.tYaw += dt * 0.07; // gentle auto-pan when idle
    const k = 1 - Math.exp(-dt * 5);
    st.yaw += (st.tYaw - st.yaw) * k;
    st.pitch += (st.tPitch - st.pitch) * k;
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.2));
    camera.rotation.set(st.pitch, st.yaw, 0, "YXZ");
  });
  return null;
}

function Hotspot({ zone, onSelect }: { zone: TourZone; onSelect: (z: TourZone) => void }) {
  return (
    <Html position={[zone.position[0], 1.2, zone.position[2]]} center zIndexRange={[20, 0]}>
      <button className="hotspot" onClick={() => onSelect(zone)} data-cursor="Go">
        <span className="hotspot__ring" />
        <span className="hotspot__label">{zone.name}</span>
      </button>
    </Html>
  );
}

export default function TourScene({
  zone,
  zones,
  onSelect,
  active,
}: {
  zone: TourZone;
  zones: TourZone[];
  onSelect: (z: TourZone) => void;
  active: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: zone.position, fov: 72, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#080706"]} />
      <fog attach="fog" args={["#080706", 14, 42]} />
      <ambientLight intensity={0.35} color="#ffe6cc" />
      <hemisphereLight args={["#4a3a2a", "#0a0806", 0.5]} />
      {zone.image ? (
        <Suspense fallback={null}>
          <Panorama url={zone.image} />
        </Suspense>
      ) : (
        <>
          <Hall />
          <IronPit />
          <Cardio />
          <Combat />
          <Spa />
          <Entry />
        </>
      )}
      {zones
        .filter((z) => z.id !== zone.id)
        .map((z) => (
          <Hotspot key={z.id} zone={z} onSelect={onSelect} />
        ))}
      <LookRig zone={zone} />
    </Canvas>
  );
}
