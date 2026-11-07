"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  lines: (string | { text: string; className?: string })[];
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/** Heading whose words rise out of a mask when scrolled into view. */
export function SplitHeading({ lines, as: Tag = "h2", className = "h-lg" }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll(".split-word"), {
        yPercent: 115,
        rotate: 4,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => {
        const { text, className: lc } = typeof line === "string" ? { text: line, className: "" } : line;
        return (
          <span key={i} className={`split-line ${lc ?? ""}`}>
            {text.split(" ").map((w, j) => (
              <span key={j} className="split-word">
                {w}&nbsp;
              </span>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
