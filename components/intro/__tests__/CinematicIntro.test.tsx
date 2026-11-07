import { act, cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntroExperience } from "../CinematicIntro";
import type { AudioController } from "@/lib/intro/impactSound";

// the WebGL scene can't run in jsdom: replace it with a stub that exposes its callbacks
vi.mock("../IntroScene", () => ({
  default: (p: { onImpact: (s: number) => void; onSettled: () => void; lite: boolean }) => (
    <div data-testid="scene" data-lite={String(p.lite)}>
      <button onClick={() => p.onImpact(5.5)}>impact</button>
      <button onClick={() => p.onSettled()}>settle</button>
    </div>
  ),
}));

const fast = { leave: 0.05, skip: 0.05, watchdog: 30 };

// jsdom's getComputedStyle is very slow, so GSAP setup on the fallback's particles takes seconds
// here (microseconds in real browsers). Give these DOM tests realistic time budgets.
vi.setConfig({ testTimeout: 30_000 });
configure({ asyncUtilTimeout: 15_000 });

function fakeAudio(): AudioController & { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn>; playImpact: ReturnType<typeof vi.fn> } {
  let on = false;
  return {
    get enabled() {
      return on;
    },
    enable: vi.fn(async () => (on = true)),
    disable: vi.fn(() => {
      on = false;
    }),
    playImpact: vi.fn(() => on),
    dispose: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<IntroExperience />", () => {
  it("covers the page while waiting for the preloader, without revealing early", () => {
    const onReveal = vi.fn();
    const { container } = render(<IntroExperience start={false} onReveal={onReveal} onDone={vi.fn()} forceMode="fallback" timings={fast} />);
    expect(container.querySelector(".intro")?.getAttribute("data-phase")).toBe("waiting");
    expect(screen.getByRole("button", { name: /skip intro/i })).toBeTruthy();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("skips the intro entirely for prefers-reduced-motion and reveals the homepage", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const onReveal = vi.fn();
    const onDone = vi.fn();
    const { container } = render(<IntroExperience start onReveal={onReveal} onDone={onDone} timings={fast} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".intro")).toBeNull();
  });

  it("Skip Intro reveals the homepage and removes the overlay", async () => {
    const onReveal = vi.fn();
    const onDone = vi.fn();
    const { container } = render(<IntroExperience start onReveal={onReveal} onDone={onDone} forceMode="fallback" timings={fast} />);
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(container.querySelector(".intro")?.getAttribute("data-phase")).toBe("leaving");
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".intro")).toBeNull();
  });

  it("Escape also skips", async () => {
    const onDone = vi.fn();
    render(<IntroExperience start onReveal={vi.fn()} onDone={onDone} forceMode="fallback" timings={fast} />);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("runs the full story with the 3D scene: impact → settle → reveal", async () => {
    const audio = fakeAudio();
    const onReveal = vi.fn();
    const onDone = vi.fn();
    const { container } = render(
      <IntroExperience start onReveal={onReveal} onDone={onDone} forceMode="full" audio={audio} timings={fast} />
    );
    const scene = await screen.findByTestId("scene");
    expect(scene.getAttribute("data-lite")).toBe("false");
    fireEvent.click(screen.getByText("impact"));
    expect(container.querySelector(".intro")?.getAttribute("data-phase")).toBe("impact");
    expect(audio.playImpact).not.toHaveBeenCalled(); // sound is off by default
    fireEvent.click(screen.getByText("settle"));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("uses the lightweight scene in lite mode (mobile)", async () => {
    render(<IntroExperience start onReveal={vi.fn()} onDone={vi.fn()} forceMode="lite" timings={fast} />);
    expect((await screen.findByTestId("scene")).getAttribute("data-lite")).toBe("true");
  });

  it("plays the impact sound only after the visitor turns sound on", async () => {
    const audio = fakeAudio();
    render(<IntroExperience start onReveal={vi.fn()} onDone={vi.fn()} forceMode="full" audio={audio} timings={fast} />);
    const toggle = screen.getByRole("button", { name: /sound off/i });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(audio.enable).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /sound on/i }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(await screen.findByText("impact"));
    expect(audio.playImpact).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sound on/i }));
    });
    expect(audio.disable).toHaveBeenCalledTimes(1);
  });

  it("a watchdog exits even if the scene never reports back", async () => {
    const onDone = vi.fn();
    render(<IntroExperience start onReveal={vi.fn()} onDone={onDone} forceMode="full" timings={{ ...fast, watchdog: 0.05 }} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("plays only once per page load (never restarts after finishing)", async () => {
    const onDone = vi.fn();
    const onReveal = vi.fn();
    const { rerender, container } = render(
      <IntroExperience start onReveal={onReveal} onDone={onDone} forceMode="fallback" timings={fast} />
    );
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    rerender(<IntroExperience start={false} onReveal={onReveal} onDone={onDone} forceMode="fallback" timings={fast} />);
    rerender(<IntroExperience start onReveal={onReveal} onDone={onDone} forceMode="fallback" timings={fast} />);
    await new Promise((r) => setTimeout(r, 120));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".intro")).toBeNull();
  });
});
