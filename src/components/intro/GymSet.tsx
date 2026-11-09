"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { makeFloorTexture, makeStoneTexture, makeTextTexture } from "@/components/three/textures";

const STEEL = { color: "#161616", metalness: 0.85, roughness: 0.38 };
const GOLD_LINE = "#D4AF37";

const beamVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float edge = pow(abs(dot(vNormal, vView)), 1.6);
    float fall = pow(vUv.y, 1.4);
    gl_FragColor = vec4(uColor, edge * fall * uStrength);
  }
`;

/** Fake volumetric light shaft (additive cone) */
function LightShaft({ position, strength = 0.16 }: { position: [number, number, number]; strength?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        uniforms: { uColor: { value: new THREE.Color("#ffe9c2") }, uStrength: { value: strength } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [strength]
  );
  return (
    <mesh position={position} material={mat}>
      <coneGeometry args={[1.7, 5.2, 48, 1, true]} />
    </mesh>
  );
}

function PowerRack({ x, z }: { x: number; z: number }) {
  const posts: [number, number][] = [
    [-0.6, -0.55],
    [0.6, -0.55],
    [-0.6, 0.55],
    [0.6, 0.55],
  ];
  return (
    <group position={[x, 0, z]}>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.2, pz]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.3, 0.08, 1.2]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[0, 1.35, -0.55]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.014, 0.014, 2, 10]} />
        <meshStandardMaterial color="#bdb8af" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function GymSet({ lite }: { lite: boolean }) {
  const floorTex = useMemo(() => {
    const t = makeFloorTexture(512);
    t.repeat.set(8, 8);
    return t;
  }, []);
  const wallTex = useMemo(() => {
    const t = makeStoneTexture({ rows: 6, cols: 3, base: 24, seed: 11 });
    t.repeat.set(6, 2);
    return t;
  }, []);
  const sign = useMemo(() => makeTextTexture("DUNGEON", { color: "#D4AF37" }), []);

  return (
    <group>
      {/* floor: real-time reflections on desktop */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        {lite ? (
          <meshStandardMaterial map={floorTex} color="#1a1a1a" roughness={0.55} metalness={0.4} />
        ) : (
          <MeshReflectorMaterial
            map={floorTex}
            color="#1a1a1a"
            blur={[400, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={1.6}
            mixContrast={1.1}
            roughness={0.75}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            metalness={0.5}
            mirror={0.6}
          />
        )}
      </mesh>

      {/* back wall */}
      <mesh position={[0, 5, -5.5]}>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial map={wallTex} color="#3a3a3a" roughness={0.95} />
      </mesh>
      {/* vertical gold light strips */}
      {[-5.5, -3.2, 3.2, 5.5].map((x) => (
        <mesh key={x} position={[x, 2.6, -5.45]}>
          <boxGeometry args={[0.035, 4.6, 0.02]} />
          <meshBasicMaterial color={GOLD_LINE} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 5.3, -5.44]}>
        <planeGeometry args={[6, 1.5]} />
        <meshBasicMaterial map={sign} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* ceiling light bar above the athlete */}
      <mesh position={[0, 6.6, 0.4]}>
        <boxGeometry args={[2.4, 0.05, 0.12]} />
        <meshBasicMaterial color="#fff2d6" toneMapped={false} />
      </mesh>

      {/* concrete pillars + racks */}
      {[-6.5, 6.5].map((x) => (
        <mesh key={x} position={[x, 4, -3]}>
          <boxGeometry args={[0.8, 8, 0.8]} />
          <meshStandardMaterial color="#141414" roughness={0.9} />
        </mesh>
      ))}
      <PowerRack x={-3.6} z={-2.8} />
      <PowerRack x={3.6} z={-2.8} />
      {/* dumbbell rack silhouette */}
      <group position={[-4.6, 0, -0.6]} rotation-y={Math.PI / 2.4}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[3, 0.06, 0.55]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[-1.3 + i * 0.32, 0.56, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 6]} />
            <meshStandardMaterial color="#0e0e0e" roughness={0.6} />
          </mesh>
        ))}
      </group>

      <LightShaft position={[0, 3.9, 0.3]} strength={lite ? 0.12 : 0.16} />
    </group>
  );
}
