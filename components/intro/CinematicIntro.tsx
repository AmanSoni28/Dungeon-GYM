"use client";

import "./intro.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useApp } from "@/components/providers/AppProvider";
import { FEATURES } from "@/config/features";
import { chooseIntroMode, readEnvironment, type IntroMode } from "@/lib/intro/capabilities";
import { createAudioController, type AudioController } from "@/lib/intro/impactSound";
import { initialIntroState, introReducer } from "@/lib/intro/machine";
import { IntroFallback } from "./IntroFallback";

const IntroScene = dynamic(() => import("./IntroScene"), { ssr: false, loading: () => null });

export type IntroTimings = {
  /** exit transition after the impact (s) */
  leave: number;
  /** exit transition when skipped (s) */
  skip: number;
  /** safety net: force the exit if the scene never reports it settled (s) */
  watchdog: number;
};
const DEFAULT_TIMINGS: IntroTimings = { leave: 1.35, skip: 0.6, watchdog: 12 };

export type IntroExperienceProps = {
  /** true once the preloader has opened */
  start: boolean;
  /** homepage should start revealing (called once) */
  onReveal: () => void;
  /** overlay has fully finished (called once) */
  onDone: () => void;
  forceMode?: IntroMode;
  audio?: AudioController;
  timings?: Partial<IntroTimings>;
};

/** Cinematic entrance: athlete throws a barbell, impact, then a camera dive into the homepage. */
export function IntroExperience({ start, onReveal, onDone, forceMode, audio, timings }: IntroExperienceProps) {
  const t = { ...DEFAULT_TIMINGS, ...timings };
  const [mode, setMode] = useState<IntroMode | null>(forceMode ?? null);
  const [state, dispatch] = useReducer(introReducer, initialIntroState);
  const [soundOn, setSoundOn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioController | null>(audio ?? null);
  const soundRef = useRef(false);
  const once = useRef({ reveal: false, done: false });

  const reveal = useCallback(() => {
    if (once.current.reveal) return;
    once.current.reveal = true;
    onReveal();
  }, [onReveal]);

  // detect device capabilities on the client
  useEffect(() => {
    if (!forceMode) setMode(chooseIntroMode(readEnvironment()));
  }, [forceMode]);

  // lazily create the audio controller; release it on unmount
  useEffect(() => {
    if (!audioRef.current) audioRef.current = createAudioController();
    return () => audioRef.current?.dispose();
  }, []);

  // start (or bypass entirely for reduced motion)
  useEffect(() => {
    if (!start || mode === null) return;
    if (mode === "none") {
      reveal();
      dispatch({ type: "FINISH" });
    } else {
      dispatch({ type: "START" });
    }
  }, [start, mode, reveal]);

  // cinematic chrome: letterbox bars + captions (runs once, when the sequence starts)
  const started = state.phase !== "waiting";
  useEffect(() => {
    if (!started || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(".intro__bar", { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: "power3.inOut" })
        .fromTo(".intro__brand", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1 }, 0.4)
        .fromTo(".intro__cap--a", { opacity: 0, y: 14, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.5)
        .to(".intro__cap--a", { opacity: 0, y: -10, filter: "blur(6px)", duration: 0.6 }, 1.7)
        .fromTo(".intro__cap--b", { opacity: 0, y: 14, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 2.0)
        .to(".intro__cap--b", { opacity: 0, filter: "blur(6px)", duration: 0.5 }, 3.3);
    }, root);
    return () => ctx.revert();
  }, [started]);

  // watchdog: never trap the visitor in the intro
  useEffect(() => {
    if (state.phase !== "playing" && state.phase !== "impact") return;
    const id = setTimeout(() => dispatch({ type: "LEAVE" }), t.watchdog * 1000);
    return () => clearTimeout(id);
  }, [state.phase, t.watchdog]);

  // exit: zoom + blur + fade into the homepage
  useEffect(() => {
    if (state.phase !== "leaving" || !root.current) return;
    const d = state.skipped ? t.skip : t.leave;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => dispatch({ type: "DONE" }) });
      tl.to(".intro__stage", { scale: 1.16, filter: "blur(18px) brightness(1.4)", duration: d, ease: "power2.in" }, 0)
        .to(".intro__ui", { opacity: 0, duration: d * 0.4 }, 0)
        .to(".intro__bar--top", { yPercent: -100, duration: d * 0.7, ease: "power3.inOut" }, d * 0.25)
        .to(".intro__bar--bottom", { yPercent: 100, duration: d * 0.7, ease: "power3.inOut" }, d * 0.25)
        .add(reveal, d * 0.35)
        .to(root.current, { opacity: 0, duration: d * 0.6, ease: "power1.inOut" }, d * 0.4);
    }, root);
    return () => ctx.revert();
  }, [state.phase, state.skipped, t.leave, t.skip, reveal]);

  // finished
  useEffect(() => {
    if (state.phase !== "done" || once.current.done) return;
    once.current.done = true;
    reveal();
    onDone();
  }, [state.phase, reveal, onDone]);

  // keyboard: Esc skips
  useEffect(() => {
    if (state.phase === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "SKIP" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase]);

  const handleImpact = useCallback((speed: number) => {
    dispatch({ type: "IMPACT" });
    const k = Math.min(1, speed / 5.5);
    if (soundRef.current) audioRef.current?.playImpact(k);
    const el = root.current;
    if (!el) return;
    gsap.fromTo(el.querySelector(".intro__flash"), { opacity: 0.85 * k }, { opacity: 0, duration: 0.7, ease: "power2.out" });
    if (k > 0.6) {
      gsap.fromTo(
        el.querySelector(".intro__title"),
        { opacity: 0, scale: 1.25, letterSpacing: "0.5em", filter: "blur(12px)" },
        { opacity: 1, scale: 1, letterSpacing: "0.12em", filter: "blur(0px)", duration: 1.1, ease: "expo.out" }
      );
    }
  }, []);

  const handleSettled = useCallback(() => dispatch({ type: "LEAVE" }), []);

  const toggleSound = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) {
      a.disable();
      soundRef.current = false;
      setSoundOn(false);
    } else if (await a.enable()) {
      soundRef.current = true;
      setSoundOn(true);
    }
  };

  if (state.phase === "done" || mode === "none") return null;

  const playing = started;
  const leaving = state.phase === "leaving";

  return (
    <div ref={root} className="intro" data-phase={state.phase} data-mode={mode ?? "pending"}>
      <div className="intro__stage" aria-hidden>
        {mode === "full" || mode === "lite" ? (
          <IntroScene lite={mode === "lite"} playing={playing} leaving={leaving} onImpact={handleImpact} onSettled={handleSettled} />
        ) : mode === "fallback" ? (
          <IntroFallback playing={playing} onImpact={handleImpact} onSettled={handleSettled} />
        ) : null}
        <div className="intro__vignette" />
      </div>

      <div className="intro__flash" aria-hidden />
      <div className="intro__bar intro__bar--top" aria-hidden />
      <div className="intro__bar intro__bar--bottom" aria-hidden />

      <div className="intro__ui">
        <div className="intro__brand">
          <span>Dungeon</span> Gym &amp; Spa
          <small>Underground Strength Club</small>
        </div>
        <p className="intro__cap intro__cap--a">Beneath the city…</p>
        <p className="intro__cap intro__cap--b">…legends are forged in iron.</p>
        <h2 className="intro__title">Welcome to the Dungeon</h2>

        <div className="intro__controls">
          <button
            type="button"
            className="intro__btn intro__sound"
            aria-pressed={soundOn}
            onClick={toggleSound}
            data-cursor=""
          >
            <span className="intro__eq" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {soundOn ? "Sound on" : "Sound off"}
          </button>
          <button type="button" className="intro__btn intro__skip" onClick={() => dispatch({ type: "SKIP" })} data-cursor="">
            Skip Intro
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 5l8 7-8 7M13 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * App-wired version: starts when the preloader opens, reveals the existing homepage when done.
 * When disabled (see src/config/features.ts) it reveals the homepage as soon as the preloader opens.
 */
export function CinematicIntro({ enabled = FEATURES.barbellIntro }: { enabled?: boolean }) {
  const { preloaded, setLoaded } = useApp();
  const [done, setDone] = useState(false);
  const onReveal = useCallback(() => setLoaded(true), [setLoaded]);
  const onDone = useCallback(() => setDone(true), []);

  useEffect(() => {
    if (!enabled && preloaded) setLoaded(true);
  }, [enabled, preloaded, setLoaded]);

  if (!enabled || done) return null;
  return <IntroExperience start={preloaded} onReveal={onReveal} onDone={onDone} />;
}
