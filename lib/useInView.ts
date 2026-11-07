"use client";

import { useEffect, useRef, useState } from "react";

/** `seen` turns true once the element first gets near the viewport (used to lazy-mount 3D),
 *  `inView` tracks visibility (used to pause 3D render loops off-screen). */
export function useInView<T extends Element = HTMLDivElement>(rootMargin = "300px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView, seen };
}
