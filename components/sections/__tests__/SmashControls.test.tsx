import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmashControls } from "../SmashControls";

afterEach(cleanup);

describe("SmashControls", () => {
  it("offers Skip + a Sound toggle", () => {
    const onSkip = vi.fn();
    const onToggleSound = vi.fn();
    render(<SmashControls soundOn={false} onSkip={onSkip} onToggleSound={onToggleSound} />);
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    const sound = screen.getByRole("button", { name: /sound off/i });
    expect(sound.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(sound);
    expect(onToggleSound).toHaveBeenCalledTimes(1);
  });

  it("reflects sound being on", () => {
    render(<SmashControls soundOn onSkip={vi.fn()} onToggleSound={vi.fn()} />);
    expect(screen.getByRole("button", { name: /sound on/i }).getAttribute("aria-pressed")).toBe("true");
  });
});
