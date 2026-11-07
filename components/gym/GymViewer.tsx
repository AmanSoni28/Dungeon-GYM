"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  clampLook,
  createExploreTracker,
  damp,
  DEG,
  fitCameraFov,
  lookLimits,
  SCREEN_RADIUS,
  viewPosition,
  type GymView,
} from "@/lib/gym/look";
import { journeyPhases, journeyVisuals, scrollYaw } from "@/lib/gym/journey";
import { rand } from "@/lib/utils";

import type { GymLookState } from "@/lib/gym/state";

type Props = {
  view: GymView;
  look: React.MutableRefObject<GymLookState>;
  running: boolean;
  lite: boolean;
  autoRotate: boolean;
  /** called every frame with the view position (0..1) and share explored (0..1) */
  onLook: (position: number, explored: number) => void;
  onReady?: () => void;
};

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Photo with gentle cinematic grade. Edges fade to black so the screen never shows a hard border,
// and nothing is painted outside the real photo.
const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBrightness;
  uniform float uFlip;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
    vec3 c = texture2D(uMap, uv).rgb;
    // grade: a touch more contrast and depth, original colours preserved
    c = (c - 0.5) * 1.08 + 0.5;
    c *= vec3(1.02, 1.0, 0.97);
    float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x)
               * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
    c = mix(vec3(0.02), c, edge) * uBrightness;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/** The real photo on a curved screen (photo) or the inside of a sphere (360° panorama). */
function Screen({ view, brightness }: { view: GymView; brightness: React.MutableRefObject<number> }) {
  const tex = useLoader(THREE.TextureLoader, view.src);
  const { gl } = useThree();
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
  }, [tex, gl]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uMap: { value: tex }, uBrightness: { value: 1 }, uFlip: { value: 1 } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [tex]
  );

  useFrame(() => {
    material.uniforms.uBrightness.value = brightness.current;
  });

  if (view.kind === "equirect") {
    return (
      <mesh material={material} scale={[1, 1, 1]}>
        <sphereGeometry args={[SCREEN_RADIUS, 96, 48]} />
      </mesh>
    );
  }
  const hfov = view.hfov * DEG;
  const height = (SCREEN_RADIUS * hfov) / view.aspect;
  // thetaStart is chosen so the middle of the photo sits straight ahead (−Z)
  return (
    <mesh material={material}>
      <cylinderGeometry args={[SCREEN_RADIUS, SCREEN_RADIUS, height, 96, 1, true, Math.PI - hfov / 2, hfov]} />
    </mesh>
  );
}

/** Floating dust between the camera and the photo: real depth cues without inventing scenery. */
function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.5 + rand(i) * 6.5;
      const t = (rand(i + 300) - 0.5) * 1.6;
      a[i * 3] = Math.sin(t) * r;
      a[i * 3 + 1] = (rand(i + 600) - 0.5) * 4;
      a[i * 3 + 2] = -Math.cos(t) * r;
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    p.position.y = Math.sin(clock.elapsedTime * 0.25) * 0.15;
    p.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#F5D98B" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function Rig({ view, look, autoRotate, onLook, brightness }: Omit<Props, "running" | "lite" | "onReady"> & { brightness: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const cur = useRef({ yaw: 0, pitch: 0, init: false });
  const tracker = useMemo(() => createExploreTracker(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const baseFov = fitCameraFov(view, aspect);
    const limits = lookLimits(view, baseFov, aspect);
    const s = look.current;
    const ph = journeyPhases(s.progress);
    const vis = journeyVisuals(s.progress);

    // optional slow drift when the visitor isn't interacting
    const idle = performance.now() - s.lastInteraction > 3000;
    const drift = autoRotate && idle ? Math.sin(clock.elapsedTime * 0.18) * 0.35 * (limits.wrap ? 1 : limits.yawMax) : 0;

    // target = scroll sweep + user drag (+ idle drift), clamped to what the photo really shows
    const base = scrollYaw(ph.explore, limits);
    const basePitch = (view.pitch ?? 0) * DEG;
    const want = clampLook(base + s.dragYaw + drift, basePitch + s.dragPitch, limits);
    // write the clamped value back so dragging past an edge has no "dead zone"
    s.dragYaw = want.yaw - base - drift;
    s.dragPitch = want.pitch - basePitch;

    if (!cur.current.init) {
      cur.current = { yaw: want.yaw, pitch: want.pitch, init: true };
    }
    cur.current.yaw = damp(cur.current.yaw, want.yaw, 5, dt);
    cur.current.pitch = damp(cur.current.pitch, want.pitch, 5, dt);

    // subtle hand-held breathing for realism
    const t = clock.elapsedTime;
    const sway = (1 - ph.exit) * 0.004;
    cam.rotation.set(cur.current.pitch + Math.sin(t * 0.7) * sway, cur.current.yaw + Math.sin(t * 0.43) * sway, 0, "YXZ");

    // dolly forward along the view direction on exit
    dir.set(0, 0, -1).applyEuler(cam.rotation);
    cam.position.copy(dir.multiplyScalar(vis.dolly));

    const fov = (baseFov / DEG) * vis.fovScale;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    brightness.current = 1 - vis.fade * 0.85;

    const pos = viewPosition(cur.current.yaw, limits);
    // only count what the visitor has actually seen (the viewer pre-mounts before it is visible)
    onLook(pos, vis.ui > 0.5 ? tracker.visit(pos) : tracker.explored);
  });
  return null;
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

export default function GymViewer({ view, look, running, lite, autoRotate, onLook, onReady }: Props) {
  const brightness = useRef(1);
  return (
    <Canvas
      dpr={lite ? 1 : [1, 1.5]}
      frameloop={running ? "always" : "never"}
      camera={{ position: [0, 0, 0], fov: 50, near: 0.05, far: 50 }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#050505"]} />
      <Suspense fallback={null}>
        <Screen view={view} brightness={brightness} />
        <Ready onReady={onReady} />
      </Suspense>
      <Dust count={lite ? 70 : 220} />
      <Rig view={view} look={look} autoRotate={autoRotate} onLook={onLook} brightness={brightness} />
    </Canvas>
  );
}
