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
  viewPosition,
  type GymView,
} from "@/lib/gym/look";
import { journeyPhases, journeyVisuals, scrollYaw } from "@/lib/gym/journey";
import { Dust, PhotoScreen, preparePhotoTexture } from "@/components/gym/PhotoScreen";

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

/** The entrance's photo: cached by useLoader so returning to the section is instant. */
function Screen({ view, brightness }: { view: GymView; brightness: React.MutableRefObject<number> }) {
  const tex = useLoader(THREE.TextureLoader, view.src);
  const { gl } = useThree();
  useMemo(() => preparePhotoTexture(tex, gl), [tex, gl]);
  return <PhotoScreen view={view} texture={tex} brightness={brightness} />;
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
