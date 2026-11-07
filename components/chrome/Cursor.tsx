"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { isTouch } from "@/lib/utils";

/** Ember cursor (gym) that becomes a water droplet in spa mode. Grows + shows labels over [data-cursor]. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"idle" | "hover" | "label">("idle");

  useEffect(() => {
    if (isTouch()) return;
    document.documentElement.classList.add("has-cursor");
    const d = dot.current!;
    const r = ring.current!;
    gsap.set([d, r], { xPercent: -50, yPercent: -50 });
    const xD = gsap.quickTo(d, "x", { duration: 0.1, ease: "power3" });
    const yD = gsap.quickTo(d, "y", { duration: 0.1, ease: "power3" });
    const xR = gsap.quickTo(r, "x", { duration: 0.5, ease: "power3" });
    const yR = gsap.quickTo(r, "y", { duration: 0.5, ease: "power3" });

    const move = (e: PointerEvent) => {
      xD(e.clientX);
      yD(e.clientY);
      xR(e.clientX);
      yR(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as Element)?.closest?.("[data-cursor]");
      if (!t) {
        setState("idle");
        return;
      }
      const text = t.getAttribute("data-cursor") || "";
      setLabel(text);
      setState(text ? "label" : "hover");
    };
    const down = () => r.classList.add("is-down");
    const up = () => r.classList.remove("is-down");
    const leaveWin = () => gsap.to([d, r], { opacity: 0, duration: 0.3 });
    const enterWin = () => gsap.to([d, r], { opacity: 1, duration: 0.3 });

    window.addEventListener("pointermove", move);
    document.addEventListener("pointerover", over);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leaveWin);
    document.documentElement.addEventListener("pointerenter", enterWin);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leaveWin);
      document.documentElement.removeEventListener("pointerenter", enterWin);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className={`cursor-ring is-${state}`} aria-hidden>
        <span className="cursor-ring__label">{label}</span>
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
