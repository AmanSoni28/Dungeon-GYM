"use client";

// 3D pieces of the dumbbell gate smash. Every component reads the shared SmashClock each frame
// (no React renders during the animation) and re-arms itself when the clock's run id changes (replay).
// Bright parts are written in HDR (values > 1, toneMapped off) so the bloom pass makes them glow.

import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  beatsCrossed,
  flightPose,
  flightProgress,
  GATE_FACE,
  gateLight,
  reboundBody,
  SMASH_T,
  stepBody,
  timeScale,
  type Body,
  type SmashClock,
} from "@/lib/gate/smash";
import { decayTrauma } from "@/lib/intro/shake";
import { rand } from "@/lib/utils";
import { makeGlowTexture } from "../textures";

type Clock = React.MutableRefObject<SmashClock>;

/** past this delay an effect is "caught up" silently (skip / tab switch) instead of played */
const LATE = 0.3;

/* ── Clock driver: advances time (with bullet time), fires beats, decays shake ── */
export function SmashDirector({ clock }: { clock: Clock }) {
  useFrame((_, raw) => {
    const c = clock.current;
    const dt = Math.min(raw, 1 / 20);
    c.scale = c.running ? timeScale(c.t) : c.frozen ? 0 : 1;
    if (c.running) {
      const prev = c.t;
      c.t += dt * c.scale;
      for (const beat of beatsCrossed(prev, c.t)) {
        if (beat === "impact") c.trauma = Math.min(1, c.trauma + 0.95);
        c.onBeat?.(beat);
      }
      if (c.t >= SMASH_T.end) c.running = false;
    }
    c.trauma = decayTrauma(c.trauma, dt, 1.5);
  });
  return null;
}

/* ── The dumbbell ─────────────────────────────────────── */
type DumbbellMats = { steel: THREE.Material; knurl: THREE.Material; plate: THREE.Material; rim: THREE.Material; gold: THREE.MeshStandardMaterial; hot: THREE.MeshStandardMaterial };

function useDumbbellMats(): DumbbellMats {
  return useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({ color: "#d4d1cb", metalness: 1, roughness: 0.18 }),
      knurl: new THREE.MeshStandardMaterial({ color: "#8f8b85", metalness: 1, roughness: 0.55 }),
      plate: new THREE.MeshStandardMaterial({ color: "#141414", metalness: 0.55, roughness: 0.42 }),
      rim: new THREE.MeshStandardMaterial({ color: "#222120", metalness: 1, roughness: 0.16 }),
      gold: new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 1, roughness: 0.2, emissive: "#D4AF37", emissiveIntensity: 0.4 }),
      // thin edge lines that run hot while it flies (bloom turns them into light)
      hot: new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 1, roughness: 0.2, emissive: "#ffa630", emissiveIntensity: 0.6, toneMapped: false }),
    }),
    []
  );
}

const PLATES = [
  { x: 0.42, r: 0.34, w: 0.09 },
  { x: 0.52, r: 0.3, w: 0.09 },
  { x: 0.61, r: 0.25, w: 0.08 },
];

function DumbbellModel({ m }: { m: DumbbellMats }) {
  // long axis = local X, ~1.5 m: a massive, hero-sized dumbbell
  return (
    <group>
      <mesh rotation-z={Math.PI / 2} material={m.knurl}>
        <cylinderGeometry args={[0.052, 0.052, 0.62, 20]} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} material={m.steel}>
        <cylinderGeometry args={[0.046, 0.046, 1.5, 20]} />
      </mesh>
      {/* gold grip bands */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2} material={m.gold}>
          <cylinderGeometry args={[0.056, 0.056, 0.02, 20]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.345, 0, 0]} rotation-z={Math.PI / 2} material={m.steel}>
            <cylinderGeometry args={[0.085, 0.085, 0.06, 24]} />
          </mesh>
          {PLATES.map((p) => (
            <group key={p.x} position={[s * p.x, 0, 0]}>
              <mesh rotation-z={Math.PI / 2} material={m.plate}>
                <cylinderGeometry args={[p.r, p.r, p.w, 56]} />
              </mesh>
              {/* polished raised rim + a gold ring on the face + a hot gold edge on the circumference */}
              <mesh rotation-y={Math.PI / 2} position={[s * (p.w / 2 + 0.002), 0, 0]} material={m.rim}>
                <torusGeometry args={[p.r - 0.028, 0.013, 8, 56]} />
              </mesh>
              <mesh rotation-y={Math.PI / 2} position={[s * (p.w / 2 + 0.004), 0, 0]} material={m.gold}>
                <torusGeometry args={[p.r * 0.55, 0.007, 6, 56]} />
              </mesh>
              {p.r === PLATES[0].r && (
                <mesh rotation-y={Math.PI / 2} material={m.hot}>
                  <torusGeometry args={[p.r + 0.002, 0.008, 6, 64]} />
                </mesh>
              )}
            </group>
          ))}
          <mesh position={[s * 0.69, 0, 0]} rotation-z={Math.PI / 2} material={m.steel}>
            <cylinderGeometry args={[0.075, 0.075, 0.07, 24]} />
          </mesh>
          <mesh position={[s * 0.75, 0, 0]} rotation-z={Math.PI / 2} material={m.gold}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** world positions of both dumbbell ends, written by Dumbbell and read by the ribbon trails */
type Ends = { a: THREE.Vector3; b: THREE.Vector3; live: boolean; run: number };

export function Dumbbell({ clock, lite }: { clock: Clock; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const mats = useDumbbellMats();
  const ends = useMemo<Ends>(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), live: false, run: -1 }), []);
  const sim = useRef<{ run: number; body: Body | null; time: number }>({ run: -1, body: null, time: 0 });
  const dust = useRef<FloorDustHandle>(null);

  useFrame(() => {
    const c = clock.current;
    const g = group.current;
    if (!g) return;
    const s = sim.current;
    if (s.run !== c.run) {
      s.run = c.run;
      s.body = null;
    }

    const t = c.t;
    const flying = t >= SMASH_T.throw && t < SMASH_T.impact;
    g.visible = t >= SMASH_T.throw;
    let heat = 0;

    if (flying) {
      const pose = flightPose(flightProgress(t));
      g.position.set(pose.x, pose.y, pose.z);
      g.rotation.set(pose.rx, pose.ry, pose.rz);
      heat = 1;
    } else if (t >= SMASH_T.impact) {
      if (!s.body) {
        s.body = reboundBody();
        s.time = SMASH_T.impact;
      }
      // catch up to the clock in bounded steps (also handles Skip, which jumps to the end)
      const late = t - s.time > LATE;
      let guard = 0;
      while (s.time < t - 1e-6 && guard++ < 80) {
        const step = Math.min(0.05, t - s.time);
        const { body, hits } = stepBody(s.body, step);
        s.body = body;
        s.time += step;
        if (!late) hits.forEach((h) => dust.current?.puff(h.x, h.z, Math.min(1, h.speed / 6)));
      }
      const b = s.body;
      g.position.set(b.x, b.y, b.z);
      g.rotation.set(b.rx, 0.35, b.rz);
      heat = Math.max(0, 1 - (t - SMASH_T.impact) * 1.5);
    }
    c.target.x = g.position.x;
    c.target.y = g.position.y;
    c.target.z = g.position.z;

    mats.hot.emissiveIntensity = 0.5 + heat * 3.5;
    mats.gold.emissiveIntensity = 0.4 + heat * 1.6;
    if (light.current) {
      light.current.position.copy(g.position);
      light.current.intensity = heat * (lite ? 5 : 9);
    }

    g.updateMatrixWorld();
    ends.a.set(-0.78, 0, 0).applyMatrix4(g.matrixWorld);
    ends.b.set(0.78, 0, 0).applyMatrix4(g.matrixWorld);
    ends.live = flying;
    ends.run = c.run;
  });

  return (
    <>
      <group ref={group} visible={false} scale={1.3}>
        <DumbbellModel m={mats} />
      </group>
      <pointLight ref={light} color="#ffd27a" distance={8} decay={1.5} intensity={0} />
      {/* twin ribbons of light from the spinning plates: they spiral as it tumbles */}
      <Ribbon ends={ends} which="a" />
      <Ribbon ends={ends} which="b" />
      <FloorDust ref={dust} count={lite ? 6 : 12} />
    </>
  );
}

/* ── Ribbon trail: a camera-facing strip following a point, tapered and soft-edged ── */
const RIB_N = 30;
const ribbonVert = /* glsl */ `
  attribute float aAlpha;
  attribute float aEdge;
  varying float vAlpha;
  varying float vEdge;
  void main() {
    vAlpha = aAlpha;
    vEdge = aEdge;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ribbonFrag = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vEdge;
  void main() {
    float edge = 1.0 - abs(vEdge * 2.0 - 1.0);
    float k = vAlpha * pow(edge, 1.6);
    vec3 col = mix(uColor, vec3(1.0, 0.97, 0.9), vAlpha * vAlpha) * 2.6 * k;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Ribbon({ ends, which, width = 0.13 }: { ends: Ends; which: "a" | "b"; width?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const st = useMemo(() => {
    const pos = new Float32Array(RIB_N * 2 * 3);
    const alpha = new Float32Array(RIB_N * 2);
    const edge = new Float32Array(RIB_N * 2);
    const index: number[] = [];
    for (let i = 0; i < RIB_N; i++) {
      edge[i * 2] = 1;
      edge[i * 2 + 1] = 0;
      if (i < RIB_N - 1) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute("aEdge", new THREE.BufferAttribute(edge, 1));
    geo.setIndex(index);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: ribbonFrag,
      uniforms: { uColor: { value: new THREE.Color("#D4AF37") } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return { geo, mat, pos, alpha, hist: Array.from({ length: RIB_N }, () => new THREE.Vector3()), count: 0, fade: 0, run: -1 };
  }, []);
  const v = useMemo(() => ({ tan: new THREE.Vector3(), view: new THREE.Vector3(), side: new THREE.Vector3() }), []);

  useFrame(({ camera }, raw) => {
    const dt = Math.min(raw, 1 / 20);
    if (st.run !== ends.run) {
      st.run = ends.run;
      st.count = 0;
      st.fade = 0;
    }
    if (ends.live) {
      const head = st.hist.pop()!;
      st.hist.unshift(head.copy(ends[which]));
      st.count = Math.min(RIB_N, st.count + 1);
      st.fade = 1;
    } else {
      st.fade *= Math.exp(-dt * 7);
    }
    const m = mesh.current;
    if (!m) return;
    m.visible = st.fade > 0.01 && st.count > 1;
    if (!m.visible) return;

    const last = st.count - 1;
    for (let i = 0; i < RIB_N; i++) {
      const p = st.hist[Math.min(i, last)];
      const q = st.hist[Math.min(i + 1, last)];
      const r = st.hist[Math.max(0, Math.min(i - 1, last))];
      v.tan.copy(i < last ? p : r).sub(i < last ? q : p);
      v.view.copy(camera.position).sub(p);
      v.side.crossVectors(v.tan, v.view);
      const len = v.side.length();
      const taper = 1 - i / (RIB_N - 1);
      if (len > 1e-6) v.side.multiplyScalar((width * (0.25 + 0.75 * taper)) / len);
      else v.side.set(0, 0, 0);
      const o = i * 6;
      st.pos[o] = p.x + v.side.x;
      st.pos[o + 1] = p.y + v.side.y;
      st.pos[o + 2] = p.z + v.side.z;
      st.pos[o + 3] = p.x - v.side.x;
      st.pos[o + 4] = p.y - v.side.y;
      st.pos[o + 5] = p.z - v.side.z;
      const a = i <= last ? Math.pow(taper, 1.3) * st.fade : 0;
      st.alpha[i * 2] = a;
      st.alpha[i * 2 + 1] = a;
    }
    st.geo.attributes.position.needsUpdate = true;
    st.geo.attributes.aAlpha.needsUpdate = true;
  });

  return <mesh ref={mesh} geometry={st.geo} material={st.mat} frustumCulled={false} visible={false} />;
}

/* ── Soft dust puffs where the dumbbell lands ───────────────── */
type FloorDustHandle = { puff: (x: number, z: number, k: number) => void };

const FloorDust = forwardRef<FloorDustHandle, { count: number }>(function FloorDust({ count }, ref) {
  const tex = useMemo(() => makeGlowTexture("rgba(150,128,100,0.55)", "rgba(40,30,20,0)"), []);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const st = useRef(Array.from({ length: count }, () => ({ age: 99, x: 0, z: 0, vx: 0, vz: 0, k: 0 })));
  useImperativeHandle(ref, () => ({
    puff(x, z, k) {
      st.current.forEach((p, i) => {
        const a = (i / count) * Math.PI * 2;
        Object.assign(p, { age: 0, x, z, vx: Math.cos(a) * (0.6 + rand(i) * 0.8), vz: Math.sin(a) * (0.6 + rand(i + 9) * 0.8), k });
      });
    },
  }));
  useFrame((_, raw) => {
    const dt = Math.min(raw, 1 / 20);
    st.current.forEach((p, i) => {
      const sp = sprites.current[i];
      if (!sp) return;
      p.age += dt;
      const u = Math.min(1, p.age / 1.8);
      sp.visible = u < 1;
      if (!sp.visible) return;
      p.x += p.vx * dt * (1 - u);
      p.z += p.vz * dt * (1 - u);
      sp.position.set(p.x, 0.15 + u * 0.5, p.z);
      sp.scale.setScalar(0.4 + u * 1.6);
      (sp.material as THREE.SpriteMaterial).opacity = 0.5 * p.k * (1 - u);
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <sprite key={i} ref={(el) => { sprites.current[i] = el; }} visible={false}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </>
  );
});

/* ── Molten crack where the dumbbell strikes the crest ── */
function makeCrackTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const mid = size / 2;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "rgba(255,244,220,1)";
  g.shadowColor = "rgba(255,190,80,1)";
  g.shadowBlur = 10;
  const branch = (x: number, y: number, ang: number, len: number, w: number, seed: number, depth: number) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    let px = x;
    let py = y;
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const a = ang + (rand(seed + i * 13) - 0.5) * 0.9;
      px += Math.cos(a) * (len / steps);
      py += Math.sin(a) * (len / steps);
      g.lineTo(px, py);
      if (depth > 0 && rand(seed + i * 7) > 0.72) branch(px, py, a + (rand(seed + i) - 0.5) * 1.6, len * 0.45, w * 0.6, seed * 3 + i, depth - 1);
    }
    g.stroke();
  };
  for (let k = 0; k < 13; k++) {
    const ang = (k / 13) * Math.PI * 2 + rand(k + 900) * 0.4;
    branch(mid, mid, ang, size * (0.22 + rand(k + 950) * 0.24), 3.2, k * 31 + 5, 2);
  }
  const grd = g.createRadialGradient(mid, mid, 0, mid, mid, size * 0.12);
  grd.addColorStop(0, "rgba(255,250,235,1)");
  grd.addColorStop(1, "rgba(255,200,90,0)");
  g.shadowBlur = 0;
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── Impact: sparks, debris, flash, crack, shockwave ───────────────── */
export function ImpactFX({ clock, lite }: { clock: Clock; lite: boolean }) {
  const SPARKS = lite ? 180 : 600;
  const DEBRIS = lite ? 10 : 28;
  const points = useRef<THREE.Points>(null);
  const debris = useRef<THREE.InstancedMesh>(null);
  const flash = useRef<THREE.Sprite>(null);
  const flashLight = useRef<THREE.PointLight>(null);
  const ring = useRef<THREE.Mesh>(null);
  const floorRing = useRef<THREE.Mesh>(null);
  const crack = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeGlowTexture("rgba(255,245,215,1)", "rgba(255,150,30,0)"), []);
  const flashTex = useMemo(() => makeGlowTexture("rgba(255,250,235,1)", "rgba(212,175,55,0)"), []);
  const crackTex = useMemo(() => makeCrackTexture(), []);
  const hdrGold = useMemo(() => new THREE.Color(2.6, 1.9, 1.0), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const pos = new Float32Array(SPARKS * 3);
    const col = new Float32Array(SPARKS * 3);
    pos.fill(-50);
    return {
      pos,
      col,
      vel: new Float32Array(SPARKS * 3),
      life: new Float32Array(SPARKS),
      max: new Float32Array(SPARKS),
      deb: Array.from({ length: DEBRIS }, () => ({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), rest: true })),
    };
  }, [SPARKS, DEBRIS]);
  const fx = useRef({ run: -1, age: 99 });

  useFrame((_, raw) => {
    const c = clock.current;
    // effects share the sequence's clock speed: they hang in the air during the hit-stop
    const dt = Math.min(raw, 1 / 20) * c.scale;
    const { pos, col, vel, life, max, deb } = data;
    const ix = GATE_FACE.x;
    const iy = GATE_FACE.y;
    const iz = GATE_FACE.z + 0.15;

    let pre = -1;
    if (fx.current.run !== c.run && c.t >= SMASH_T.impact) {
      fx.current.run = c.run;
      if (c.t - SMASH_T.impact < LATE) {
        fx.current.age = 0;
        // started late (skip / frame hitch / debug freeze): fast-forward to where it should be
        pre = c.t - SMASH_T.impact;
        for (let i = 0; i < SPARKS; i++) {
          // hemisphere spray back toward the camera, plus fast sideways streaks along the bars
          const a = rand(i * 3) * Math.PI * 2;
          const spread = 0.35 + rand(i * 3 + 1) * 1.1;
          const sp = 3 + rand(i * 3 + 2) * 14 * (rand(i + 77) > 0.85 ? 1.5 : 1);
          vel[i * 3] = Math.cos(a) * spread * sp;
          vel[i * 3 + 1] = Math.sin(a) * spread * sp * 0.8 + 2.5;
          vel[i * 3 + 2] = (0.3 + rand(i + 33) * 0.9) * sp * 0.75;
          pos[i * 3] = ix + (rand(i + 5) - 0.5) * 0.3;
          pos[i * 3 + 1] = iy + (rand(i + 6) - 0.5) * 0.3;
          pos[i * 3 + 2] = iz;
          max[i] = life[i] = 0.5 + rand(i + 11) * 1.4;
        }
        deb.forEach((d, i) => {
          d.p.set(ix + (rand(i + 200) - 0.5) * 0.4, iy + (rand(i + 210) - 0.5) * 0.4, iz);
          d.v.set((rand(i + 220) - 0.5) * 7, 1 + rand(i + 230) * 4, 1.5 + rand(i + 240) * 4.5);
          d.w.set(rand(i + 250) * 18, rand(i + 260) * 18, rand(i + 270) * 18);
          d.rest = false;
        });
      }
    }

    const advance = (h: number) => {
      // sparks: gravity + drag + floor skips; colour cools from white-hot (HDR) to deep gold
      for (let i = 0; i < SPARKS; i++) {
        if (life[i] <= 0) continue;
        life[i] -= h;
        const o = i * 3;
        vel[o + 1] -= 9.81 * h * 0.7;
        const drag = 1 - 1.5 * h;
        vel[o] *= drag;
        vel[o + 1] *= drag;
        vel[o + 2] *= drag;
        pos[o] += vel[o] * h;
        pos[o + 1] += vel[o + 1] * h;
        pos[o + 2] += vel[o + 2] * h;
        if (pos[o + 1] < 0.03 && vel[o + 1] < 0) {
          pos[o + 1] = 0.03;
          vel[o + 1] *= -0.35;
          vel[o] *= 0.7;
          vel[o + 2] *= 0.7;
        }
        const k = Math.max(0, life[i] / max[i]);
        const heat = k * k;
        const hdr = 1 + 2.2 * heat;
        col[o] = (1 * k + 0.2 * heat) * hdr;
        col[o + 1] = (0.62 + 0.35 * heat) * k * hdr;
        col[o + 2] = (0.16 + 0.7 * heat * heat) * k * hdr;
        if (life[i] <= 0) {
          col[o] = col[o + 1] = col[o + 2] = 0;
          pos[o + 1] = -50;
        }
      }
      deb.forEach((d) => {
        if (d.rest) return;
        d.v.y -= 9.81 * h;
        d.p.addScaledVector(d.v, h);
        d.r.x += d.w.x * h;
        d.r.y += d.w.y * h;
        d.r.z += d.w.z * h;
        if (d.p.y < 0.03) {
          d.p.y = 0.03;
          if (Math.abs(d.v.y) < 0.8) d.rest = true;
          d.v.set(d.v.x * 0.45, -d.v.y * 0.3, d.v.z * 0.45);
          d.w.multiplyScalar(0.4);
        }
      });
      fx.current.age += h;
    };
    let rem = pre >= 0 ? pre : dt;
    while (rem > 1e-6) {
      const h = Math.min(1 / 60, rem);
      advance(h);
      rem -= h;
    }

    const pts = points.current;
    if (pts) {
      pts.geometry.attributes.position.needsUpdate = true;
      pts.geometry.attributes.color.needsUpdate = true;
    }
    const im = debris.current;
    if (im) {
      deb.forEach((d, i) => {
        dummy.position.copy(d.p);
        dummy.rotation.copy(d.r);
        dummy.scale.setScalar(0.5 + rand(i + 300));
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    }

    const age = fx.current.age;
    const f = Math.max(0, 1 - age / 0.35);
    if (flash.current) {
      flash.current.scale.setScalar(2 + (1 - f) * 8);
      (flash.current.material as THREE.SpriteMaterial).opacity = f * f;
    }
    if (flashLight.current) flashLight.current.intensity = 95 * f * f;
    // molten crack: flares, then cools over a second (gone before the doors part)
    if (crack.current) {
      const cm = crack.current.material as THREE.MeshBasicMaterial;
      cm.opacity = age < 0.04 ? age / 0.04 : Math.exp(-(age - 0.04) * 2.6);
      crack.current.scale.setScalar(0.85 + Math.min(1, age * 6) * 0.25);
      crack.current.visible = cm.opacity > 0.01;
    }
    const w = Math.min(1, age / 0.45);
    const we = 1 - Math.pow(1 - w, 3);
    if (ring.current) {
      ring.current.scale.setScalar(0.2 + we * 8);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - w, 2) * 0.9;
    }
    const w2 = Math.min(1, age / 1.1);
    if (floorRing.current) {
      floorRing.current.scale.setScalar(0.3 + (1 - Math.pow(1 - w2, 3)) * 9);
      (floorRing.current.material as THREE.MeshBasicMaterial).opacity = (1 - w2) * 0.5;
    }
  });

  return (
    <>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[data.col, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex} size={lite ? 0.2 : 0.16} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      <instancedMesh ref={debris} args={[undefined, undefined, DEBRIS]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.03, 0.04]} />
        <meshStandardMaterial color="#2a2622" metalness={0.9} roughness={0.35} />
      </instancedMesh>
      <mesh ref={crack} position={[GATE_FACE.x, GATE_FACE.y, GATE_FACE.z + 0.16]} visible={false}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={crackTex} color={hdrGold} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite ref={flash} position={[GATE_FACE.x, GATE_FACE.y, GATE_FACE.z + 0.3]}>
        <spriteMaterial map={flashTex} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={flashLight} position={[GATE_FACE.x, GATE_FACE.y, GATE_FACE.z + 1.2]} color="#ffd890" distance={18} decay={1.5} intensity={0} />
      <mesh ref={ring} position={[GATE_FACE.x, GATE_FACE.y, GATE_FACE.z + 0.2]} scale={0.001}>
        <ringGeometry args={[0.485, 0.5, 96]} />
        <meshBasicMaterial color="#e8c25a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={floorRing} position={[GATE_FACE.x, 0.02, GATE_FACE.z + 0.6]} rotation-x={-Math.PI / 2} scale={0.001}>
        <ringGeometry args={[0.42, 0.5, 64]} />
        <meshBasicMaterial color="#D4AF37" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

/* ── Atmosphere: drifting smoke + the beam of light pouring through the opening gate ── */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  // top of the canvas = the doorway end of the beam (bright), fading toward the viewer
  grd.addColorStop(0, "rgba(255,240,205,1)");
  grd.addColorStop(0.35, "rgba(255,224,160,0.55)");
  grd.addColorStop(1, "rgba(255,236,190,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Atmosphere({ clock, lite }: { clock: Clock; lite: boolean }) {
  const SMOKE = lite ? 6 : 14;
  const smokeTex = useMemo(() => makeGlowTexture("rgba(120,100,80,0.5)", "rgba(30,22,15,0)"), []);
  const beamTex = useMemo(() => beamTexture(), []);
  const smoke = useRef<(THREE.Sprite | null)[]>([]);
  const beam = useRef<THREE.Mesh>(null);
  const floorSpill = useRef<THREE.Mesh>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: SMOKE }, (_, i) => ({
        x: (rand(i + 400) - 0.5) * 6,
        y: 0.6 + rand(i + 410) * 2.4,
        z: -15 + rand(i + 420) * 22,
        s: 3 + rand(i + 430) * 4,
        sp: 0.05 + rand(i + 440) * 0.12,
      })),
    [SMOKE]
  );

  useFrame(({ clock: three }) => {
    const c = clock.current;
    const t = three.elapsedTime;
    const stir = c.t >= SMASH_T.impact ? Math.max(0, 1 - (c.t - SMASH_T.impact) / 3.5) : 0;
    puffs.forEach((p, i) => {
      const sp = smoke.current[i];
      if (!sp) return;
      sp.position.set(p.x + Math.sin(t * p.sp + i) * 0.8, p.y + Math.sin(t * p.sp * 0.7 + i * 2) * 0.3, p.z);
      sp.scale.setScalar(p.s);
      const near = Math.max(0, 1 - Math.abs(p.z + 15) / 8);
      (sp.material as THREE.SpriteMaterial).opacity = 0.06 + stir * near * 0.22;
    });
    const L = c.t >= 0 ? gateLight(Math.min(c.t, SMASH_T.end)) : 0;
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.14 * L;
    if (floorSpill.current) (floorSpill.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * L;
  });

  return (
    <>
      {puffs.map((_, i) => (
        <sprite key={i} ref={(el) => { smoke.current[i] = el; }}>
          <spriteMaterial map={smokeTex} transparent opacity={0.06} depthWrite={false} />
        </sprite>
      ))}
      <mesh ref={beam} position={[0, 2.6, GATE_FACE.z + 5.5]} rotation-x={-Math.PI / 2}>
        <cylinderGeometry args={[2.3, 3.6, 11, 32, 1, true]} />
        <meshBasicMaterial map={beamTex} color="#ffe2a0" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={floorSpill} position={[0, 0.015, GATE_FACE.z + 4]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5, 8]} />
        <meshBasicMaterial map={beamTex} color="#f5c870" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}
