"use client";

// The athlete hauling the Group Classes rope: a real, photo-textured skinned human (Microsoft Rocketbox
// "Sports_Male_04", MIT licence; textures re-graded as an Indian athlete with black-and-gold kit, muscles built up
// at load time), side-on and facing the cards. Any Mixamo- or 3ds Max Biped-rigged FBX/GLB can be dropped in instead. He is posed procedurally every frame from the shared
// RopeRig (no baked animation): feet planted in a staggered stance, hips sunk, torso hanging back on the rope,
// arms solved with two-bone IK so his fists sit on the rope line, fingers curled round it. Each stroke one hand
// drives back to the hip while the other slides forward to re-grip (hand over hand).
// Writes back where his fists and the rope's tail are on the canvas, so the SVG rope runs exactly through his grip.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { haulPose, type HandMarks, type RopeRig } from "@/lib/classes/ropePull";
import { ATHLETE_MODEL, athleteGloss, canonicalBone, loadAthleteScene, preloadAthlete as preloadFiles } from "@/lib/athlete/model";

export { canonicalBone };

export const PULLER_MODEL = ATHLETE_MODEL;

/** this scene's private copy of the athlete (it bulks up his geometry); FBX bytes and textures are shared */
let ropeScene: Promise<THREE.Group> | null = null;
const getRopeScene = () => {
  ropeScene ??= loadAthleteScene();
  ropeScene.catch(() => (ropeScene = null));
  return ropeScene;
};

/** idle preload: download the files and parse his copy now, so mounting doesn't block on the FBX parse */
export const preloadAthlete = () => {
  preloadFiles();
  getRopeScene().catch(() => {});
};

/** extra muscle (m, pushed out along the skin normal) by the bone a vertex follows: a gym-built frame */
const BULK: Record<string, number> = {
  LeftArm: 0.023, RightArm: 0.023,
  LeftForeArm: 0.012, RightForeArm: 0.012,
  LeftShoulder: 0.02, RightShoulder: 0.02,
  Spine2: 0.018, Spine1: 0.009, Neck: 0.012,
  LeftUpLeg: 0.011, RightUpLeg: 0.011,
  LeftLeg: 0.008, RightLeg: 0.008,
};

/** body height the model is normalised to (m) — all stance numbers below are in these metres */
const HEIGHT = 1.82;
/** camera: a touch in front of side-on, so the chest and the near arm read; feet near the bottom of the canvas */
const CAM = { fov: 26, pos: [1.05, 1.08, 4.55] as const, look: [0.08, 0.92, 0] as const };

type Side = "Left" | "Right";

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;

type Rig = {
  model: THREE.Object3D;
  bone: (name: string) => THREE.Bone | undefined;
  rest: Map<THREE.Bone, { q: THREE.Quaternion; p: THREE.Vector3 }>;
  footRest: Record<Side, THREE.Quaternion>;
  arm: Record<Side, { a: number; b: number }>;
  leg: Record<Side, { a: number; b: number }>;
  hipY: number;
  ankleY: number;
  /** per finger bone: local curl axis (closing toward the palm) and how far it closes in a full fist */
  curl: { bone: THREE.Bone; axis: THREE.Vector3; max: number; side: Side }[];
};

// scratch objects (one athlete per page, so module scope is fine)
const V = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3() };
const Q = { a: new THREE.Quaternion(), b: new THREE.Quaternion(), c: new THREE.Quaternion() };
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const wpos = (o: THREE.Object3D, out: THREE.Vector3) => {
  o.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(o.matrixWorld);
};
const wquat = (o: THREE.Object3D, out: THREE.Quaternion) => {
  o.updateWorldMatrix(true, false);
  return o.getWorldQuaternion(out);
};

/** set a bone's orientation in world space */
function setWorldQuat(bone: THREE.Object3D, q: THREE.Quaternion) {
  const parent = bone.parent;
  if (!parent) return void bone.quaternion.copy(q);
  wquat(parent, Q.c).invert();
  bone.quaternion.copy(Q.c.multiply(q));
}
/** rotate a bone by `delta`, expressed in world space */
function rotateWorld(bone: THREE.Object3D, delta: THREE.Quaternion) {
  wquat(bone, Q.b);
  setWorldQuat(bone, Q.b.premultiply(delta));
}
/** swing a bone (minimal rotation) so its child sits in world direction `dir` */
function aim(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) {
  const from = wpos(child, V.d).sub(wpos(bone, V.e)).normalize();
  rotateWorld(bone, Q.a.setFromUnitVectors(from, V.e.copy(dir).normalize()));
}

/** analytic two-bone IK: root → mid → end reaches `target`, the middle joint bending toward `pole` */
function twoBone(root: THREE.Bone, mid: THREE.Bone, end: THREE.Bone, len: { a: number; b: number }, target: THREE.Vector3, pole: THREE.Vector3) {
  const S = wpos(root, new THREE.Vector3());
  const D = target.clone().sub(S);
  const dist = D.length();
  const n = D.normalize();
  const d = THREE.MathUtils.clamp(dist, Math.abs(len.a - len.b) + 1e-3, len.a + len.b - 1e-3);
  const x = (len.a * len.a - len.b * len.b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, len.a * len.a - x * x));
  const p = pole.clone().addScaledVector(n, -pole.dot(n)).normalize();
  const elbow = S.clone().addScaledVector(n, x).addScaledVector(p, h);
  aim(root, mid, elbow.clone().sub(S));
  aim(mid, end, S.addScaledVector(n, d).sub(elbow));
}

/** build up the muscles: push skin out along its normals, by how much each vertex follows the arm/chest/leg bones */
function bulkUp(scene: THREE.Object3D, height: number) {
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || m.userData.bulked) return;
    m.userData.bulked = true;
    const g = m.geometry;
    const pos = g.getAttribute("position");
    const nrm = g.getAttribute("normal");
    const si = g.getAttribute("skinIndex");
    const sw = g.getAttribute("skinWeight");
    if (!pos || !nrm || !si || !sw) return;
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    const unit = Math.max(size.x, size.y, size.z) / height; // geometry units per metre
    const per = m.skeleton.bones.map((b) => (BULK[canonicalBone(b.name)] ?? 0) * unit);
    for (let i = 0; i < pos.count; i++) {
      let k = 0;
      for (let j = 0; j < 4; j++) k += sw.getComponent(i, j) * (per[si.getComponent(i, j)] ?? 0);
      if (!k) continue;
      pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * k, pos.getY(i) + nrm.getY(i) * k, pos.getZ(i) + nrm.getZ(i) * k);
    }
    pos.needsUpdate = true;
    g.computeBoundingBox();
    g.computeBoundingSphere();
  });
}

function buildRig(scene: THREE.Object3D): Rig | null {
  const bones = new Map<string, THREE.Bone>();
  scene.traverse((o) => {
    const b = o as THREE.Bone;
    if (!b.isBone) return;
    const key = canonicalBone(b.name);
    if (!bones.has(key)) bones.set(key, b);
  });
  const bone = (name: string) => bones.get(name);
  const need = ["Hips", "Spine", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];
  if (need.some((n) => !bone(n))) {
    console.warn("[RopePuller] model is missing Mixamo bones:", need.filter((n) => !bone(n)));
    return null;
  }

  // stand him up (Z-up files), face +X toward the cards (his right side to the camera), stand on y = 0,
  // normalise to HEIGHT — whatever axes the file uses
  const model = new THREE.Group();
  model.add(scene);
  model.updateMatrixWorld(true);
  const up = wpos(bone("Head")!, new THREE.Vector3()).sub(wpos(bone("Hips")!, new THREE.Vector3())).normalize();
  scene.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, Y));
  model.updateMatrixWorld(true);
  const rightward = wpos(bone("RightArm")!, new THREE.Vector3()).sub(wpos(bone("LeftArm")!, new THREE.Vector3()));
  rightward.y = 0;
  scene.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(rightward.normalize(), Z));
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene, true);
  const s = HEIGHT / Math.max(1e-6, box.max.y - box.min.y);
  scene.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  box.setFromObject(scene, true);
  const hips0 = wpos(bone("Hips")!, new THREE.Vector3());
  scene.position.x -= hips0.x;
  scene.position.z -= hips0.z;
  scene.position.y -= box.min.y;
  model.updateMatrixWorld(true);

  const rest = new Map<THREE.Bone, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  bones.forEach((b) => rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() }));

  const dist = (a: string, b: string) => wpos(bone(a)!, new THREE.Vector3()).distanceTo(wpos(bone(b)!, new THREE.Vector3()));
  const sides: Side[] = ["Left", "Right"];
  const arm = {} as Rig["arm"];
  const leg = {} as Rig["leg"];
  const footRest = {} as Rig["footRest"];
  const curl: Rig["curl"] = [];
  for (const sd of sides) {
    arm[sd] = { a: dist(`${sd}Arm`, `${sd}ForeArm`), b: dist(`${sd}ForeArm`, `${sd}Hand`) };
    leg[sd] = { a: dist(`${sd}UpLeg`, `${sd}Leg`), b: dist(`${sd}Leg`, `${sd}Foot`) };
    footRest[sd] = wquat(bone(`${sd}Foot`)!, new THREE.Quaternion());

    // the palm faces the side the thumb reaches toward; fingers close about the knuckle line toward it
    const hand = wpos(bone(`${sd}Hand`)!, new THREE.Vector3());
    const idx = bone(`${sd}HandIndex1`);
    const pky = bone(`${sd}HandPinky1`) ?? bone(`${sd}HandRing1`);
    const mid = bone(`${sd}HandMiddle1`);
    const th = bone(`${sd}HandThumb2`);
    if (!idx || !pky || !mid || !th) continue;
    const knuckles = wpos(idx, new THREE.Vector3()).sub(wpos(pky, new THREE.Vector3())).normalize();
    const along = wpos(mid, new THREE.Vector3()).sub(hand).normalize();
    const palm = new THREE.Vector3().crossVectors(along, knuckles).normalize();
    if (wpos(th, new THREE.Vector3()).sub(hand).dot(palm) < 0) palm.negate();
    for (const f of FINGERS) {
      for (let j = 1; j <= 3; j++) {
        const b = bone(`${sd}Hand${f}${j}`);
        if (!b) continue;
        // the tip joint has no child in some rigs: it points the way the joint before it does
        const c = bone(`${sd}Hand${f}${j + 1}`);
        const prev = j > 1 ? bone(`${sd}Hand${f}${j - 1}`) : undefined;
        const dir = c
          ? wpos(c, new THREE.Vector3()).sub(wpos(b, new THREE.Vector3())).normalize()
          : prev
            ? wpos(b, new THREE.Vector3()).sub(wpos(prev, new THREE.Vector3())).normalize()
            : null;
        if (!dir) continue;
        const axisW = new THREE.Vector3().crossVectors(dir, palm).normalize();
        const axis = axisW.applyQuaternion(wquat(b, new THREE.Quaternion()).invert());
        const max = f === "Thumb" ? [0.25, 0.45, 0.4][j - 1] : [1.15, 1.35, 0.9][j - 1];
        curl.push({ bone: b, axis, max, side: sd });
      }
    }
  }

  return {
    model,
    bone,
    rest,
    footRest,
    arm,
    leg,
    curl,
    hipY: wpos(bone("Hips")!, new THREE.Vector3()).y,
    ankleY: (wpos(bone("LeftFoot")!, new THREE.Vector3()).y + wpos(bone("RightFoot")!, new THREE.Vector3()).y) / 2,
  };
}

/** palm centre: where the rope runs through the fist */
function gripPoint(rig: Rig, sd: Side, out: THREE.Vector3) {
  const hand = wpos(rig.bone(`${sd}Hand`)!, out);
  const mid = rig.bone(`${sd}HandMiddle1`);
  return mid ? hand.lerp(wpos(mid, V.c), 0.75) : hand;
}

/** Pose the whole body for the haul at `t` seconds. */
function poseAt(rig: Rig, t: number, breath: number) {
  const P = haulPose(t);
  const b = rig.bone;
  rig.rest.forEach((r, bone) => {
    bone.quaternion.copy(r.q);
    bone.position.copy(r.p);
  });

  // ── hips: back and down into the stance ──
  const hips = b("Hips")!;
  const hipTarget = new THREE.Vector3(-0.03 - 0.1 * P.lean, rig.hipY - 0.08 - 0.07 * P.sit + breath * 0.004, 0);
  hips.parent!.updateWorldMatrix(true, false);
  hips.position.copy(hips.parent!.worldToLocal(hipTarget.clone()));
  // pelvis tips back a little (positive rotation about Z tips the top of the body away from the cards)
  const lean = 0.14 + 0.3 * P.lean; // torso angle behind vertical (rad)
  rotateWorld(hips, Q.a.setFromAxisAngle(Z, lean * 0.25));

  // ── spine: hang back on the rope (aimed, so it doesn't depend on the model's resting posture), spread over
  //    the vertebrae so it curves rather than hinging; shoulders twist toward the hand that is driving ──
  const twist = (P.right - P.left) * 0.22;
  const neck = b("Neck")!;
  const spine = ["Spine", "Spine1", "Spine2"].map(b).filter(Boolean) as THREE.Bone[];
  const want = new THREE.Vector3(-Math.sin(lean), Math.cos(lean), 0);
  spine.forEach((sp, i) => {
    const cur = wpos(neck, V.a).sub(wpos(sp, V.b)).normalize();
    const full = Q.b.setFromUnitVectors(cur, want);
    rotateWorld(sp, Q.a.identity().slerp(full, 1 / (spine.length - i)));
  });
  for (const sp of spine) {
    rotateWorld(sp, Q.a.setFromAxisAngle(Y, twist / spine.length));
    rotateWorld(sp, Q.a.setFromAxisAngle(Z, (breath * 0.012) / spine.length));
  }
  // head stays level, eyes on the cards
  const head = b("Head")!;
  rotateWorld(neck, Q.a.setFromAxisAngle(Z, -lean * 0.45));
  rotateWorld(head, Q.a.setFromAxisAngle(Z, -lean * 0.35 - 0.06));
  rotateWorld(head, Q.a.setFromAxisAngle(Y, -twist * 0.6));

  // ── legs: feet planted, front (left) foot forward, rear (right) foot braced behind ──
  const feet: Record<Side, THREE.Vector3> = {
    Left: new THREE.Vector3(0.36, rig.ankleY, -0.11),
    Right: new THREE.Vector3(-0.34, rig.ankleY, 0.12),
  };
  for (const sd of ["Left", "Right"] as Side[]) {
    const up = b(`${sd}UpLeg`)!;
    const kn = b(`${sd}Leg`)!;
    const ft = b(`${sd}Foot`)!;
    const pole = new THREE.Vector3(1, 0.15, sd === "Left" ? -0.12 : 0.12);
    twoBone(up, kn, ft, rig.leg[sd], feet[sd], pole);
    setWorldQuat(ft, rig.footRest[sd]);
    // the rear foot rolls onto the ball under the load
    if (sd === "Right") rotateWorld(ft, Q.a.setFromAxisAngle(Z, -0.18 - 0.12 * P.lean));
  }

  // ── arms: fists on the rope; the front reach is out over the knee, the back end at the hip ──
  for (const sd of ["Left", "Right"] as Side[]) {
    const sh = b(`${sd}Arm`)!;
    const el = b(`${sd}ForeArm`)!;
    const hd = b(`${sd}Hand`)!;
    const S = wpos(sh, new THREE.Vector3());
    const reach = (rig.arm[sd].a + rig.arm[sd].b) * 0.93;
    const front = S.clone().add(new THREE.Vector3(0.94, -0.36, 0).normalize().multiplyScalar(reach));
    const back = new THREE.Vector3(hipTarget.x + 0.2, hipTarget.y + 0.12, 0);
    const at = sd === "Right" ? P.right : P.left;
    // the wrist sits just behind and above the rope so the fist closes round it
    const target = front.lerp(back, at).add(new THREE.Vector3(-0.05, 0.03, sd === "Right" ? 0.07 : -0.04));
    const pole = new THREE.Vector3(-0.35, -1, sd === "Right" ? 0.55 : -0.55);
    twoBone(sh, el, hd, rig.arm[sd], target, pole);
    // wrist: knuckles forward along the rope, a little cocked under the load
    const fd = wpos(hd, new THREE.Vector3()).sub(wpos(el, V.a)).normalize();
    const knuckle = b(`${sd}HandMiddle1`);
    if (knuckle) aim(hd, knuckle, fd.lerp(new THREE.Vector3(1, -0.25, 0), 0.5));
  }

  // ── fists ──
  for (const c of rig.curl) {
    const g = c.side === "Right" ? P.gripR : P.gripL;
    c.bone.quaternion.multiply(Q.a.setFromAxisAngle(c.axis, c.max * (0.35 + 0.65 * g)));
  }
  rig.model.updateMatrixWorld(true);
  return P;
}

/**
 * Physically based skin from whatever the file gave us (FBX gives Phong): the photo texture and its normal map,
 * a soft skin roughness and a faint clearcoat — the sheen of a man halfway through a hard set.
 */
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
    normalScale: new THREE.Vector2(1, 1),
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    sheen: 0.08,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#f2e6da"),
    envMapIntensity: 0.6,
  });
  src.dispose();
  return m;
}

function Puller({ rig, marks }: { rig: RopeRig; marks: HandMarks }) {
  const scene = use(getRopeScene());
  const { camera, size, gl, scene: world } = useThree();
  const [shown, setShown] = useState(false);
  const built = useMemo(() => {
    // the loaded scene is cached and shared: rig it once (strict mode runs this memo twice)
    const cached = scene.userData.ropeRig as Rig | null | undefined;
    if (cached !== undefined) return cached;
    bulkUp(scene, HEIGHT);
    const r = buildRig(scene);
    scene.userData.ropeRig = r;
    if (!r) return null;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // posed far from the bind pose; the bind-pose bounds would cull him
      // keep multi-material meshes (head + hair, body + kit) as arrays: each geometry group has its own texture
      m.material = Array.isArray(m.material) ? m.material.map(skin) : skin(m.material);
    });
    return r;
  }, [scene]);

  // compile his shaders in the background (parallel where the GPU allows) before he appears, so the first frame
  // doesn't stall the scroll
  useEffect(() => {
    if (!built) return;
    let live = true;
    gl.compileAsync(built.model, camera, world)
      .catch(() => {})
      .then(() => live && setShown(true));
    return () => {
      live = false;
    };
  }, [built, gl, camera, world]);

  // soft studio reflections for skin and fabric
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    world.environment = env;
    world.environmentIntensity = 0.4;
    return () => {
      world.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, world]);

  const project = (p: THREE.Vector3) => {
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
  };
  const lastSize = useRef("");

  useFrame(({ clock }) => {
    if (!built || !shown) return;
    camera.updateMatrixWorld();
    const key = `${size.width}x${size.height}`;
    if (key !== lastSize.current) {
      // the rope's rest height (mid-stroke): where the card connectors line up
      lastSize.current = key;
      poseAt(built, 0.55 + 0.9 * 0.3, 0);
      const a = project(gripPoint(built, "Right", V.a));
      const b = project(gripPoint(built, "Left", V.a));
      marks.restY = Math.min(a.y, b.y) - 6;
    }
    const breath = Math.sin(clock.elapsedTime * 1.7);
    const P = poseAt(built, rig.t, breath);
    const r = project(gripPoint(built, "Right", V.a));
    const l = project(gripPoint(built, "Left", V.a));
    const rightFront = P.right <= P.left;
    marks.front = rightFront ? r : l;
    marks.back = rightFront ? l : r;
    marks.tail = project(new THREE.Vector3(-0.72, 0.03, 0.05));
    marks.ready = true;
  });

  return built && shown ? <primitive object={built.model} /> : null;
}

/** soft contact shadow under the feet (radial falloff, no hard edge) */
function ContactShadow() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, "rgba(0,0,0,0.8)");
      r.addColorStop(0.5, "rgba(0,0,0,0.38)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} scale={[1.7, 0.75, 1]}>
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
      <ambientLight intensity={0.12} color="#ffe2c0" />
      {/* warm key from the cards' side, high: sculpts chest, shoulders and arms */}
      <spotLight position={[3.4, 3.8, 2.4]} target={target} angle={0.5} penumbra={0.85} intensity={95} decay={1.6} color="#ffd6a0" />
      {/* gold rims from behind carve his silhouette out of the dark section */}
      <spotLight position={[-2.4, 2.6, -2]} target={target} angle={0.7} penumbra={1} intensity={60} decay={1.5} color="#e0b44c" />
      <pointLight position={[1.4, 0.4, -2]} intensity={7} distance={6} decay={1.4} color="#f5c870" />
      {/* faint cool fill so the shadow side never goes flat black */}
      <pointLight position={[-1.5, 1.2, 3.2]} intensity={2.2} distance={8} decay={1.5} color="#a9bcff" />
    </>
  );
}

export default function RopePuller({ rig, marks, running }: { rig: RopeRig; marks: HandMarks; running: boolean }) {
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
      style={{ pointerEvents: "none" }}
    >
      <Lights />
      <ContactShadow />
      <Suspense fallback={null}>
        <Puller rig={rig} marks={marks} />
      </Suspense>
    </Canvas>
  );
}

