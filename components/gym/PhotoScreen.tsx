"use client";

// Shared 3D pieces for showing real gym photos: used by the entrance (GymViewer) and the virtual tour.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEG, SCREEN_RADIUS, type GymView } from "@/lib/gym/look";
import { rand } from "@/lib/utils";

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
  uniform float uEdge;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
    vec3 c = texture2D(uMap, uv).rgb;
    // grade: a touch more contrast and depth, original colours preserved
    c = (c - 0.5) * 1.08 + 0.5;
    c *= vec3(1.02, 1.0, 0.97);
    float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x)
               * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
    c = mix(vec3(0.02), c, mix(1.0, edge, uEdge)) * uBrightness;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Colour space + filtering for a photo texture. */
export function preparePhotoTexture(tex: THREE.Texture, gl: THREE.WebGLRenderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
}

/**
 * The real photo on a curved screen covering exactly the lens's field of view (photo),
 * or the inside of a sphere (true 360° panorama).
 */
export function PhotoScreen({
  view,
  texture,
  brightness,
}: {
  view: GymView;
  texture: THREE.Texture;
  brightness: React.MutableRefObject<number>;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uMap: { value: texture },
          uBrightness: { value: 1 },
          uFlip: { value: 1 },
          uEdge: { value: view.kind === "equirect" ? 0 : 1 },
        },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [texture, view.kind]
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.uniforms.uBrightness.value = brightness.current;
  });

  if (view.kind === "equirect") {
    return (
      <mesh material={material}>
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

/** Floating golden dust between the camera and the photo: real depth cues without inventing scenery. */
export function Dust({ count }: { count: number }) {
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
