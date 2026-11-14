"use client";

// The machine that hauls the Group Classes rope: a geared gold-and-iron winch, seen side-on. Static art; the
// section's frame loop turns the drum, winds up the coil and works the ratchet pawl via `applyWinch`.
// The page's rope comes off the top of the coil (it is drawn underneath, so it emerges from behind the rim).

import { memo } from "react";
import { WINCH } from "@/lib/classes/ropePull";

const { cx, cy } = WINCH;
const RIM = 100;
const HUB = 24;

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
};

/** ratchet teeth round the flange: steep face leading as the drum turns counter-clockwise */
const TEETH = Array.from({ length: WINCH.teeth }, (_, i) => {
  const step = 360 / WINCH.teeth;
  const a = i * step;
  return `M${polar(RIM + 3, a)} L${polar(RIM + 10, a)} L${polar(RIM + 3, a + step * 0.92)}Z`;
}).join("");

const SPOKES = Array.from({ length: 6 }, (_, i) => i * 60);
const BOLTS = Array.from({ length: 6 }, (_, i) => i * 60 + 30);

export const RopeWinch = memo(function RopeWinch() {
  return (
    <svg viewBox={`0 0 ${WINCH.w} ${WINCH.h}`} focusable="false" className="rope-winch">
      <defs>
        <linearGradient id="gw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc8c" />
          <stop offset=".28" stopColor="#d4af37" />
          <stop offset=".55" stopColor="#7d5f1f" />
          <stop offset=".78" stopColor="#c9a24a" />
          <stop offset="1" stopColor="#4f3a10" />
        </linearGradient>
        <linearGradient id="gw-goldV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d585" />
          <stop offset=".5" stopColor="#a98235" />
          <stop offset="1" stopColor="#4f3a10" />
        </linearGradient>
        <radialGradient id="gw-iron" cx=".38" cy=".32" r=".8">
          <stop offset="0" stopColor="#3a352d" />
          <stop offset=".6" stopColor="#1b1915" />
          <stop offset="1" stopColor="#0c0b09" />
        </radialGradient>
        <linearGradient id="gw-ironBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f0e0c" />
          <stop offset=".45" stopColor="#2f2b25" />
          <stop offset=".6" stopColor="#3d372e" />
          <stop offset="1" stopColor="#100f0d" />
        </linearGradient>
        <radialGradient id="gw-hub" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset=".35" stopColor="#d4af37" />
          <stop offset="1" stopColor="#5e4512" />
        </radialGradient>
        <filter id="gw-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="gw-shadow" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx={cx} cy={292} rx={108} ry={9} fill="#000" opacity=".7" filter="url(#gw-shadow)" />

      {/* A-frame stand and bolted base plate */}
      <path d="M110 110 L130 126 L60 288 L30 288Z" fill="url(#gw-ironBar)" stroke="#000" strokeOpacity=".6" />
      <path d="M130 110 L110 126 L180 288 L210 288Z" fill="url(#gw-ironBar)" stroke="#000" strokeOpacity=".6" />
      <rect x="12" y="282" width="216" height="13" rx="3" fill="url(#gw-iron)" stroke="#000" strokeOpacity=".7" />
      <rect x="12" y="282" width="216" height="2" rx="1" fill="url(#gw-gold)" opacity=".8" />
      {[28, 212].map((x) => (
        <circle key={x} cx={x} cy={289} r={3.2} fill="url(#gw-hub)" />
      ))}

      {/* back flange */}
      <circle cx={cx} cy={cy} r={RIM + 2} fill="#0d0c0a" stroke="#000" strokeWidth={2} />

      {/* everything that turns with the drum */}
      <g data-spin="">
        {/* rope wound on the drum: a core and three rows of strands (radii set live as the coil grows) */}
        <circle data-coil="core" cx={cx} cy={cy} r={50} fill="none" stroke="#3a2a16" />
        <circle data-coil="a" cx={cx} cy={cy} r={40} fill="none" stroke="#c99f5e" strokeDasharray="5 4" />
        <circle data-coil="b" cx={cx} cy={cy} r={50} fill="none" stroke="#a37b45" strokeDasharray="5 4" strokeDashoffset="2.5" />
        <circle data-coil="c" cx={cx} cy={cy} r={60} fill="none" stroke="#6f5029" strokeDasharray="5 4" />

        {/* near flange: geared gold rim, iron spokes, gold hub */}
        <path d={TEETH} fill="url(#gw-goldV)" stroke="#2a1e08" strokeWidth={0.6} />
        <circle cx={cx} cy={cy} r={RIM - 1} fill="none" stroke="url(#gw-gold)" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={RIM - 6} fill="none" stroke="#000" strokeOpacity=".55" strokeWidth={1.4} />
        <circle cx={cx} cy={cy} r={RIM + 4} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth={1} />
        {SPOKES.map((a) => (
          <g key={a} transform={`rotate(${a} ${cx} ${cy})`}>
            <rect x={cx - 6} y={cy - RIM + 4} width={12} height={RIM - HUB - 2} rx={3} fill="url(#gw-ironBar)" stroke="#000" strokeOpacity=".7" />
            <rect x={cx + 2} y={cy - RIM + 8} width={2} height={RIM - HUB - 10} rx={1} fill="#d4af37" opacity=".55" />
          </g>
        ))}
        <circle cx={cx} cy={cy} r={HUB} fill="url(#gw-hub)" stroke="#2a1e08" strokeWidth={1.2} />
        <circle cx={cx} cy={cy} r={HUB - 6} fill="none" stroke="#5e4512" strokeWidth={1} opacity=".8" />
        {BOLTS.map((a) => {
          const [bx, by] = polar(15, a).split(" ").map(Number);
          return (
            <g key={a}>
              <circle cx={bx} cy={by} r={3} fill="#1a1712" />
              <circle cx={bx - 0.8} cy={by - 0.8} r={1.1} fill="#fff1c4" opacity=".7" />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={6} fill="url(#gw-iron)" stroke="#000" />
      </g>

      {/* fixed highlights: the light stays put while the metal turns under it, which is what reads as metal */}
      <path d={`M${polar(RIM - 1, -78)} A${RIM - 1} ${RIM - 1} 0 0 1 ${polar(RIM - 1, -22)}`} fill="none" stroke="#fff6da" strokeWidth={3.2} opacity=".6" filter="url(#gw-soft)" />
      <path d={`M${polar(RIM - 1, 150)} A${RIM - 1} ${RIM - 1} 0 0 1 ${polar(RIM - 1, 205)}`} fill="none" stroke="#fff6da" strokeWidth={2} opacity=".22" filter="url(#gw-soft)" />
      <ellipse cx={cx - 7} cy={cy - 9} rx={9} ry={5} fill="#fff8e0" opacity=".45" filter="url(#gw-soft)" />

      {/* ratchet pawl on a bracket bolted to the right leg: lifts over each tooth, then drops (the click) */}
      <path d="M182 238 L200 226 L204 234 L188 246Z" fill="url(#gw-ironBar)" stroke="#000" strokeOpacity=".7" />
      <g data-pawl="">
        <path d="M197 233 L203 230 L210 196 L205 192Z" fill="url(#gw-gold)" stroke="#2a1e08" strokeWidth={0.8} />
      </g>
      <circle cx={200} cy={232} r={4.2} fill="url(#gw-hub)" stroke="#2a1e08" strokeWidth={0.8} />
    </svg>
  );
});

export type WinchParts = { spin: SVGGElement; pawl: SVGGElement; coil: Record<"core" | "a" | "b" | "c", SVGCircleElement>; last: string };

export function winchParts(root: HTMLElement): WinchParts | null {
  const spin = root.querySelector<SVGGElement>("[data-spin]");
  const pawl = root.querySelector<SVGGElement>("[data-pawl]");
  const c = (k: string) => root.querySelector<SVGCircleElement>(`[data-coil="${k}"]`);
  const core = c("core");
  const a = c("a");
  const b = c("b");
  const cc = c("c");
  if (!spin || !pawl || !core || !a || !b || !cc) return null;
  return { spin, pawl, coil: { core, a, b, c: cc }, last: "" };
}

/** Turn the drum (counter-clockwise: the rope comes in over the top), size the coil and lift the pawl. */
export function applyWinch(w: WinchParts, angle: number, coil: number, pawl: number) {
  w.spin.setAttribute("transform", `rotate(${(-angle).toFixed(2)} ${cx} ${cy})`);
  w.pawl.setAttribute("transform", `rotate(${(9 * pawl).toFixed(2)} 200 232)`);
  const key = coil.toFixed(1);
  if (key === w.last) return;
  w.last = key;
  const t = coil - HUB; // coil thickness
  w.coil.core.setAttribute("r", (HUB + t / 2).toFixed(2));
  w.coil.core.setAttribute("stroke-width", t.toFixed(2));
  (["a", "b", "c"] as const).forEach((k, i) => {
    w.coil[k].setAttribute("r", (HUB + t * (0.2 + 0.3 * i) + 1).toFixed(2));
    w.coil[k].setAttribute("stroke-width", (t * 0.24).toFixed(2));
  });
}
