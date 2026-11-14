"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
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
 * The rim glow and the sculpt filter (specular lighting + skin grain over the whole body) are very costly to paint:
 * ~0.5 s of GPU time each time the figure is rasterised, which froze the scroll as Programs came into view and on
 * every highlight fade. They never change, so each view is painted once, off-screen at idle, into a bitmap that
 * replaces them; highlights and lighting stay live on top. Until then (or if baking fails) the live layers render.
 */
const baked = new Map<View, Promise<string>>();
async function bake(svg: SVGSVGElement): Promise<string> {
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const h = Math.round(Math.max(700, svg.getBoundingClientRect().height) * scale);
  const w = Math.round((h * VIEWBOX.w) / VIEWBOX.h);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-live]").forEach((e) => e.remove());
  clone.querySelector("[mask]")?.removeAttribute("mask"); // the neck fade is applied once, live, over the bitmap
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  await img.decode();
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("no 2d canvas");
  g.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.92));
  if (!blob) throw new Error("toBlob failed");
  return URL.createObjectURL(blob);
}

function useBakedBody(view: View) {
  const ref = useRef<SVGSVGElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof HTMLCanvasElement === "undefined" || typeof XMLSerializer === "undefined") return;
    let live = true;
    const run = () => {
      let job = baked.get(view);
      if (!job) {
        job = bake(svg);
        baked.set(view, job);
        job.catch(() => baked.delete(view));
      }
      job.then((u) => live && setUrl(u)).catch(() => {}); // keep the live layers
    };
    const ric = typeof window.requestIdleCallback === "function";
    const handle = ric ? window.requestIdleCallback(run, { timeout: 3000 }) : window.setTimeout(run, 500);
    return () => {
      live = false;
      if (ric) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [view]);
  return { ref, url };
}

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
  const { ref, url: body } = useBakedBody(view);

  return (
    <svg
      ref={ref}
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
        {/* Headless: the neck dissolves into darkness above the traps (jaw ends ~y152). */}
        <linearGradient id={id("neckFade")} gradientUnits="userSpaceOnUse" x1="0" y1="138" x2="0" y2="176">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={id("headless")} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX.w} height={VIEWBOX.h}>
          <rect width={VIEWBOX.w} height={VIEWBOX.h} fill={url("neckFade")} />
        </mask>
      </defs>

      <g mask={url("headless")}>

      {body ? (
        <>
          <image href={body} width={VIEWBOX.w} height={VIEWBOX.h} preserveAspectRatio="none" />
          {/* invisible hit areas: hover / tap a muscle */}
          {parts.map((p) => p.group && <Both key={p.id} d={p.d} fill="transparent" data-group={p.group} className="af__m" />)}
        </>
      ) : (
        <>
          {/* golden rim light around the body */}
          <g className="af__rim" opacity={0.32} filter={url("blur")}>
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
        </>
      )}

      {/* gold highlight per group, cross-faded by CSS */}
      {GROUPS.map((g) => {
        const gp = parts.filter((p) => p.group === g);
        if (!gp.length) return null;
        return (
          <g key={g} data-live="" className={`af__hl${g === active ? " is-on" : ""}${g === hover && g !== active ? " is-hover" : ""}`}>
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
      <g data-live="" clipPath={url("clip")} pointerEvents="none">
        <rect width={VIEWBOX.w} height={VIEWBOX.h} fill={url("key")} />
        <rect width={VIEWBOX.w} height={VIEWBOX.h} fill={url("falloff")} />
      </g>
      </g>
    </svg>
  );
}

export const AnatomyFigure = memo(AnatomyFigureImpl);
