"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * One scroll choreography for the content blocks that have no entrance of their own: section eyebrows slide in
 * and un-track, lead paragraphs rise out of a soft blur, and card grids deal in one after another (a short lift,
 * a tilt back to flat, a blur clearing). Each block plays once, as it comes into view. Sections that already
 * animate their content (pinned 3D scenes, ranks, split headings) are left alone.
 *
 * Everything is cleared after it plays (`clearProps`), so hover tilts and CSS transitions keep working.
 */
const EYEBROWS = ".section-head .eyebrow, .pass__copy .eyebrow, .planner__head .eyebrow";
const LEADS = ".section-head .lead, .pass__copy .lead, .billing, .countdown";
const CARDS = [
  ".tgrid > *", // coaches
  ".plans__grid > *", // membership plans
  ".live__gauge, .live__chart, .live__classes", // live status
  ".planner", // spa ritual planner
  ".tour-zones > *, .tour-door__cta", // virtual tour
  ".pass__form, .ticket__main", // free pass
  ".footer__grid > *", // footer columns
].join(", ");

const CLEAR = "transform,opacity,filter,letterSpacing,transition";

export function ScrollChoreography() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const batch = (
        selector: string,
        from: gsap.TweenVars,
        to: gsap.TweenVars,
        start = "top 88%"
      ) => {
        const els = gsap.utils.toArray<HTMLElement>(selector);
        if (!els.length) return;
        // no CSS transition may fight the tween while it plays
        gsap.set(els, { ...from, transition: "none" });
        ScrollTrigger.batch(els, {
          start,
          once: true,
          onEnter: (group) =>
            gsap.to(group, { ...to, overwrite: true, clearProps: CLEAR }),
        });
      };

      batch(
        EYEBROWS,
        { opacity: 0, x: -28, letterSpacing: "0.6em" },
        { opacity: 1, x: 0, letterSpacing: "", duration: 1.1, ease: "expo.out", stagger: 0.08 }
      );
      batch(
        LEADS,
        { opacity: 0, y: 34, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power3.out", delay: 0.15, stagger: 0.1 }
      );
      batch(
        CARDS,
        { opacity: 0, y: 70, rotateX: 10, scale: 0.95, filter: "blur(6px)", transformPerspective: 1000, transformOrigin: "50% 100%" },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)", duration: 1.25, ease: "expo.out", stagger: 0.11 },
        "top 90%"
      );

      // pinned sections above change the layout as they load: re-measure once everything has settled
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh, { once: true });
      return () => window.removeEventListener("load", refresh);
    });
    return () => mm.revert();
  }, []);

  return null;
}
