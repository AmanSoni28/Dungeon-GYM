"use client";

// The bronze athlete hauling the Group Classes rope, side-on and facing the cards.
// Reads the shared RopeRig every frame and writes back where his hands are on the canvas,
// so the SVG rope (drawn by the page) starts exactly in his grip.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Athlete, applyPose, emptyJoints, type Joints } from "@/components/intro/Athlete";
import { rigState, ropePose, type RopeRig } from "@/lib/classes/ropePull";

/** camera framing: feet near the bottom of the canvas, hands at ~45% height, body left of centre */
const CAM = { fov: 24, x: 0.2, y: 0.93, z: 5.05 };

function Driver({ rig, joints }: { rig: RopeRig; joints: React.MutableRefObject<Joints> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => ({ l: new THREE.Vector3(), r: new THREE.Vector3() }), []);
  const lastSize = useRef("");
  const dressed = useRef(false);
  // dark patinated bronze with a lacquered clearcoat: the gold rims catch its edges like a gallery sculpture
  const bronze = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#22170f",
        metalness: 0.78,
        roughness: 0.34,
        clearcoat: 0.7,
        clearcoatRoughness: 0.28,
        sheen: 0.4,
        sheenColor: new THREE.Color("#d4af37"),
      }),
    []
  );

  const handOnCanvas = () => {
    const j = joints.current;
    if (!j.handL || !j.handR) return null;
    // the camera's view matrix is only refreshed at render time: refresh it before projecting
    camera.updateMatrixWorld();
    j.root?.parent?.updateMatrixWorld(true);
    j.handL.getWorldPosition(v.l);
    j.handR.getWorldPosition(v.r);
    v.l.add(v.r).multiplyScalar(0.5).project(camera);
    return { x: ((v.l.x + 1) / 2) * size.width, y: ((1 - v.l.y) / 2) * size.height };
  };

  useFrame(({ clock }) => {
    const j = joints.current;
    if (!j.hips) return;
    if (!dressed.current && j.root) {
      dressed.current = true;
      // skin is the material shared by most of the body → patinated bronze; shorts and shoes stay matte black
      const uses = new Map<THREE.Material, THREE.Mesh[]>();
      j.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || Array.isArray(m.material)) return;
        uses.set(m.material, [...(uses.get(m.material) ?? []), m]);
      });
      const skin = [...uses.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      skin?.[1].forEach((m) => (m.material = bronze));
    }
    const key = `${size.width}x${size.height}`;
    if (key !== lastSize.current) {
      // resting hand height (mid-stroke): where the eyelets on the cards line up with the rope
      lastSize.current = key;
      applyPose(j, ropePose(0.5), 0);
      const p = handOnCanvas();
      if (p) rig.hand.restY = p.y;
    }
    const s = rigState(rig);
    const breath = Math.sin(clock.elapsedTime * 1.6) * (1 - s.tension);
    applyPose(j, ropePose(s.drive, breath), breath);
    // shoulders roll a touch with the effort of each drive
    if (j.spine) j.spine.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.012 * (1 - s.tension);
    const p = handOnCanvas();
    if (p) {
      rig.hand.x = p.x;
      rig.hand.y = p.y;
      rig.hand.ready = true;
    }
  });
  return null;
}

/** soft contact shadow under the feet (radial falloff, no hard edge) */
function ContactShadow() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, "rgba(0,0,0,0.75)");
      r.addColorStop(0.5, "rgba(0,0,0,0.35)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0.05, 0.002, 0]} scale={[1.6, 0.9, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

function Lights() {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 1.1, 0);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={0.18} color="#ffe2c0" />
      {/* warm key from the cards' side, high: sculpts the chest and arms */}
      <spotLight position={[3.2, 3.6, 2.6]} target={target} angle={0.55} penumbra={0.8} intensity={70} decay={1.6} color="#ffd9a8" />
      {/* gold rims from behind carve the silhouette out of the dark section */}
      <pointLight position={[-1.6, 2.2, -1.6]} intensity={14} distance={7} decay={1.4} color="#d4af37" />
      <pointLight position={[1.2, 0.6, -1.8]} intensity={6} distance={6} decay={1.4} color="#f5c870" />
      {/* faint cool fill so the shadow side never goes flat black */}
      <pointLight position={[-2, 1, 3]} intensity={1.6} distance={8} decay={1.5} color="#9fb4ff" />
    </>
  );
}

export default function RopeAthlete({ rig, running }: { rig: RopeRig; running: boolean }) {
  const joints = useRef<Joints>(emptyJoints());
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={running ? "always" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: CAM.fov, position: [CAM.x, CAM.y, CAM.z], near: 0.1, far: 30 }}
      onCreated={({ camera }) => camera.lookAt(CAM.x, CAM.y, 0)}
      style={{ pointerEvents: "none" }}
    >
      <Lights />
      {/* faces +X: toward the cards on the right of the screen */}
      <group rotation-y={Math.PI / 2}>
        <Athlete joints={joints} shadows={false} />
      </group>
      <ContactShadow />
      <Driver rig={rig} joints={joints} />
    </Canvas>
  );
}
