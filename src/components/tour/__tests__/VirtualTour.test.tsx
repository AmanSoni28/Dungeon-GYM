import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { useEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { virtualTour } from "@/data/site";
import { VirtualTour, type TourMode } from "../VirtualTour";
import { Tour } from "@/components/sections/Tour";
import type { TourViewerProps } from "../TourViewer";

// The 3D viewer is replaced by a stub that reports "photo loaded" straight away.
const viewer = vi.hoisted(() => ({ last: null as null | { onLost: () => void }, crash: false }));
vi.mock("../TourViewer", () => ({
  default: (p: TourViewerProps) => {
    if (viewer.crash) throw new Error("ChunkLoadError: Loading chunk 380 failed.");
    viewer.last = p;
    useEffect(() => p.onReady(), [p]);
    return <div data-testid="tour-webgl" data-stop={p.stop.id} />;
  },
}));

class IO {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal("IntersectionObserver", IO);

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SLOW = { timeout: 3000 };

function open(mode: TourMode = "fallback", startIndex = 0) {
  const onClose = vi.fn();
  render(<VirtualTour stops={virtualTour} open startIndex={startIndex} onClose={onClose} forceMode={mode} />);
  const dialog = screen.getByRole("dialog", { name: /virtual tour/i });
  return { onClose, dialog, ui: within(dialog) };
}
const title = (ui: ReturnType<typeof within>, name: RegExp) => ui.findByRole("heading", { name }, SLOW);

describe("<VirtualTour />", () => {
  it("opens full screen on Zone 01 with its title, description and the 360° indicator", async () => {
    const { ui, dialog } = open();
    expect(await title(ui, /strength training/i)).toBeTruthy();
    expect(within(dialog.querySelector<HTMLElement>(".vt__info")!).getByText(/cable stations/i)).toBeTruthy();
    // screen readers are told about the zone too
    expect(dialog.querySelector('[aria-live="polite"]')!.textContent).toMatch(/Zone 01 of 04: Strength Training/);
    expect(ui.getByText("100°")).toBeTruthy();
    expect(ui.getByText(/of 360° captured/i)).toBeTruthy();
  });

  it("shows the real photo in the no-WebGL fallback", async () => {
    const { ui } = open("fallback");
    const img = (await ui.findByAltText("Strength training floor, Dungeon Gym")) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/images/tour/zone-01-strength-sm.webp");
  });

  it("uses the 3D viewer when WebGL is available", async () => {
    const { ui } = open("full");
    expect((await ui.findByTestId("tour-webgl")).dataset.stop).toBe("strength");
  });

  it("Next / Previous zone buttons move through the zones and wrap around", async () => {
    const { ui } = open();
    await title(ui, /strength training/i);
    fireEvent.click(ui.getByRole("button", { name: "Next zone" }));
    expect(await title(ui, /cardio & treadmills/i)).toBeTruthy();
    fireEvent.click(ui.getByRole("button", { name: "Previous zone" }));
    await title(ui, /strength training/i);
    fireEvent.click(ui.getByRole("button", { name: "Previous zone" }));
    expect(await title(ui, /dumbbell & free weights/i)).toBeTruthy();
  });

  it("zone buttons jump straight to a zone and mark the current one", async () => {
    const { ui } = open();
    fireEvent.click(ui.getByRole("button", { name: "Zone 03: Main Workout Floor" }));
    await title(ui, /main workout floor/i);
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Zone 03: Main Workout Floor" }).getAttribute("aria-current")).toBe("step")
    );
  });

  it("3D hotspots walk to the zone they point at", async () => {
    const { ui } = open("full");
    await title(ui, /strength training/i);
    fireEvent.click(ui.getByRole("button", { name: "Go to Zone 04: Dumbbell & Free Weights" }));
    expect(await title(ui, /dumbbell & free weights/i)).toBeTruthy();
    await waitFor(() => expect(ui.getByTestId("tour-webgl").dataset.stop).toBe("free-weights"));
  });

  it("'Walk to' links work without WebGL too", async () => {
    const { ui } = open("fallback");
    fireEvent.click(await ui.findByRole("button", { name: /walk to zone 03/i }, SLOW));
    expect(await title(ui, /main workout floor/i)).toBeTruthy();
  });

  it("zoom in / zoom out / reset camera", async () => {
    const { ui } = open();
    const zoomOut = ui.getByLabelText("Zoom out") as HTMLButtonElement;
    const zoomIn = ui.getByLabelText("Zoom in") as HTMLButtonElement;
    const out = ui.getByLabelText("Zoom level");
    expect(out.textContent).toBe("100%");
    expect(zoomOut.disabled).toBe(true);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    expect(out.textContent).toBe("150%");
    expect(zoomOut.disabled).toBe(false);
    fireEvent.click(zoomOut);
    expect(out.textContent).toBe("125%");
    fireEvent.click(ui.getByLabelText("Reset camera"));
    expect(out.textContent).toBe("100%");
    for (let i = 0; i < 12; i++) fireEvent.click(zoomIn);
    expect(out.textContent).toBe("250%");
    expect(zoomIn.disabled).toBe(true);
  });

  it("mouse wheel and pinch zoom", async () => {
    const { ui } = open();
    const stage = ui.getByRole("application");
    fireEvent.wheel(stage, { deltaY: -100 });
    expect(ui.getByLabelText("Zoom level").textContent).toBe("113%");
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 300, clientY: 100 });
    expect(ui.getByLabelText("Zoom level").textContent).toBe("225%");
  });

  it("dragging hides the 'Drag to explore' hint", () => {
    const { dialog, ui } = open();
    const hint = dialog.querySelector(".vt__hint")!;
    expect(hint.classList.contains("is-done")).toBe(false);
    const stage = ui.getByRole("application");
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 200, clientY: 210 });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(hint.classList.contains("is-done")).toBe(true);
  });

  it("keyboard: look, zoom, change zone and exit", async () => {
    const { ui, onClose } = open();
    const stage = ui.getByRole("application");
    expect(document.activeElement).toBe(stage); // focus moves into the tour
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    expect(ui.getByText(/drag to explore/i).classList.contains("is-done")).toBe(true);
    fireEvent.keyDown(stage, { key: "+" });
    expect(ui.getByLabelText("Zoom level").textContent).toBe("125%");
    fireEvent.keyDown(stage, { key: "n" });
    await title(ui, /cardio & treadmills/i);
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Exit tour button closes the tour", () => {
    const { ui, onClose } = open();
    fireEvent.click(ui.getByRole("button", { name: "Exit tour" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("fullscreen button requests fullscreen on the tour", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    const req = vi.fn(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = req;
    const { ui, dialog } = open();
    fireEvent.click(await ui.findByRole("button", { name: "Fullscreen" }));
    expect(req).toHaveBeenCalledTimes(1);
    expect(req.mock.contexts[0]).toBe(dialog);
  });

  it("locks page scrolling while open and restores it on exit", () => {
    const { unmount } = render(<VirtualTour stops={virtualTour} open onClose={() => {}} forceMode="fallback" />);
    expect(document.documentElement.classList.contains("vt-open")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("vt-open")).toBe(false);
  });

  it("falls back to the photo when the 3D viewer loses its WebGL context", async () => {
    viewer.last = null;
    const { ui } = open("full");
    await ui.findByTestId("tour-webgl");
    act(() => viewer.last!.onLost());
    expect(await ui.findByAltText("Strength training floor, Dungeon Gym")).toBeTruthy();
  });
});

describe("<VirtualTour /> resilience", () => {
  it("if the 3D viewer fails to load (e.g. flaky network), the tour keeps working with the photo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught error
    viewer.crash = true;
    try {
      const { ui } = open("full");
      expect(await ui.findByAltText("Strength training floor, Dungeon Gym")).toBeTruthy();
      expect(ui.getByRole("button", { name: "Next zone" })).toBeTruthy();
    } finally {
      viewer.crash = false;
    }
  });
});

describe("Tour section (the doorway into the tour)", () => {
  it("shows the branding, tagline, loader and ENTER THE GYM", () => {
    render(<Tour />);
    expect(screen.getByText(/your fitness world/i)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: /loading the virtual tour/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enter the gym/i })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ENTER THE GYM opens the tour on Zone 01", async () => {
    render(<Tour />);
    fireEvent.click(screen.getByRole("button", { name: /enter the gym/i }));
    const dialog = await screen.findByRole("dialog", { name: /virtual tour/i });
    expect(await within(dialog).findByRole("heading", { name: /strength training/i })).toBeTruthy();
  });

  it("each zone card opens the tour on that zone", async () => {
    render(<Tour />);
    fireEvent.click(screen.getByRole("button", { name: /zone 02 cardio & treadmills/i }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("heading", { name: /cardio & treadmills/i })).toBeTruthy();
  });

  it("closing the tour returns to the page", async () => {
    render(<Tour />);
    fireEvent.click(screen.getByRole("button", { name: /enter the gym/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Exit tour" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), SLOW);
  });
});
