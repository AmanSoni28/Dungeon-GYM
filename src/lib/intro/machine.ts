// Intro lifecycle as a small pure state machine.
//  waiting ─START→ playing ─IMPACT→ impact ─LEAVE→ leaving ─DONE→ done
//  SKIP from any active phase → leaving (fast exit).  FINISH → done immediately (reduced motion).

export type IntroPhase = "waiting" | "playing" | "impact" | "leaving" | "done";
export type IntroState = { phase: IntroPhase; skipped: boolean; impacts: number };
export type IntroEvent =
  | { type: "START" }
  | { type: "IMPACT" }
  | { type: "LEAVE" }
  | { type: "SKIP" }
  | { type: "DONE" }
  | { type: "FINISH" };

export const initialIntroState: IntroState = { phase: "waiting", skipped: false, impacts: 0 };

export function introReducer(state: IntroState, event: IntroEvent): IntroState {
  if (state.phase === "done") return state;

  switch (event.type) {
    case "START":
      return state.phase === "waiting" ? { ...state, phase: "playing" } : state;
    case "IMPACT":
      if (state.phase === "playing") return { ...state, phase: "impact", impacts: state.impacts + 1 };
      if (state.phase === "impact") return { ...state, impacts: state.impacts + 1 };
      return state;
    case "LEAVE":
      return state.phase === "playing" || state.phase === "impact" ? { ...state, phase: "leaving" } : state;
    case "SKIP":
      return state.phase === "leaving" ? state : { ...state, phase: "leaving", skipped: true };
    case "DONE":
      return state.phase === "leaving" ? { ...state, phase: "done" } : state;
    case "FINISH":
      return { ...state, phase: "done" };
    default:
      return state;
  }
}

export const isActive = (s: IntroState) => s.phase !== "done";
