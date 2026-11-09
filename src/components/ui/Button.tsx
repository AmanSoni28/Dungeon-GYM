"use client";

import { Magnetic } from "./Magnetic";
import { scrollToTarget } from "@/lib/utils";

type Props = {
  label: string;
  href?: string;
  variant?: "gold" | "ghost";
  onClick?: () => void;
  arrow?: boolean;
  type?: "button" | "submit";
  magnetic?: boolean;
};

export function Arrow() {
  return (
    <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Button({ label, href, variant = "gold", onClick, arrow = true, type = "button", magnetic = true }: Props) {
  const inner = (
    <>
      <span className="btn__roll">
        <span>{label}</span>
      </span>
      {arrow && <Arrow />}
    </>
  );
  const cls = `btn btn--${variant}`;

  let el: React.ReactNode;
  if (href) {
    const internal = href.startsWith("#");
    el = (
      <a
        className={cls}
        href={href}
        data-cursor=""
        target={internal ? undefined : "_blank"}
        rel={internal ? undefined : "noreferrer"}
        onClick={(e) => {
          if (internal) {
            e.preventDefault();
            scrollToTarget(href);
          }
          onClick?.();
        }}
      >
        {inner}
      </a>
    );
  } else {
    el = (
      <button className={cls} type={type} onClick={onClick} data-cursor="">
        {inner}
      </button>
    );
  }
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
