"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { makeGlowTexture, makeStoneTexture, makeTextTexture } from "./textures";
import { lerp, rand, smoothstep } from "@/lib/utils";
import { cameraFov, cameraPush, CAMERA_PUSH_Z, createSmashClock, doorOpen, SCRUB, SMASH_T, trackWeight, type SmashClock } from "@/lib/gate/smash";
import { shakeOffset } from "@/lib/intro/shake";
import { Atmosphere, Dumbbell, ImpactFX, SmashDirector } from "./gate/SmashFX";
import { PostFX } from "./gate/PostFX";

type Prog = React.MutableRefObject<number>;
type Smash = React.MutableRefObject<SmashClock>;

const GATE_Z = -16;
const IRON = { color: "#2b2622", metalness: 0.85, roughness: 0.42 };

/* ── Stone corridor with gothic arches ─────────────────── */
function Corridor({ lite }: { lite: boolean }) {
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
        {lite ? (
          <meshStandardMaterial map={floorTex} bumpMap={floorTex} bumpScale={0.6} roughness={0.85} color="#8a7f74" />
        ) : (
          // polished, slightly wet stone: soft blurred reflections of the torches and the gold gate
          <MeshReflectorMaterial
            map={floorTex}
            bumpMap={floorTex}
            bumpScale={0.6}
            color="#8a7f74"
            roughness={0.75}
            metalness={0.25}
            blur={[320, 90]}
            resolution={512}
            mixBlur={1}
            mixStrength={2.2}
            mixContrast={1}
            mirror={0.55}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
          />
        )}
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

/* ── The iron gate (two doors on real hinges) ── */
// Shared materials so the whole gate can breathe and surge with light as one piece.
type GateMats = {
  black: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  champagne: THREE.MeshStandardMaterial;
  crest: THREE.MeshStandardMaterial;
};

function useGateMats(): GateMats {
  return useMemo(
    () => ({
      black: new THREE.MeshStandardMaterial({ color: "#0c0c0d", metalness: 0.92, roughness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 1, roughness: 0.22, emissive: "#D4AF37", emissiveIntensity: 0.08 }),
      champagne: new THREE.MeshStandardMaterial({ color: "#F5D98B", metalness: 1, roughness: 0.18, emissive: "#F5D98B", emissiveIntensity: 0.1 }),
      // the crest is the target: it carries its own glow (HDR, so the bloom catches it)
      crest: new THREE.MeshStandardMaterial({ color: "#F5D98B", metalness: 1, roughness: 0.14, emissive: "#ffc864", emissiveIntensity: 0.5, toneMapped: false }),
    }),
    []
  );
}

function GateDoor({ side, m }: { side: 1 | -1; m: GateMats }) {
  // side = -1 → left door (hinge at x=-2.3); +1 → right door. Door extends from the hinge toward the centre.
  const bars = Array.from({ length: 7 }, (_, i) => 0.18 + i * 0.32);
  const x = (v: number) => -side * v;
  return (
    <group>
      {/* stiles (hinge side + meeting side) */}
      {[0.05, 2.25].map((v) => (
        <mesh key={v} position={[x(v), 2.55, 0]} material={m.black}>
          <boxGeometry args={[0.12, 5.1, 0.14]} />
        </mesh>
      ))}
      {/* bars with gold collars and spear finials */}
      {bars.map((b) => (
        <group key={b}>
          <mesh position={[x(b), 2.5, 0]} material={m.black}>
            <cylinderGeometry args={[0.05, 0.05, 5, 12]} />
          </mesh>
          {[1.15, 3.95].map((y) => (
            <mesh key={y} position={[x(b), y, 0]} material={m.gold}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
            </mesh>
          ))}
          <mesh position={[x(b), 5.2, 0]} material={m.champagne}>
            <coneGeometry args={[0.085, 0.32, 8]} />
          </mesh>
          <mesh position={[x(b), 5.02, 0]} material={m.gold}>
            <sphereGeometry args={[0.07, 12, 12]} />
          </mesh>
        </group>
      ))}
      {/* rails with a gold inlay line */}
      {[0.95, 2.0, 3.3, 4.85].map((y) => (
        <group key={y}>
          <mesh position={[x(1.15), y, 0]} material={m.black}>
            <boxGeometry args={[2.3, 0.15, 0.13]} />
          </mesh>
          <mesh position={[x(1.15), y, 0.068]} material={m.gold}>
            <boxGeometry args={[2.22, 0.025, 0.01]} />
          </mesh>
        </group>
      ))}
      {/* gold scrollwork arcs hanging under the top rail */}
      {[0.6, 1.7].map((cx) => (
        <mesh key={cx} position={[x(cx), 4.78, 0.07]} rotation-z={Math.PI} material={m.gold}>
          <torusGeometry args={[0.42, 0.018, 8, 32, Math.PI]} />
        </mesh>
      ))}
      {/* solid kick plate with gold border */}
      <mesh position={[x(1.15), 0.5, 0]} material={m.black}>
        <boxGeometry args={[2.3, 0.85, 0.08]} />
      </mesh>
      <mesh position={[x(1.15), 0.5, 0.045]} material={m.gold}>
        <boxGeometry args={[2.05, 0.6, 0.005]} />
      </mesh>
      <mesh position={[x(1.15), 0.5, 0.05]} material={m.black}>
        <boxGeometry args={[1.97, 0.52, 0.005]} />
      </mesh>
      {/* hinge straps with rivets */}
      {[0.95, 2.65, 4.35].map((y) => (
        <group key={`h${y}`} position={[x(0.3), y, 0.085]}>
          <mesh material={m.black}>
            <boxGeometry args={[0.55, 0.11, 0.03]} />
          </mesh>
          {[-0.18, 0, 0.18].map((r) => (
            <mesh key={r} position={[r, 0, 0.02]} material={m.gold}>
              <sphereGeometry args={[0.022, 8, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* half of the central crest: a gold ring + dumbbell emblem split across both doors.
          It is exactly where the dumbbell strikes, and it splits in two as the doors open. */}
      <group position={[x(2.3), 2.55, 0.11]}>
        <mesh rotation-z={(side * -Math.PI) / 2} position-z={-0.02} material={m.black}>
          <circleGeometry args={[0.6, 40, 0, Math.PI]} />
        </mesh>
        <mesh rotation-z={(side * -Math.PI) / 2} material={m.crest}>
          <torusGeometry args={[0.62, 0.05, 14, 48, Math.PI]} />
        </mesh>
        <mesh rotation-z={(side * -Math.PI) / 2} material={m.gold}>
          <torusGeometry args={[0.5, 0.014, 8, 40, Math.PI]} />
        </mesh>
        <mesh position={[side * 0.17, 0, 0.02]} material={m.crest}>
          <boxGeometry args={[0.34, 0.05, 0.04]} />
        </mesh>
        <mesh position={[side * 0.3, 0, 0.03]} material={m.crest}>
          <boxGeometry args={[0.07, 0.36, 0.06]} />
        </mesh>
        <mesh position={[side * 0.39, 0, 0.03]} material={m.crest}>
          <boxGeometry args={[0.06, 0.25, 0.06]} />
        </mesh>
      </group>
    </group>
  );
}

const signVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// gold lettering with a slow specular sweep, plus a flare on impact
const signFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uBoost;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float p = fract(uTime * 0.16) * 1.8 - 0.4;
    float band = exp(-pow((vUv.x - p - (vUv.y - 0.5) * 0.3) / 0.045, 2.0));
    vec3 col = t.rgb * (1.6 + uBoost) + vec3(1.0, 0.94, 0.8) * band * 2.2 * t.a;
    gl_FragColor = vec4(col, t.a);
    #include <colorspace_fragment>
  }
`;

function Gate({ progress, smash }: { progress: Prog; smash: Smash }) {
  const root = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const portal = useRef<THREE.Mesh>(null);
  const mats = useGateMats();
  const glow = useMemo(() => makeGlowTexture("rgba(255,240,205,1)", "rgba(212,175,55,0)"), []);
  const signMat = useMemo(() => {
    const map = makeTextTexture("DUNGEON", { color: "#F5D98B", font: "bold 150px Anton, Impact, sans-serif" });
    return new THREE.ShaderMaterial({
      vertexShader: signVert,
      fragmentShader: signFrag,
      uniforms: { uMap: { value: map }, uTime: { value: 0 }, uBoost: { value: 0 } },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
  }, []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const open = useRef(0);
  const vel = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const time = state.clock.elapsedTime;
    const sc = smash.current;
    // classic mode: scroll swings the doors; in the smash, only the dumbbell opens them
    const target = sc.t >= 0 ? 0 : smoothstep(0.08, 0.62, progress.current);
    // heavy gate on hinges: spring-damper (inertia + a tiny settle) instead of a linear follow
    const k = 26;
    const c = 9;
    vel.current += ((target - open.current) * k - vel.current * c) * dt;
    open.current += vel.current * dt;
    // the smash drives the doors directly (its recoil shudder must not be smoothed away); scroll still works too
    const o = Math.max(open.current, sc.t >= 0 ? doorOpen(sc.t) : 0);
    const a = Math.max(0, o) * 1.75;
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;

    // light: idle breathing → a surge racing through the gold on impact → steady glow as it opens
    const surge = sc.t >= SMASH_T.impact ? Math.exp(-(sc.t - SMASH_T.impact) * 2.2) : 0;
    const breathe = 0.5 + 0.5 * Math.sin(time * 1.3);
    mats.gold.emissiveIntensity = 0.06 + breathe * 0.05 + surge * 2.4 + o * 0.12;
    mats.champagne.emissiveIntensity = 0.08 + breathe * 0.06 + surge * 2.8 + o * 0.15;
    mats.crest.emissiveIntensity = 0.45 + breathe * 0.35 + surge * 7;
    signMat.uniforms.uTime.value = time;
    signMat.uniforms.uBoost.value = surge * 2.5 + o * 0.4;

    if (light.current) light.current.intensity = 4 + o * 60 + surge * 25;
    if (portal.current) {
      const m = portal.current.material as THREE.MeshBasicMaterial;
      m.opacity = Math.min(1, 0.2 + o * 0.8 + surge * 0.5);
    }
    // the whole gate rattles in its frame on impact
    if (root.current) {
      const sh = shakeOffset(sc.trauma, time * 1.7, { pos: 0.05, roll: 0.006 });
      root.current.position.set(sh.x, sh.y * 0.5, GATE_Z);
      root.current.rotation.z = sh.roll;
    }
  });

  return (
    <group ref={root} position={[0, 0, GATE_Z]}>
      {/* frame: black posts with gold capitals and bases */}
      {[-2.55, 2.55].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.8, 0]} material={mats.black}>
            <boxGeometry args={[0.4, 5.6, 0.5]} />
          </mesh>
          {/* gold edge lines running up the posts */}
          {[-0.21, 0.21].map((dx) => (
            <mesh key={dx} position={[x + dx, 2.8, 0.26]} material={mats.gold}>
              <boxGeometry args={[0.018, 5.1, 0.01]} />
            </mesh>
          ))}
          {[0.12, 5.3].map((y) => (
            <mesh key={y} position={[x, y, 0]} material={mats.gold}>
              <boxGeometry args={[0.5, 0.18, 0.6]} />
            </mesh>
          ))}
          {/* hinge knuckles on the frame */}
          {[0.95, 2.65, 4.35].map((y) => (
            <mesh key={`k${y}`} position={[x * 0.93, y, 0.12]} material={mats.gold}>
              <cylinderGeometry args={[0.075, 0.075, 0.34, 16]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 5.55, 0]} material={mats.black}>
        <boxGeometry args={[5.5, 0.4, 0.5]} />
      </mesh>
      <mesh position={[0, 5.55, 0.26]} material={mats.gold}>
        <boxGeometry args={[5.3, 0.04, 0.01]} />
      </mesh>
      {/* gold DUNGEON sign above the gate, with a slow light sweep */}
      <mesh position={[0, 6.35, 0.13]} material={signMat}>
        <planeGeometry args={[4.4, 1.1]} />
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
        <GateDoor side={-1} m={mats} />
      </group>
      <group ref={right} position={[2.3, 0, 0]}>
        <GateDoor side={1} m={mats} />
      </group>

      {/* dramatic key light: a warm pool on the gate from above */}
      <primitive object={spotTarget} position={[0, 2.4, 0]} />
      <spotLight position={[0, 7.4, 5.5]} target={spotTarget} angle={0.42} penumbra={0.85} intensity={130} decay={1.4} distance={24} color="#ffe2b8" />

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
function CameraRig({ progress, smash }: { progress: Prog; smash: Smash }) {
  const { camera, pointer } = useThree();
  const intro = useRef(0);
  const smooth = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20); // the scene may resume after being paused: avoid a jump
    intro.current = Math.min(1, intro.current + dt * 0.35);
    const introEase = 1 - Math.pow(1 - intro.current, 3);
    smooth.current = lerp(smooth.current, progress.current, 1 - Math.exp(-dt * 4));
    const p = smooth.current;
    const c = smash.current;
    // scroll-scrubbed smash: the camera only walks in once the doors are (nearly) open
    const travel = c.scrub
      ? smoothstep(SCRUB.share + 0.03, 1, p) * smoothstep(0.5, 1, doorOpen(Math.max(0, c.t)))
      : smoothstep(0.05, 1, p);

    // smash: a slow, suspenseful push toward the gate before the throw (kept once it has played)
    const push = c.t >= 0 ? cameraPush(c.t) : 0;
    const base = lerp(lerp(14, 9, introEase), CAMERA_PUSH_Z, push);
    const z = lerp(base, -18.5, travel);
    const bob = Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    const sh = shakeOffset(c.trauma, state.clock.elapsedTime);
    camera.position.x = lerp(camera.position.x, pointer.x * 0.6, 1 - Math.exp(-dt * 2));
    camera.position.y = lerp(camera.position.y, 1.7 + pointer.y * 0.25 + bob, 1 - Math.exp(-dt * 2));
    camera.position.z = z;
    look.set(pointer.x * 0.3, 2.1, z - 10);
    // follow the flying dumbbell (partially, so the gate stays the destination of the shot)
    const tw = c.t >= 0 ? trackWeight(c.t) * 0.55 : 0;
    if (tw > 0) look.lerp(target.set(c.target.x, c.target.y, c.target.z), tw);
    camera.position.x += sh.x;
    camera.position.y += sh.y;
    camera.lookAt(look);
    camera.rotateZ(sh.roll);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = c.t >= 0 ? cameraFov(Math.min(c.t, SMASH_T.end)) : 58;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export type GateSceneProps = {
  progress: Prog;
  active?: boolean;
  /** dumbbell-smash timeline shared with the page overlay; omit for the plain scroll-driven gate */
  smash?: Smash;
  /** fewer particles for phones / low-power devices */
  lite?: boolean;
  onReady?: () => void;
};

export default function GateScene({ progress, active = true, smash, lite = false, onReady }: GateSceneProps) {
  const fallback = useRef<SmashClock>(createSmashClock());
  const clock = smash ?? fallback;
  return (
    <Canvas
      dpr={lite ? [1, 1.25] : [1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 1.7, 14], fov: 58, near: 0.1, far: 70 }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
      onCreated={() => onReady?.()}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 8, 44]} />
      <ambientLight intensity={0.12} color="#ffd9b0" />
      <hemisphereLight args={["#3a2a1a", "#000000", 0.25]} />
      <Corridor lite={lite} />
      <Torches />
      {/* warm reflections so the black metal and gold read as real metal */}
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2.5} color="#F5D98B" position={[0, 3, -12]} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#D4AF37" position={[-6, 4, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#D4AF37" position={[6, 4, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <SmashDirector clock={clock} />
      <Gate progress={progress} smash={clock} />
      {smash && <Dumbbell clock={clock} lite={lite} />}
      {smash && <ImpactFX clock={clock} lite={lite} />}
      <Atmosphere clock={clock} lite={lite} />
      <Embers count={lite ? 160 : 380} />
      <CameraRig progress={progress} smash={clock} />
      {!lite && <PostFX clock={clock} />}
    </Canvas>
  );
}
