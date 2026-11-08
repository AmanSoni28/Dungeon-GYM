"use client";

type Props = {
  soundOn: boolean;
  onToggleSound: () => void;
  /** jump straight past the gate into the gym */
  onSkip: () => void;
};

/** Sound / Skip controls for the scroll-driven gate smash. */
export function SmashControls({ soundOn, onToggleSound, onSkip }: Props) {
  return (
    <div className="hero__controls">
      <button type="button" className="hero__ctl" aria-pressed={soundOn} onClick={onToggleSound} data-cursor="">
        <span className={`hero__eq ${soundOn ? "is-on" : ""}`} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {soundOn ? "Sound on" : "Sound off"}
      </button>
      <button type="button" className="hero__ctl" onClick={onSkip} data-cursor="">
        Skip intro
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M5 5l8 7-8 7M13 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  );
}
