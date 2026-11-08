"use client";

import { brand } from "@/data/site";

/** Gold progress line driven entirely by CSS `animation-timeline: scroll()` */
export function ScrollProgress() {
  return <div className="scroll-progress" aria-hidden />;
}

export function WhatsAppButton() {
  return (
    <a
      className="wa"
      href={`https://wa.me/${brand.whatsapp}?text=${encodeURIComponent("Hi Dungeon Gym! I'd like to know more about memberships.")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      data-cursor="Chat"
    >
      <svg viewBox="0 0 32 32" aria-hidden>
        <path
          fill="currentColor"
          d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4a10.4 10.4 0 0 1-1.6-5.5C5.4 9.8 10.2 5.1 16 5.1s10.6 4.7 10.6 10.5S21.8 26.1 16 26.1zm5.8-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4c-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.7 5.8 5.1 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5c-.1-.2-.3-.2-.6-.4z"
        />
      </svg>
    </a>
  );
}

export { Marquee } from "./Marquee";
