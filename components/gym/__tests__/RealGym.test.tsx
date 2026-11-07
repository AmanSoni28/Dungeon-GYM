import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RealGym } from "@/components/sections/RealGym";
import { fallbackShift } from "../GymPhotoFallback";
import { CinematicIntro } from "@/components/intro/CinematicIntro";
import { AppProvider, useApp } from "@/components/providers/AppProvider";
import type { GymView } from "@/lib/gym/look";

vi.mock("../GymViewer", () => ({ default: () => <div data-testid="webgl-viewer" /> }));

// IntersectionObserver isn't in jsdom: report everything as visible
class IO {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal("IntersectionObserver", IO);

const photo: GymView = { id: "floor", label: "Main training floor", src: "/images/gym/main-floor.jpg", kind: "photo", hfov: 104, aspect: 1.37 };
const pano: GymView = { id: "pano", label: "Spa lounge", src: "/pano.jpg", kind: "equirect", hfov: 360, aspect: 2 };

afterEach(() => cleanup());

describe("<RealGym />", () => {
  it("shows the real gym photo with honest labelling (not claimed as 360°)", async () => {
    render(<RealGym views={[photo]} forceMode="fallback" />);
    const img = await screen.findByAltText("Main training floor, Dungeon Gym");
    expect(img.getAttribute("src")).toBe("/images/gym/main-floor.jpg");
    expect(screen.getByText(/real photo/i)).toBeTruthy();
    expect(screen.queryByText(/360/)).toBeNull();
  });

  it("labels a real panorama as 360°", () => {
    render(<RealGym views={[pano]} forceMode="fallback" />);
    expect(screen.getByText(/360° panorama/i)).toBeTruthy();
  });

  it("uses the WebGL viewer when available", async () => {
    render(<RealGym views={[photo]} forceMode="full" />);
    expect(await screen.findByTestId("webgl-viewer")).toBeTruthy();
  });

  it("hides the 'Drag to explore' hint after the visitor drags", () => {
    const { container } = render(<RealGym views={[photo]} forceMode="fallback" />);
    const hint = container.querySelector(".realgym__hint")!;
    expect(hint.classList.contains("is-done")).toBe(false);
    const stage = screen.getByRole("application");
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100, pointerType: "touch" });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 40, clientY: 100, pointerType: "touch" });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(hint.classList.contains("is-done")).toBe(true);
  });

  it("supports keyboard look-around for accessibility", () => {
    const { container } = render(<RealGym views={[photo]} forceMode="fallback" />);
    const stage = screen.getByRole("application");
    expect(stage.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(container.querySelector(".realgym__hint")!.classList.contains("is-done")).toBe(true);
  });

  it("pans the fallback photo when dragged", async () => {
    render(<RealGym views={[photo]} forceMode="fallback" />);
    const img = (await screen.findByAltText(/Main training floor/)) as HTMLImageElement;
    await waitFor(() => expect(img.style.transform).toContain("translate3d"));
    const before = img.style.transform;
    const stage = screen.getByRole("application");
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 300, clientY: 100, pointerType: "mouse" });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 120, clientY: 100, pointerType: "mouse" });
    await waitFor(() => expect(img.style.transform).not.toBe(before));
  });

  it("offers view switching only when more than one real view exists", () => {
    const { rerender } = render(<RealGym views={[photo]} forceMode="fallback" />);
    expect(screen.queryByRole("button", { name: "Main training floor" })).toBeNull();
    rerender(<RealGym views={[photo, pano]} forceMode="fallback" />);
    fireEvent.click(screen.getByRole("button", { name: "Spa lounge" }));
    expect(screen.getByText(/360° panorama/i)).toBeTruthy();
  });

  it("has an Enter Dungeon button leading to the next homepage section", () => {
    render(<RealGym views={[photo]} forceMode="fallback" />);
    expect(screen.getByRole("button", { name: /enter dungeon/i })).toBeTruthy();
  });
});

describe("fallback pan", () => {
  it("sweeps left → right with scroll and never exceeds the photo's overflow", () => {
    expect(fallbackShift(0.14, 0)).toBeGreaterThan(0);
    expect(fallbackShift(0.7, 0)).toBeLessThan(0);
    expect(fallbackShift(0.4, 100)).toBeLessThanOrEqual(0.12);
    expect(fallbackShift(0.4, -100)).toBeGreaterThanOrEqual(-0.12);
  });
});

describe("barbell intro switch", () => {
  function Probe({ onLoaded }: { onLoaded: (v: boolean) => void }) {
    const { loaded, setPreloaded } = useApp();
    onLoaded(loaded);
    return <button onClick={() => setPreloaded(true)}>preloader done</button>;
  }

  it("when disabled, the homepage is revealed as soon as the preloader opens", async () => {
    const seen: boolean[] = [];
    render(
      <AppProvider>
        <CinematicIntro enabled={false} />
        <Probe onLoaded={(v) => seen.push(v)} />
      </AppProvider>
    );
    expect(seen.at(-1)).toBe(false);
    await act(async () => fireEvent.click(screen.getByText("preloader done")));
    expect(seen.at(-1)).toBe(true);
    expect(document.querySelector(".intro")).toBeNull();
  });
});
