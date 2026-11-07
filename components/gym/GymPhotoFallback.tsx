"use client";

import { useEffect, useRef } from "react";
import type { GymView } from "@/lib/gym/look";
import { journeyPhases, journeyVisuals } from "@/lib/gym/journey";
import type { GymLookState } from "@/lib/gym/state";

/** How far (as a fraction of the frame) the wider-than-frame photo can pan each way. */
const MAX_SHIFT = 0.12;
/** radians of drag that correspond to a full pan to one side */
const DRAG_RANGE = 0.45;

/** Pan offset (fraction of width) for scroll progress + drag. Exported for tests. */
export function fallbackShift(progress: number, dragYaw: number) {
  const { explore } = journeyPhases(progress);
  const sweep = MAX_SHIFT * 0.85 * (1 - 2 * explore); // left → right while scrolling
  const drag = (dragYaw / DRAG_RANGE) * MAX_SHIFT;
  return Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, sweep + drag));
}

/**
 * Non-WebGL version: the same real photo, slightly wider than the frame, panned by scroll and drag.
 * Used when WebGL is unavailable.
 */
export function GymPhotoFallback({
  view,
  look,
  onLook,
}: {
  view: GymView;
  look: React.MutableRefObject<GymLookState>;
  onLook: (position: number, explored: number) => void;
}) {
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    let seenMin = 1;
    let seenMax = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = look.current;
      const shift = fallbackShift(s.progress, s.dragYaw);
      // write back the clamped drag so it never builds up past the edges
      const { explore } = journeyPhases(s.progress);
      const sweep = MAX_SHIFT * 0.85 * (1 - 2 * explore);
      s.dragYaw = ((shift - sweep) / MAX_SHIFT) * DRAG_RANGE;
      const vis = journeyVisuals(s.progress);
      if (img.current) {
        img.current.style.transform = `translate3d(${(shift * 100).toFixed(3)}%,0,0) scale(${(1.3 / vis.fovScale).toFixed(4)})`;
      }
      const pos = 0.5 - shift / (2 * MAX_SHIFT);
      seenMin = Math.min(seenMin, pos);
      seenMax = Math.max(seenMax, pos);
      onLook(pos, Math.max(0, seenMax - seenMin));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [look, onLook]);

  return (
    <div className="gymfb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={view.src} alt={`${view.label}, Dungeon Gym`} draggable={false} />
    </div>
  );
}
