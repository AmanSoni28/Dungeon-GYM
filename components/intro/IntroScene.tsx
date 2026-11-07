"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import {
  BEATS,
  POSES,
  RELEASE_AT,
  RELEASE_SPIN,
  RELEASE_VELOCITY,
  type Pose,
} from "@/lib/intro/choreography";
import { BAR_CONFIG, createBar, stepBar, type BarState } from "@/lib/intro/physics";
import { addTrauma, decayTrauma, shakeOffset } from "@/lib/intro/shake";
import { Athlete, applyPose, emptyJoints } from "./Athlete";
import { Barbell } from "./Barbell";
import { Dust, Motes, type DustHandle } from "./Dust";
import { GymSet } from "./GymSet";

export type IntroSceneProps = {
  lite: boolean;
  playing: boolean;
  leaving: boolean;
  onImpact: (speed: number) => void;
  onSettled: () => void;
};

const SLOWMO = 0.22;
const HITSTOP = 0.07; // seconds of near-freeze on the first impact

function Director({ lite, playing, leaving, onImpact, onSettled }: IntroSceneProps) {
  const { camera } = useThree();
  const joints = useRef(emptyJoints());
  const bar = useRef<THREE.Group>(null);
  const dust = useRef<DustHandle>(null);
  const shock = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.PointLight>(null);
  const keyLight = useRef<THREE.SpotLight>(null);

  // mutable simulation state (never triggers React renders)
  const sim = useRef({
    pose: { ...POSES.stand } as Pose,
    held: true,
    body: null as BarState | null,
    timeScale: 1,
    tsTarget: 1,
    hitStop: 0,
    slowmoDone: false,
    trauma: 0,
    impacts: 0,
    sinceImpact: -1,
    settled: false,
    cam: { px: 0, py: 1.3, pz: 9.2, lx: 0, ly: 1.2, lz: 0, track: 0, fov: 34 },
  });
  const tl = useRef<gsap.core.Timeline | null>(null);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), look: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), roll: new THREE.Quaternion(), x: new THREE.Vector3(1, 0, 0) }), []);

  const targets = useMemo(() => ({ body: new THREE.Object3D(), floor: new THREE.Object3D() }), []);

  const cb = useRef({ onImpact, onSettled });
  cb.current = { onImpact, onSettled };

  // ── Choreography timeline ─────────────────────────
  useEffect(() => {
    if (!playing) return;
    const s = sim.current;
    // Paused: advanced manually from useFrame so choreography, slow motion and physics share
    // one clock (no drift if frames stall or the tab is throttled).
    const t = gsap.timeline({ paused: true });
    // slow cinematic dolly-in to a low hero angle while he prepares
    t.to(s.cam, { px: 0.85, py: 0.85, pz: 6.4, ly: 1.3, duration: 3.1, ease: "sine.inOut" }, 0);
    BEATS.forEach((b) => t.to(s.pose, { ...POSES[b.pose], duration: b.dur, ease: b.ease }, b.at));
    t.call(
      () => {
        if (!bar.current) return;
        s.held = false;
        s.body = createBar(bar.current.position, RELEASE_VELOCITY, RELEASE_SPIN);
      },
      [],
      RELEASE_AT
    );
    // follow the barbell down
    t.to(s.cam, { track: 0.75, duration: 0.5, ease: "power2.out" }, RELEASE_AT - 0.1);
    tl.current = t;
    return () => {
      t.kill();
      tl.current = null;
    };
  }, [playing]);

  // ── Exit: camera dives toward the barbell through the dust ──
  useEffect(() => {
    if (!leaving) return;
    const s = sim.current;
    const target = s.body ?? { x: 0, z: 2.2 };
    const tw = gsap.to(s.cam, {
      px: target.x + 0.25,
      py: 0.34,
      pz: target.z + 1.15,
      lx: target.x,
      ly: 0.2,
      lz: target.z,
      track: 0,
      fov: 26,
      duration: 1.3,
      ease: "power3.in",
    });
    return () => {
      tw.kill();
    };
  }, [leaving]);

  useFrame((state, rawDt) => {
    const s = sim.current;
    const dt = Math.min(rawDt, 1 / 20);

    // time scale: hit-stop → slow motion → real time
    if (s.hitStop > 0) {
      s.hitStop -= dt;
      s.timeScale = 0.03;
    } else {
      s.timeScale += (s.tsTarget - s.timeScale) * (1 - Math.exp(-dt * 10));
    }
    const sdt = dt * s.timeScale;
    const tline = tl.current;
    // suppressEvents=false so the release call() fires while scrubbing forward
    if (tline && tline.time() < tline.duration()) tline.time(tline.time() + sdt, false);

    // athlete pose (+ idle breathing while standing)
    const breath = Math.sin(state.clock.elapsedTime * 1.6);
    applyPose(joints.current, s.pose, breath);

    // barbell: attached to hands, or simulated after release
    const b = bar.current;
    const { handL, handR } = joints.current;
    if (b && handL && handR) {
      if (s.held) {
        joints.current.root?.updateMatrixWorld(true);
        handL.getWorldPosition(v.a);
        handR.getWorldPosition(v.b);
        b.position.copy(v.a).add(v.b).multiplyScalar(0.5);
        v.dir.copy(v.b).sub(v.a).normalize();
        if (v.dir.x < 0) v.dir.negate();
        b.quaternion.setFromUnitVectors(v.x, v.dir);
      } else if (s.body) {
        // slow motion as the bar drops toward the floor
        if (!s.slowmoDone && s.body.vy < 0 && s.body.y < 1.15) {
          s.slowmoDone = true;
          s.tsTarget = SLOWMO;
        }
        const { state: next, impacts } = stepBar(s.body, sdt, BAR_CONFIG);
        s.body = next;
        b.position.set(next.x, next.y, next.z);
        v.roll.setFromAxisAngle(v.x, next.roll);
        b.quaternion.slerp(v.roll, 0.25);

        impacts.forEach((imp) => {
          const k = Math.min(1, imp.speed / 5.5);
          s.impacts += 1;
          s.trauma = addTrauma(s.trauma, 0.35 + k * 0.75);
          dust.current?.burst(imp.x, imp.z, k);
          if (s.impacts === 1) {
            s.hitStop = HITSTOP;
            s.tsTarget = 1;
            s.timeScale = 0.03;
            s.sinceImpact = 0;
          }
          if (flash.current) {
            flash.current.position.set(imp.x, 0.35, imp.z);
            gsap.fromTo(flash.current, { intensity: 60 * k }, { intensity: 0, duration: 0.9, ease: "power2.out" });
          }
          if (shock.current) {
            shock.current.position.set(imp.x, 0.012, imp.z);
            const m = shock.current.material as THREE.MeshBasicMaterial;
            gsap.fromTo(shock.current.scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 3.4 * k + 1, y: 3.4 * k + 1, z: 1, duration: 1.1, ease: "expo.out" });
            gsap.fromTo(m, { opacity: 0.9 * k }, { opacity: 0, duration: 1.1, ease: "power2.out" });
          }
          if (keyLight.current) gsap.fromTo(keyLight.current, { intensity: 380 }, { intensity: 220, duration: 0.6 });
          cb.current.onImpact(imp.speed);
        });
      }
    }

    // settle → tell the overlay to transition out
    if (s.sinceImpact >= 0) {
      s.sinceImpact += dt;
      if (!s.settled && s.sinceImpact > 1.45) {
        s.settled = true;
        cb.current.onSettled();
      }
    }

    // camera: authored path + tracking the bar + trauma shake
    s.trauma = decayTrauma(s.trauma, dt);
    const c = s.cam;
    const cam = camera as THREE.PerspectiveCamera;
    v.look.set(c.lx, c.ly, c.lz);
    if (b && c.track > 0) v.look.lerp(b.position, c.track * 0.6);
    const sh = shakeOffset(s.trauma, state.clock.elapsedTime);
    cam.position.set(c.px + sh.x + Math.sin(state.clock.elapsedTime * 0.4) * 0.02, c.py + sh.y, c.pz);
    cam.lookAt(v.look);
    cam.rotateZ(sh.roll);
    if (Math.abs(cam.fov - c.fov) > 0.01) {
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
    }
  });

  const shadows = !lite;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fogExp2 attach="fog" args={["#050505", 0.075]} />

      {/* spotlight aim points: must live in the scene so their matrices update */}
      <primitive object={targets.body} position={[0, 1.35, 0]} />
      <primitive object={targets.floor} position={[0, 0, 0.4]} />

      <ambientLight intensity={0.05} />
      {/* top key light: hard, dramatic, neutral-warm */}
      <spotLight
        ref={keyLight}
        target={targets.floor}
        position={[0, 6.4, 0.6]}
        angle={0.4}
        penumbra={0.75}
        intensity={170}
        decay={2}
        distance={16}
        color="#ffeedd"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* gold rim lights from behind, aimed at the torso: carve the silhouette without washing the floor */}
      <spotLight target={targets.body} position={[-2.6, 3.0, -3.0]} angle={0.32} penumbra={0.7} intensity={140} decay={2} distance={9} color="#D4AF37" />
      <spotLight target={targets.body} position={[2.6, 3.0, -3.0]} angle={0.32} penumbra={0.7} intensity={140} decay={2} distance={9} color="#D4AF37" />
      {/* soft frontal fill to reveal muscle definition */}
      <spotLight target={targets.body} position={[1.8, 2.6, 4.5]} angle={0.35} penumbra={1} intensity={28} decay={2} distance={12} color="#ffd9b0" />
      <pointLight position={[0, 1.4, 5]} intensity={1.2} distance={12} color="#6f7d92" />
      <pointLight ref={flash} intensity={0} distance={6} decay={2} color="#ffcf70" />

      <GymSet lite={lite} />
      <Athlete joints={joints} shadows={shadows} />
      <Barbell ref={bar} shadows={shadows} />
      <Dust ref={dust} count={lite ? 160 : 700} />
      <Motes count={lite ? 80 : 260} />

      <mesh ref={shock} rotation-x={-Math.PI / 2} scale={0.001}>
        <ringGeometry args={[0.55, 0.62, 64]} />
        <meshBasicMaterial color="#D4AF37" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function IntroScene(props: IntroSceneProps) {
  return (
    <Canvas
      shadows={!props.lite}
      dpr={props.lite ? 1 : [1, 1.75]}
      camera={{ position: [0, 1.3, 9.2], fov: 34, near: 0.05, far: 60 }}
      gl={{ antialias: !props.lite, powerPreference: "high-performance" }}
    >
      <Director {...props} />
    </Canvas>
  );
}
