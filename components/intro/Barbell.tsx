"use client";

import { forwardRef } from "react";
import * as THREE from "three";

const CHROME = { color: "#d8d4cc", metalness: 1, roughness: 0.2 };
const RUBBER = { color: "#0d0d0d", metalness: 0.15, roughness: 0.55 };
const GOLD = { color: "#D4AF37", metalness: 1, roughness: 0.25, emissive: "#3b2c08", emissiveIntensity: 0.4 };

/** Olympic barbell: 2.2 m bar, 45 cm bumper plates. Long axis = local X. */
export const Barbell = forwardRef<THREE.Group, { shadows: boolean }>(function Barbell({ shadows }, ref) {
  return (
    <group ref={ref}>
      <mesh rotation-z={Math.PI / 2} castShadow={shadows}>
        <cylinderGeometry args={[0.014, 0.014, 2.2, 16]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* sleeve */}
          <mesh position={[s * 0.88, 0, 0]} rotation-z={Math.PI / 2} castShadow={shadows}>
            <cylinderGeometry args={[0.025, 0.025, 0.42, 20]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* collar */}
          <mesh position={[s * 0.66, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 20]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* two bumper plates per side */}
          {[0.71, 0.775].map((x) => (
            <group key={x} position={[s * x, 0, 0]}>
              <mesh rotation-z={Math.PI / 2} castShadow={shadows}>
                <cylinderGeometry args={[0.225, 0.225, 0.058, 48]} />
                <meshStandardMaterial {...RUBBER} />
              </mesh>
              <mesh rotation-y={Math.PI / 2} position={[s * 0.03, 0, 0]}>
                <torusGeometry args={[0.17, 0.006, 8, 64]} />
                <meshStandardMaterial {...GOLD} />
              </mesh>
              <mesh rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.06, 0.06, 0.062, 24]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
});
