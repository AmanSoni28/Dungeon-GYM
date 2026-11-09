"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { rand } from "@/lib/utils";

export type DustHandle = { burst: (x: number, z: number, strength: number) => void };

const vert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // particles grow as they age, like a dust cloud expanding
    gl_PointSize = aSize * (1.0 + (1.0 - aLife) * 2.2) * (320.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    float fade = smoothstep(0.0, 0.25, vLife) * vLife;
    gl_FragColor = vec4(uColor, a * fade * 0.55);
    if (gl_FragColor.a < 0.003) discard;
  }
`;

/** Pooled particle system for the impact dust cloud (CPU sim, GPU-rendered soft points). */
export const Dust = forwardRef<DustHandle, { count: number }>(function Dust({ count }, ref) {
  const points = useRef<THREE.Points>(null);
  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3).fill(-999);
    return {
      pos,
      vel: new Float32Array(count * 3),
      life: new Float32Array(count),
      decay: new Float32Array(count),
      size: Float32Array.from({ length: count }, (_, i) => 0.05 + rand(i + 7) * 0.09),
      cursor: 0,
    };
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uColor: { value: new THREE.Color("#8f8170") } },
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useImperativeHandle(ref, () => ({
    burst(x, z, strength) {
      const n = Math.floor(count * Math.min(1, 0.35 + strength * 0.65));
      for (let k = 0; k < n; k++) {
        const i = sim.cursor;
        sim.cursor = (sim.cursor + 1) % count;
        const a = Math.random() * Math.PI * 2;
        const sp = (0.6 + Math.random() * 3.2) * (0.5 + strength * 0.6);
        sim.pos[i * 3] = x + Math.cos(a) * 0.25 * Math.random() * 3;
        sim.pos[i * 3 + 1] = 0.03 + Math.random() * 0.12;
        sim.pos[i * 3 + 2] = z + Math.sin(a) * 0.12 * Math.random() * 3;
        sim.vel[i * 3] = Math.cos(a) * sp;
        sim.vel[i * 3 + 1] = 0.2 + Math.random() * 1.3 * strength;
        sim.vel[i * 3 + 2] = Math.sin(a) * sp * 0.7;
        sim.life[i] = 1;
        sim.decay[i] = 1 / (1.4 + Math.random() * 2.2);
      }
    },
  }));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const geo = points.current?.geometry;
    if (!geo) return;
    const drag = Math.exp(-2.6 * dt);
    for (let i = 0; i < count; i++) {
      if (sim.life[i] <= 0) continue;
      sim.vel[i * 3] *= drag;
      sim.vel[i * 3 + 1] = sim.vel[i * 3 + 1] * drag - 0.25 * dt;
      sim.vel[i * 3 + 2] *= drag;
      sim.pos[i * 3] += sim.vel[i * 3] * dt;
      sim.pos[i * 3 + 1] = Math.max(0.02, sim.pos[i * 3 + 1] + sim.vel[i * 3 + 1] * dt);
      sim.pos[i * 3 + 2] += sim.vel[i * 3 + 2] * dt;
      sim.life[i] = Math.max(0, sim.life[i] - sim.decay[i] * dt);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aLife.needsUpdate = true;
  });

  return (
    <points ref={points} material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} />
        <bufferAttribute attach="attributes-aLife" args={[sim.life, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sim.size, 1]} />
      </bufferGeometry>
    </points>
  );
});

/** Slow floating motes inside the light beam */
export function Motes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (rand(i) - 0.5) * 4;
      a[i * 3 + 1] = rand(i + 99) * 4.5;
      a[i * 3 + 2] = (rand(i + 199) - 0.5) * 4;
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.08;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#f3dfb0" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
