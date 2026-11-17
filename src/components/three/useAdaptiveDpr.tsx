"use client";

import { useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";

/**
 * Adaptive render quality for a <Canvas>: starts at full sharpness and only steps the pixel ratio down
 * (never below 1) when the GPU can't hold the frame rate, stepping back up when it recovers.
 * Fast machines never see a change. Put `monitor` inside the Canvas and pass `dpr` to it.
 */
export function useAdaptiveDpr(max: number) {
  const [dpr, setDpr] = useState(max);
  const monitor = (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setDpr((d) => Math.max(1, Math.round((d - 0.25) * 100) / 100))}
      onIncline={() => setDpr((d) => Math.min(max, Math.round((d + 0.25) * 100) / 100))}
      onFallback={() => setDpr(1)}
    />
  );
  return { dpr: [1, Math.min(dpr, max)] as [number, number], monitor };
}
