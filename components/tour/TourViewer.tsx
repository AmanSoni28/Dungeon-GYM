"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clampLook, damp, DEG, fitCameraFov, horizontalFov, lookLimits } from "@/lib/gym/look";
import { hotspotPoint, type TourLook, type TourStop } from "@/lib/tour/tour";
import { Dust, PhotoScreen, preparePhotoTexture } from "@/components/gym/PhotoScreen";

export type TourViewerProps = {
  stop: TourStop;
  look: React.MutableRefObject<TourLook>;
  /** target for the cinematic push: 1 = pushed in + darkened (travelling / loading), 0 = settled */
  push: React.MutableRefObject<number>;
  /** DOM hotspot buttons, positioned every frame over their spot in the photo */
  hotspots: React.MutableRefObject<(HTMLElement | null)[]>;
  lite: boolean;
  onReady: () => void;
  /** every frame: view yaw and the camera's horizontal field of view (radians) */
  onLook: (yaw: number, viewHFov: number) => void;
  /** WebGL context lost: the caller switches to the photo fallback */
  onLost: () => void;
};

/** One zone's photo. Its texture is freed from the GPU (and the loader cache) when the zone is left. */
function ZoneScreen({
  stop,
  lite,
  brightness,
  onReady,
}: Pick<TourViewerProps, "stop" | "lite" | "onReady"> & { brightness: React.MutableRefObject<number> }) {
  const src = lite && stop.srcSmall ? stop.srcSmall : stop.src;
  const tex = useLoader(THREE.TextureLoader, src);
  const { gl } = useThree();
  useMemo(() => preparePhotoTexture(tex, gl), [tex, gl]);
  useEffect(
    () => () => {
      tex.dispose();
      useLoader.clear(THREE.TextureLoader, src);
    },
    [tex, src]
  );
  useEffect(() => onReady(), [onReady]);
  return <PhotoScreen view={stop} texture={tex} brightness={brightness} />;
}

function Rig({
  stop,
  look,
  push,
  hotspots,
  onLook,
  brightness,
}: Pick<TourViewerProps, "stop" | "look" | "push" | "hotspots" | "onLook"> & { brightness: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  // starts pushed in: the tour opens with a pull-back reveal
  const cur = useRef({ yaw: 0, pitch: 0, zoom: 1, push: 1, init: false });
  const points = useMemo(() => stop.hotspots.map((h) => new THREE.Vector3(...hotspotPoint(h, stop))), [stop]);
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    cur.current.init = false; // new zone: snap to its resting view
  }, [stop]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const s = look.current;
    const c = cur.current;

    c.zoom = damp(c.zoom, s.zoom, 8, dt);
    c.push = damp(c.push, push.current, 4.5, dt);
    const fov = fitCameraFov(stop, aspect) / (c.zoom * (1 + 0.28 * c.push));

    // never look past the photo's real edges (limits widen as you zoom in)
    const limits = lookLimits(stop, fov, aspect);
    const rest = (stop.pitch ?? 0) * DEG;
    const want = clampLook(s.dragYaw, rest + s.dragPitch, limits);
    s.dragYaw = want.yaw;
    s.dragPitch = want.pitch - rest;
    if (!c.init) {
      c.yaw = want.yaw;
      c.pitch = want.pitch;
      c.init = true;
    }
    c.yaw = damp(c.yaw, want.yaw, 6, dt);
    c.pitch = damp(c.pitch, want.pitch, 6, dt);

    const t = clock.elapsedTime;
    const sway = 0.003; // hand-held breathing
    cam.rotation.set(c.pitch + Math.sin(t * 0.7) * sway, c.yaw + Math.sin(t * 0.43) * sway, 0, "YXZ");
    const deg = fov / DEG;
    if (Math.abs(cam.fov - deg) > 0.005) {
      cam.fov = deg;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    brightness.current = 1 - 0.8 * c.push;

    // hotspots: project their spot in the photo to the screen
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    points.forEach((p, i) => {
      const el = hotspots.current[i];
      if (!el) return;
      ndc.copy(p).project(cam);
      const visible = p.dot(fwd) > 0 && Math.abs(ndc.x) < 1.02 && Math.abs(ndc.y) < 1.02;
      const x = ((ndc.x + 1) / 2) * size.width;
      const y = ((1 - ndc.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      const v = visible ? "true" : "false";
      if (el.dataset.visible !== v) el.dataset.visible = v;
    });

    onLook(c.yaw, horizontalFov(fov, aspect));
  });
  return null;
}

export default function TourViewer({ stop, look, push, hotspots, lite, onReady, onLook, onLost }: TourViewerProps) {
  const brightness = useRef(0);
  return (
    <Canvas
      dpr={lite ? 1 : [1, 1.75]}
      camera={{ position: [0, 0, 0], fov: 50, near: 0.05, far: 50 }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        })
      }
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#050505"]} />
      <Suspense fallback={null}>
        <ZoneScreen key={stop.id} stop={stop} lite={lite} brightness={brightness} onReady={onReady} />
      </Suspense>
      <Dust count={lite ? 60 : 180} />
      <Rig stop={stop} look={look} push={push} hotspots={hotspots} onLook={onLook} brightness={brightness} />
    </Canvas>
  );
}
