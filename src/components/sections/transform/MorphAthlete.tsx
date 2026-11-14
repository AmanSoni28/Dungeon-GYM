"use client";

// The member in the Transformations section: the same real, photo-textured skinned human as the Group Classes
// athlete (Microsoft Rocketbox, MIT), loaded as his own copy. Two GPU morph targets are built at load time from
// the skin weights — "fat" (belly pushed forward, waist, hips, thighs, neck) and "muscle" (shoulders, arms,
// chest, legs) — and the parent drives their weights from the member's numbers month by month. Posture follows
// too: shoulders rolled and head down on day one, chest up today.
// Writes back where his chest, belly and arm are on the canvas, so the HTML callouts stay pinned to his body.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { athleteGloss, canonicalBone, loadAthleteScene } from "@/lib/athlete/model";

export { preloadAthlete } from "@/lib/athlete/model";

/** What the parent asks for; the figure eases toward it. */
export type BodyInput = { fat: number; muscle: number; posture: number; yaw: number; sway: boolean };
type Pt = { x: number; y: number };
export type BodyMarks = { ready: boolean; chest: Pt; belly: Pt; arm: Pt };

const HEIGHT = 1.82;
const CAM = { fov: 23, pos: [0, 1.0, 5.4] as const, look: [0, 0.92, 0] as const };

/** metres pushed out along the skin normal, per bone the vertex follows */
const FAT: Record<string, number> = {
  Spine: 0.055, Spine1: 0.04, Hips: 0.032, Spine2: 0.02, Neck: 0.014,
  LeftUpLeg: 0.024, RightUpLeg: 0.024, LeftLeg: 0.008, RightLeg: 0.008,
  LeftArm: 0.013, RightArm: 0.013, LeftForeArm: 0.005, RightForeArm: 0.005,
  LeftShoulder: 0.008, RightShoulder: 0.008,
};
/** the belly goes forward far more than it goes back */
const BELLY = new Set(["Spine", "Spine1", "Hips"]);
const MUSCLE: Record<string, number> = {
  LeftArm: 0.026, RightArm: 0.026, LeftForeArm: 0.013, RightForeArm: 0.013,
  LeftShoulder: 0.024, RightShoulder: 0.024, Spine2: 0.02, Neck: 0.012,
  LeftUpLeg: 0.014, RightUpLeg: 0.014, LeftLeg: 0.01, RightLeg: 0.01,
  Spine: -0.006, // a tighter waist under a bigger frame
};

type Rig = {
  model: THREE.Group;
  bone: (n: string) => THREE.Bone | undefined;
  rest: Map<THREE.Bone, THREE.Quaternion>;
  meshes: THREE.SkinnedMesh[];
};

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const T = { a: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion(), r: new THREE.Quaternion(), s: new THREE.Quaternion() };

const wpos = (o: THREE.Object3D, out: THREE.Vector3) => {
  o.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(o.matrixWorld);
};
function rotateWorld(bone: THREE.Object3D, delta: THREE.Quaternion) {
  bone.updateWorldMatrix(true, false);
  const w = bone.getWorldQuaternion(T.r).premultiply(delta);
  if (bone.parent) {
    bone.parent.getWorldQuaternion(T.s).invert();
    bone.quaternion.copy(T.s.multiply(w));
  } else bone.quaternion.copy(w);
}
function aim(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) {
  const from = wpos(child, T.a).sub(wpos(bone, T.b)).normalize();
  rotateWorld(bone, T.q.setFromUnitVectors(from, dir.clone().normalize()));
}

// One private copy of the model (the Group Classes athlete reshapes its own copy); FBX bytes and textures are shared.
let loading: Promise<THREE.Group> | null = null;
const loadAthlete = () => {
  loading ??= loadAthleteScene();
  loading.catch(() => (loading = null));
  return loading;
};

/** Build the fat and muscle morph targets from the skin weights. */
function buildMorphs(scene: THREE.Object3D, fwdWorld: THREE.Vector3) {
  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    meshes.push(m);
    const g = m.geometry;
    const pos = g.getAttribute("position");
    const nrm = g.getAttribute("normal");
    const si = g.getAttribute("skinIndex");
    const sw = g.getAttribute("skinWeight");
    if (!pos || !nrm || !si || !sw) return;
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    const unit = Math.max(size.x, size.y, size.z) / HEIGHT;
    const names = m.skeleton.bones.map((b) => canonicalBone(b.name));
    const fat = names.map((n) => (FAT[n] ?? 0) * unit);
    const belly = names.map((n) => (BELLY.has(n) ? 1 : 0));
    const mus = names.map((n) => (MUSCLE[n] ?? 0) * unit);
    // the body's forward direction in this geometry's own space
    const fwd = fwdWorld.clone().transformDirection(m.bindMatrixInverse);

    const dFat = new Float32Array(pos.count * 3);
    const dMus = new Float32Array(pos.count * 3);
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      let kf = 0, kb = 0, km = 0;
      for (let j = 0; j < 4; j++) {
        const w = sw.getComponent(i, j);
        if (!w) continue;
        const b = si.getComponent(i, j);
        kf += w * (fat[b] ?? 0);
        kb += w * (belly[b] ?? 0);
        km += w * (mus[b] ?? 0);
      }
      if (!kf && !km) continue;
      n.fromBufferAttribute(nrm, i).normalize();
      const facing = n.dot(fwd);
      // belly: bulges forward, barely back
      kf *= 1 + kb * (facing > 0 ? 1.9 * facing : 0.55 * facing);
      // chest: pecs push forward more than the upper back
      km *= 1 + 0.5 * Math.max(0, facing);
      dFat.set([n.x * kf, n.y * kf, n.z * kf], i * 3);
      dMus.set([n.x * km, n.y * km, n.z * km], i * 3);
    }
    g.morphAttributes.position = [new THREE.BufferAttribute(dFat, 3), new THREE.BufferAttribute(dMus, 3)];
    g.morphTargetsRelative = true;
    m.updateMorphTargets();
    m.morphTargetInfluences = [0, 0];
    m.frustumCulled = false;
    m.material = Array.isArray(m.material) ? m.material.map(skin) : skin(m.material);
  });
  return meshes;
}

function skin(src: THREE.Material) {
  const o = src as THREE.MeshPhongMaterial;
  const map = o.map ?? null;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  // gloss mask set up front (matte hair, beard, trainers): the shader compiles once, never again mid-scroll
  const gloss = athleteGloss(map);
  const m = new THREE.MeshPhysicalMaterial({
    name: o.name,
    map,
    normalMap: o.normalMap ?? null,
    specularColorMap: gloss,
    clearcoatMap: gloss,
    sheenColorMap: gloss,
    specularIntensityMap: gloss, // alpha: also damps the grazing-angle (Fresnel) shine on black hair and kit
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.14,
    clearcoatRoughness: 0.45,
    sheen: 0.08,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#f2e6da"),
    envMapIntensity: 0.6,
  });
  src.dispose();
  return m;
}

function buildRig(scene: THREE.Group): Rig | null {
  const bones = new Map<string, THREE.Bone>();
  scene.traverse((o) => {
    const b = o as THREE.Bone;
    if (b.isBone && !bones.has(canonicalBone(b.name))) bones.set(canonicalBone(b.name), b);
  });
  const bone = (n: string) => bones.get(n);
  const need = ["Hips", "Spine2", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand"];
  if (need.some((n) => !bone(n))) return null;

  scene.updateMatrixWorld(true);
  const up = wpos(bone("Head")!, new THREE.Vector3()).sub(wpos(bone("Hips")!, new THREE.Vector3())).normalize();
  const right = wpos(bone("RightArm")!, new THREE.Vector3()).sub(wpos(bone("LeftArm")!, new THREE.Vector3())).normalize();
  const meshes = buildMorphs(scene, new THREE.Vector3().crossVectors(up, right).normalize());

  // stand him up facing the camera (+Z), his right side to screen left, feet on y = 0, HEIGHT tall
  const model = new THREE.Group();
  model.add(scene);
  model.updateMatrixWorld(true);
  scene.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, Y));
  model.updateMatrixWorld(true);
  const r2 = wpos(bone("RightArm")!, new THREE.Vector3()).sub(wpos(bone("LeftArm")!, new THREE.Vector3()));
  r2.y = 0;
  scene.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(r2.normalize(), new THREE.Vector3(-1, 0, 0)));
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene, true);
  scene.scale.multiplyScalar(HEIGHT / Math.max(1e-6, box.max.y - box.min.y));
  model.updateMatrixWorld(true);
  box.setFromObject(scene, true);
  const hips = wpos(bone("Hips")!, new THREE.Vector3());
  scene.position.x -= hips.x;
  scene.position.z -= hips.z;
  scene.position.y -= box.min.y;
  model.updateMatrixWorld(true);

  const rest = new Map<THREE.Bone, THREE.Quaternion>();
  bones.forEach((b) => rest.set(b, b.quaternion.clone()));
  return { model, bone, rest, meshes };
}

/** Stand him for the current shape: arms hang off the frame, posture from slumped to proud. */
function pose(rig: Rig, s: { fat: number; muscle: number; posture: number }, breath: number) {
  const b = rig.bone;
  rig.model.rotation.y = 0;
  rig.rest.forEach((q, bone) => bone.quaternion.copy(q));
  rig.model.updateMatrixWorld(true);

  const slump = 1 - s.posture;
  const spine2 = b("Spine2")!;
  const spine1 = b("Spine1");
  rotateWorld(spine2, T.q.setFromAxisAngle(X, 0.11 * slump - 0.05 * s.posture - breath * 0.008));
  if (spine1) rotateWorld(spine1, T.q.setFromAxisAngle(X, 0.04 * slump));
  rotateWorld(b("Neck")!, T.q.setFromAxisAngle(X, 0.1 * slump));
  rotateWorld(b("Head")!, T.q.setFromAxisAngle(X, 0.1 * slump - 0.07 * s.posture));

  // arms: hang down, held further out by a bigger belly or bigger lats
  const out = 0.13 + 0.13 * s.fat + 0.07 * Math.max(0, s.muscle) + breath * 0.006;
  for (const [sd, sign] of [["Left", 1], ["Right", -1]] as const) {
    aim(b(`${sd}Arm`)!, b(`${sd}ForeArm`)!, new THREE.Vector3(sign * Math.sin(out), -Math.cos(out), 0.03 + 0.05 * slump));
    aim(b(`${sd}ForeArm`)!, b(`${sd}Hand`)!, new THREE.Vector3(sign * Math.sin(out * 0.6), -Math.cos(out * 0.6), 0.2));
  }
  rig.model.updateMatrixWorld(true);
}

function Athlete({ input, marks }: { input: BodyInput; marks: BodyMarks }) {
  const [rig, setRig] = useState<Rig | null>(null);
  const { camera, size, gl, scene: world } = useThree();
  const cur = useRef({ fat: input.fat, muscle: input.muscle, posture: input.posture, yaw: 0 });

  useEffect(() => {
    let live = true;
    loadAthlete()
      .then(async (scene) => {
        if (!live) return;
        const r = (scene.userData.tfRig as Rig | null | undefined) ?? buildRig(scene);
        scene.userData.tfRig = r;
        // compile his shaders in the background (parallel where the GPU allows) so the first frame doesn't stall
        if (r) await gl.compileAsync(r.model, camera, world).catch(() => {});
        if (live) setRig(r);
      })
      .catch((e) => console.warn("[MorphAthlete] could not load the athlete", e));
    return () => {
      live = false;
    };
  }, [gl, camera, world]);

  const project = (p: THREE.Vector3, out: Pt) => {
    const v = p.project(camera);
    out.x = ((v.x + 1) / 2) * size.width;
    out.y = ((1 - v.y) / 2) * size.height;
  };

  useFrame(({ clock }, dt) => {
    if (!rig) return;
    const c = cur.current;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 5);
    c.fat += (input.fat - c.fat) * k;
    c.muscle += (input.muscle - c.muscle) * k;
    c.posture += (input.posture - c.posture) * k;
    const time = clock.elapsedTime;
    const yaw = input.yaw + (input.sway ? Math.sin(time * 0.38) * 0.32 : 0);
    c.yaw += (yaw - c.yaw) * (1 - Math.exp(-Math.min(dt, 0.1) * 6));

    for (const m of rig.meshes) {
      m.morphTargetInfluences![0] = c.fat;
      m.morphTargetInfluences![1] = c.muscle;
    }
    pose(rig, c, Math.sin(time * 1.6));
    rig.model.rotation.y = c.yaw;
    rig.model.updateMatrixWorld(true);

    // callout anchors, pushed out to the skin
    const fwd = T.a.set(Math.sin(c.yaw), 0, Math.cos(c.yaw));
    const chest = wpos(rig.bone("Spine2")!, new THREE.Vector3()).addScaledVector(fwd, 0.13 + 0.03 * c.muscle).add(new THREE.Vector3(0, 0.06, 0));
    project(chest, marks.chest);
    const belly = wpos(rig.bone("Spine")!, new THREE.Vector3()).addScaledVector(fwd, 0.13 + 0.12 * c.fat);
    project(belly, marks.belly);
    const arm = wpos(rig.bone("LeftArm")!, new THREE.Vector3()).lerp(wpos(rig.bone("LeftForeArm")!, new THREE.Vector3()), 0.5);
    project(arm, marks.arm);
    marks.ready = true;
  });

  return rig ? <primitive object={rig.model} /> : null;
}

function Lights({ input }: { input: BodyInput }) {
  const rim = useRef<THREE.SpotLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 1.05, 0);
    return o;
  }, []);
  // the light warms and the gold rim grows as he transforms
  useFrame(() => {
    if (rim.current) rim.current.intensity += (25 + 75 * input.posture - rim.current.intensity) * 0.08;
    if (key.current) key.current.intensity += (55 + 40 * input.posture - key.current.intensity) * 0.08;
  });
  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={0.14} color="#ffe2c0" />
      <spotLight ref={key} position={[2.2, 3.6, 3.4]} target={target} angle={0.5} penumbra={0.9} intensity={70} decay={1.6} color="#ffd6a0" />
      <spotLight ref={rim} position={[-2.6, 2.8, -2.2]} target={target} angle={0.7} penumbra={1} intensity={40} decay={1.5} color="#e0b44c" />
      <spotLight position={[2.6, 2.2, -2.4]} target={target} angle={0.7} penumbra={1} intensity={30} decay={1.5} color="#f5c870" />
      <pointLight position={[-1.8, 1.2, 3.2]} intensity={2.4} distance={8} decay={1.5} color="#a9bcff" />
    </>
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    return () => {
      scene.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
}

function ContactShadow() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, "rgba(0,0,0,0.85)");
      r.addColorStop(0.5, "rgba(0,0,0,0.4)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} scale={[1.3, 0.8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

export default function MorphAthlete({ input, marks, running }: { input: BodyInput; marks: BodyMarks; running: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={running ? "always" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: CAM.fov, position: [...CAM.pos], near: 0.1, far: 30 }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(...CAM.look);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Environment />
      <Lights input={input} />
      <ContactShadow />
      <Athlete input={input} marks={marks} />
    </Canvas>
  );
}
