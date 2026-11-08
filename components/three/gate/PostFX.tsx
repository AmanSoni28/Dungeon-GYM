"use client";

// Cinematic post-processing for the gate scene, built only from three.js' own passes (no extra deps):
//   render → light-streak smear (flight + impact) → bloom → finishing pass (shockwave refraction,
//   chromatic aberration on impact, film grain) → tone mapping / sRGB output.
// Takes over rendering (useFrame priority 1). Not mounted on low-power devices.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GATE_FACE, SMASH_T, type SmashClock } from "@/lib/gate/smash";

const FinishShader = {
  name: "GateFinishShader",
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
    uShockR: { value: 0 },
    uShockAmp: { value: 0 },
    uAberr: { value: 0 },
    uGrain: { value: 0.022 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uCenter;
    uniform float uAspect;
    uniform float uShockR;
    uniform float uShockAmp;
    uniform float uAberr;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      // shockwave: a ring of refraction racing outward from the point of impact
      vec2 d = uv - uCenter;
      d.x *= uAspect;
      float dist = length(d);
      if (uShockAmp > 0.0001) {
        float ring = 1.0 - smoothstep(0.0, 0.07, abs(dist - uShockR));
        vec2 dir = dist > 1e-4 ? d / dist : vec2(0.0);
        dir.x /= uAspect;
        uv -= dir * ring * uShockAmp;
      }
      // chromatic aberration, strongest toward the frame edges
      vec2 off = (uv - 0.5) * uAberr;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      // fine animated film grain, scaled with brightness so blacks stay deep
      float n = hash(vUv * vec2(1931.0, 1093.0) + fract(uTime * 7.0) * 113.0) - 0.5;
      col += n * uGrain * (0.12 + col);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

const smooth = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};

export function PostFX({ clock }: { clock: React.MutableRefObject<SmashClock> }) {
  const { gl, scene, camera, size } = useThree();

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const smear = new AfterimagePass(0);
    composer.addPass(smear);
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.0, 0.6, 0.7);
    composer.addPass(bloom);
    const finish = new ShaderPass(FinishShader);
    composer.addPass(finish);
    composer.addPass(new OutputPass());
    return { composer, smear, bloom, finish, v: new THREE.Vector3() };
  }, [gl, scene, camera]);

  useEffect(() => {
    fx.composer.setPixelRatio(gl.getPixelRatio());
    fx.composer.setSize(size.width, size.height);
    fx.bloom.resolution.set(size.width, size.height);
  }, [fx, gl, size]);

  useEffect(() => () => fx.composer.dispose(), [fx]);

  useFrame((state, dt) => {
    const c = clock.current;
    const t = c.t;
    const u = fx.finish.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uAspect.value = size.width / Math.max(1, size.height);

    // impact point on screen
    fx.v.set(GATE_FACE.x, GATE_FACE.y, GATE_FACE.z).project(camera);
    u.uCenter.value.set(fx.v.x * 0.5 + 0.5, fx.v.y * 0.5 + 0.5);

    const since = t >= SMASH_T.impact ? t - SMASH_T.impact : -1;
    // shockwave ripple over ~0.6 s of sequence time
    if (since >= 0 && since < 0.6) {
      u.uShockR.value = 0.03 + since * 1.6;
      u.uShockAmp.value = 0.03 * (1 - since / 0.6);
    } else {
      u.uShockAmp.value = 0;
    }
    u.uAberr.value = 0.002 + c.trauma * c.trauma * 0.014;

    // light-streak smear while the dumbbell flies and the sparks burst, then off
    const flying = t >= SMASH_T.throw && t < SMASH_T.impact;
    const tail = since >= 0 ? 1 - smooth((since - 0.35) / 0.5) : 0;
    fx.smear.damp = flying ? 0.78 : 0.84 * tail;

    // bloom swells with the flash and as the golden light floods out
    const flash = since >= 0 ? Math.exp(-since * 5) : 0;
    fx.bloom.strength = 1.0 + flash * 1.0;

    fx.composer.render(dt);
  }, 1);

  return null;
}
