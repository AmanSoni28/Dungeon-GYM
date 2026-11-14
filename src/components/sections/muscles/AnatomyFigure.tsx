"use client";

import { memo, useId } from "react";
import type { MuscleId } from "@/data/site";
import { DETAILS, PARTS, SILHOUETTE, VIEWBOX, type View } from "@/lib/muscles/anatomy";

const GROUPS: MuscleId[] = ["chest", "shoulders", "arms", "core", "legs", "back"];
const MIRROR = `matrix(-1 0 0 1 ${VIEWBOX.w} 0)`;

/** Draw a half-figure path on both sides of the centre line. */
function Both({ d, ...rest }: { d: string } & React.SVGProps<SVGPathElement>) {
  return (
    <>
      <path d={d} {...rest} />
      <path d={d} transform={MIRROR} {...rest} />
    </>
  );
}

type Props = { view: View; active: MuscleId; hover: MuscleId | null };

/**
 * One face (front or back) of the anatomical athlete.
 * Layers: gold rim glow → sculpted body (specular-lit, skin grain) → gold highlight of the
 * active group → hover sheen → cinematic key/fill lighting and head/feet falloff.
 */
function AnatomyFigureImpl({ view, active, hover }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${name}-${view}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;
  const parts = PARTS[view];
  const tones = { hair: "#120a06", shadow: "#1d100a", plane: "#8a5a3a" } as const;

  return (
    <svg
      className="af"
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Anatomical athlete, ${view} view`}
    >
      <defs>
        <radialGradient id={id("muscle")} cx="38%" cy="28%" r="82%">
          <stop offset="0" stopColor="#c08b5f" />
          <stop offset="0.5" stopColor="#7f4d2f" />
          <stop offset="1" stopColor="#371e13" />
        </radialGradient>
        <radialGradient id={id("gold")} cx="38%" cy="28%" r="85%">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.4" stopColor="#e3bd52" />
          <stop offset="1" stopColor="#7a5418" />
        </radialGradient>
        <linearGradient id={id("skin")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2216" />
          <stop offset="1" stopColor="#1a0f09" />
        </linearGradient>
        {/* Key light from upper-left, falling into shadow on the right. */}
        <linearGradient id={id("key")} x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.1" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        {/* Head and feet fall off into darkness: a lit torso, like a studio shot. */}
        <linearGradient id={id("falloff")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="0.15" stopColor="#000" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.88" />
        </linearGradient>
        <clipPath id={id("clip")}>
          <Both d={SILHOUETTE} />
        </clipPath>
        <filter id={id("sculpt")} x="-10%" y="-5%" width="120%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="bump" />
          <feSpecularLighting in="bump" surfaceScale="5" specularConstant="1" specularExponent="26" lightingColor="#ffdcae" result="spec">
            <feDistantLight azimuth="235" elevation="40" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 0.42" result="grain" />
          <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainIn" />
          <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k2="1" k3="0.5" result="lit" />
          <feBlend in="grainIn" in2="lit" mode="multiply" />
        </filter>
        <filter id={id("blur")} x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={id("glow")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* golden rim light around the body */}
      <g className="af__rim" filter={url("blur")}>
        <Both d={SILHOUETTE} fill="#d4af37" />
      </g>

      {/* the sculpted body */}
      <g filter={url("sculpt")}>
        <Both d={SILHOUETTE} fill={url("skin")} />
        {DETAILS[view].map((p) => (
          <Both key={p.id} d={p.d} fill={tones[p.tone]} opacity={p.tone === "plane" ? 0.55 : 0.8} />
        ))}
        {parts.map((p) => (
          <Both key={p.id} d={p.d} fill={url("muscle")} data-group={p.group ?? undefined} className={p.group ? "af__m" : undefined} />
        ))}
      </g>

      {/* gold highlight per group, cross-faded by CSS */}
      {GROUPS.map((g) => {
        const gp = parts.filter((p) => p.group === g);
        if (!gp.length) return null;
        return (
          <g key={g} className={`af__hl${g === active ? " is-on" : ""}${g === hover && g !== active ? " is-hover" : ""}`}>
            <g className="af__glow" filter={url("glow")}>
              {gp.map((p) => (
                <Both key={p.id} d={p.d} fill="#d4af37" />
              ))}
            </g>
            <g className="af__gild">
              {gp.map((p) => (
                <Both key={p.id} d={p.d} fill={url("gold")} />
              ))}
            </g>
            <g className="af__sheen">
              {gp.map((p) => (
                <Both key={p.id} d={p.d} fill="#fff2cf" />
              ))}
            </g>
          </g>
        );
      })}

      {/* cinematic lighting */}
      <g clipPath={url("clip")} pointerEvents="none">
        <rect width={VIEWBOX.w} height={VIEWBOX.h} fill={url("key")} />
        <rect width={VIEWBOX.w} height={VIEWBOX.h} fill={url("falloff")} />
      </g>
    </svg>
  );
}

export const AnatomyFigure = memo(AnatomyFigureImpl);
