"use client";

// Finale of the real-gym 360°: a bronze athlete pressing on a flat bench, lit like a statue on a stage.
// Reads the shared look state every frame (no React renders while scrolling).

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Athlete, emptyJoints, type Joints } from "@/components/intro/Athlete";
import { Barbell } from "@/components/intro/Barbell";
import { armIK, BENCH, barZ, headZ, pressReach, repPress } from "@/lib/gym/bench";
import { RIG } from "@/lib/intro/choreography";

const BLACK = { color: "#0b0b0c", metalness: 0.6, roughness: 0.35 };
const LEATHER = { color: "#141210", metalness: 0.05, roughness: 0.55 };
const GOLD = { color: "#D4AF37", metalness: 1, roughness: 0.22, emissive: "#D4AF37", emissiveIntensity: 0.25 };
const RING_SEGS = 128;

/* volumetric spotlight cone: soft gold falloff from the lamp to the floor */
const coneVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const coneFrag = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float rim = pow(1.0 - abs(dot(vN, vV)), 1.6);
    float edge = 1.0 - rim;
    float fall = pow(vUv.y, 1.4);
    gl_FragColor = vec4(uColor, uOpacity * edge * fall * 0.55);
  }
`;

function Bench() {
  const padLen = 1.3;
  const padZ = BENCH.rootZ - 0.45;
  const rackZ = headZ() + 0.1;
  return (
    <group>
      {/* pad: black leather with gold piping */}
      <mesh position={[0, BENCH.padY - 0.045, padZ]}>
        <boxGeometry args={[0.32, 0.09, padLen]} />
        <meshStandardMaterial {...LEATHER} />
      </mesh>
      {[-0.162, 0.162].map((x) => (
        <mesh key={x} position={[x, BENCH.padY - 0.002, padZ]}>
          <boxGeometry args={[0.008, 0.008, padLen]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      {/* frame: spine + two legs */}
      <mesh position={[0, BENCH.padY - 0.12, padZ]}>
        <boxGeometry args={[0.08, 0.06, padLen - 0.1]} />
        <meshStandardMaterial {...BLACK} />
      </mesh>
      {[padZ - padLen / 2 + 0.12, padZ + padLen / 2 - 0.12].map((z) => (
        <group key={z}>
          <mesh position={[0, (BENCH.padY + BENCH.floorY) / 2 - 0.06, z]}>
            <boxGeometry args={[0.07, BENCH.padY - BENCH.floorY - 0.12, 0.07]} />
            <meshStandardMaterial {...BLACK} />
          </mesh>
          <mesh position={[0, BENCH.floorY + 0.03, z]}>
            <boxGeometry args={[0.5, 0.06, 0.08]} />
            <meshStandardMaterial {...BLACK} />
          </mesh>
          {[-0.25, 0.25].map((x) => (
            <mesh key={x} position={[x, BENCH.floorY + 0.03, z]}>
              <boxGeometry args={[0.02, 0.065, 0.085]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
          ))}
        </group>
      ))}
      {/* rack uprights behind the head with gold J-hooks */}
      {[-0.62, 0.62].map((x) => (
        <group key={x} position={[x, 0, rackZ]}>
          <mesh position={[0, (BENCH.floorY + 0.05) / 2, 0]}>
            <boxGeometry args={[0.07, 0.05 - BENCH.floorY, 0.07]} />
            <meshStandardMaterial {...BLACK} />
          </mesh>
          <mesh position={[0, -0.14, 0.06]}>
            <boxGeometry args={[0.06, 0.04, 0.12]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <mesh position={[0, BENCH.floorY + 0.02, 0]}>
            <boxGeometry args={[0.3, 0.04, 0.3]} />
            <meshStandardMaterial {...BLACK} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** a soft dark pool + a gold ring that draws itself around the bench as the light comes up */
function Stage({ ring }: { ring: React.RefObject<THREE.Mesh | null> }) {
  const pool = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    if (g) {
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, "rgba(0,0,0,0.92)");
      grd.addColorStop(0.6, "rgba(0,0,0,0.6)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  const cz = BENCH.rootZ - 0.4;
  return (
    <group position={[0, BENCH.floorY + 0.005, cz]} rotation-x={-Math.PI / 2}>
      <mesh>
        <planeGeometry args={[5.2, 5.2]} />
        <meshBasicMaterial map={pool} transparent depthWrite={false} />
      </mesh>
      <mesh ref={ring} position-z={0.002}>
        <ringGeometry args={[1.62, 1.645, RING_SEGS, 1, Math.PI / 2, Math.PI * 2]} />
        <meshBasicMaterial color="#e8c25a" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export type BenchReveal = { amount: number; fly: number };

export function BenchPress({ reveal }: { reveal: React.MutableRefObject<BenchReveal> }) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<Joints>(emptyJoints());
  const bar = useRef<THREE.Group>(null);
  const key = useRef<THREE.SpotLight>(null);
  const rimL = useRef<THREE.PointLight>(null);
  const rimR = useRef<THREE.PointLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const ring = useRef<THREE.Mesh>(null);
  const cone = useRef<THREE.Mesh>(null);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const coneMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coneVert,
        fragmentShader: coneFrag,
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#ffd99a") } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );
  const hand = useMemo(() => ({ l: new THREE.Vector3(), r: new THREE.Vector3() }), []);
  const press = useRef({ q: 1, start: -1 });
  const lastRingArc = useRef(-1);

  useFrame(({ clock }) => {
    const { amount, fly } = reveal.current;
    const g = root.current;
    if (!g) return;
    g.visible = amount > 0.001;
    if (!g.visible) {
      press.current.start = -1;
      return;
    }
    const time = clock.elapsedTime;
    if (press.current.start < 0) press.current.start = time; // reps start locked out

    // lights: the athlete emerges from the dark as the spotlight warms up
    const L = amount;
    if (key.current) key.current.intensity = 70 * L;
    if (rimL.current) rimL.current.intensity = 9 * L;
    if (rimR.current) rimR.current.intensity = 7 * L;
    if (ambient.current) ambient.current.intensity = 0.25 * L;
    coneMat.uniforms.uOpacity.value = L * (1 - fly);
    if (cone.current) cone.current.visible = L > 0.01 && fly < 0.98;

    // gold ring draws itself around the stage
    const segs = Math.round(Math.min(1, Math.max(0, (amount - 0.2) / 0.8)) * RING_SEGS);
    if (ring.current && segs !== lastRingArc.current) {
      lastRingArc.current = segs;
      ring.current.geometry.setDrawRange(0, segs * 6);
    }

    // reps, easing into a lockout as the camera comes in (so the gap under the bar is open)
    const rep = repPress(time - press.current.start);
    const hold = Math.min(1, fly / 0.22);
    const q = rep + (1 - rep) * (hold * hold * (3 - 2 * hold));
    press.current.q = q;

    const j = joints.current;
    if (!j.hips) return;
    j.hips.position.set(0, 0, 0);
    j.hips.rotation.set(0.04, 0, 0);
    j.spine!.rotation.x = -0.03; // slight arch
    j.neck!.rotation.x = 0.08;
    const ik = armIK(BENCH.barBodyDy, pressReach(q));
    j.shoulderL!.rotation.set(ik.shoulder, 0, 0.16);
    j.shoulderR!.rotation.set(ik.shoulder, 0, -0.16);
    j.elbowL!.rotation.x = ik.elbow;
    j.elbowR!.rotation.x = ik.elbow;
    // legs: thighs off the end of the bench, shins vertical, feet planted on the floor
    const drop = BENCH.rootY - BENCH.floorY - RIG.shin - 0.06;
    const thigh = Math.asin(Math.min(1, Math.max(0, drop / RIG.thigh)));
    j.thighL!.rotation.set(thigh, 0, 0.3);
    j.thighR!.rotation.set(thigh, 0, -0.3);
    j.kneeL!.rotation.set(Math.PI / 2 - thigh, 0, -0.3);
    j.kneeR!.rotation.set(Math.PI / 2 - thigh, 0, 0.3);
    j.footL!.rotation.x = 0;
    j.footR!.rotation.x = 0;
    // a breath with each rep: chest swells at the bottom
    if (j.chest) j.chest.scale.set(0.27 + (1 - q) * 0.006, 0.2 + (1 - q) * 0.008, 0.16 + (1 - q) * 0.012);

    // the bar lives in the hands: place it at the midpoint of both grips
    g.updateMatrixWorld(true);
    if (j.handL && j.handR && bar.current) {
      j.handL.getWorldPosition(hand.l);
      j.handR.getWorldPosition(hand.r);
      bar.current.position.copy(hand.l).add(hand.r).multiplyScalar(0.5);
    }
  });

  const focusZ = barZ();
  return (
    <group ref={root} visible={false}>
      <ambientLight ref={ambient} intensity={0} color="#ffe4c0" />
      {/* key: warm spotlight straight above the chest */}
      <primitive object={spotTarget} position={[0, BENCH.rootY, focusZ + 0.2]} />
      <spotLight
        ref={key}
        position={[0, 2.6, focusZ + 0.4]}
        target={spotTarget}
        angle={0.42}
        penumbra={0.75}
        decay={1.5}
        distance={9}
        color="#ffdcae"
        intensity={0}
      />
      {/* gold rims from behind, carving the silhouette out of the dark */}
      <pointLight ref={rimL} position={[-1.4, 0.2, headZ() - 0.9]} color="#d4af37" distance={6} decay={1.4} intensity={0} />
      <pointLight ref={rimR} position={[1.5, -0.2, BENCH.rootZ + 0.2]} color="#f5c870" distance={5} decay={1.4} intensity={0} />

      {/* volumetric cone of light */}
      <mesh ref={cone} position={[0, (2.6 + BENCH.floorY) / 2, focusZ + 0.3]} material={coneMat} visible={false}>
        <cylinderGeometry args={[0.08, 1.35, 2.6 - BENCH.floorY, 48, 1, true]} />
      </mesh>

      <Stage ring={ring} />
      <Bench />

      {/* athlete on his back: body y → world −z (head away), body z → world +y (chest up) */}
      <group position={[0, BENCH.rootY, BENCH.rootZ]} rotation-x={-Math.PI / 2}>
        <Athlete joints={joints} shadows={false} />
      </group>
      <Barbell ref={bar} shadows={false} />
    </group>
  );
}
