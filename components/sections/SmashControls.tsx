"use client";

import type { SmashStatus } from "@/lib/gate/smash";

type Props = {
  status: SmashStatus;
  soundOn: boolean;
  /** Replay is offered once the sequence is over (hidden for reduced motion) */
  canReplay: boolean;
  onSkip: () => void;
  onReplay: () => void;
  onToggleSound: () => void;
};

/** Skip / Replay / Sound controls for the gate smash. */
export function SmashControls({ status, soundOn, canReplay, onSkip, onReplay, onToggleSound }: Props) {
  const playing = status === "playing";
  if (!playing && !canReplay) return null;
  return (
    <div className="hero__controls" data-status={status}>
      <button type="button" className="hero__ctl" aria-pressed={soundOn} onClick={onToggleSound} data-cursor="">
        <span className={`hero__eq ${soundOn ? "is-on" : ""}`} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {soundOn ? "Sound on" : "Sound off"}
      </button>
      {playing ? (
        <button type="button" className="hero__ctl" onClick={onSkip} data-cursor="">
          Skip intro
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M5 5l8 7-8 7M13 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      ) : (
        <button type="button" className="hero__ctl" onClick={onReplay} data-cursor="">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Replay
        </button>
      )}
    </div>
  );
}
