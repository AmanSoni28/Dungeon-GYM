import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmashControls } from "../SmashControls";

afterEach(cleanup);

const handlers = () => ({ onSkip: vi.fn(), onReplay: vi.fn(), onToggleSound: vi.fn() });

describe("SmashControls", () => {
  it("offers Skip + Sound while the sequence plays", () => {
    const h = handlers();
    render(<SmashControls status="playing" soundOn={false} canReplay={false} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(h.onSkip).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /replay/i })).toBeNull();
    const sound = screen.getByRole("button", { name: /sound off/i });
    expect(sound.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(sound);
    expect(h.onToggleSound).toHaveBeenCalledTimes(1);
  });

  it("offers Replay once finished", () => {
    const h = handlers();
    render(<SmashControls status="done" soundOn canReplay {...h} />);
    expect(screen.queryByRole("button", { name: /skip intro/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /replay/i }));
    expect(h.onReplay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /sound on/i }).getAttribute("aria-pressed")).toBe("true");
  });

  it("renders nothing before the sequence, or when replay is not allowed (reduced motion)", () => {
    const { container, rerender } = render(<SmashControls status="pending" soundOn={false} canReplay={false} {...handlers()} />);
    expect(container.innerHTML).toBe("");
    rerender(<SmashControls status="done" soundOn={false} canReplay={false} {...handlers()} />);
    expect(container.innerHTML).toBe("");
  });
});
