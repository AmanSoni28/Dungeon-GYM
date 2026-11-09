import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadImage } from "../preload";

afterEach(() => vi.unstubAllGlobals());

function streamOf(chunks: number[]) {
  return new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((n) => c.enqueue(new Uint8Array(n)));
      c.close();
    },
  });
}

describe("preloadImage", () => {
  it("reports real download progress and finishes at 100%", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(streamOf([250, 250, 500]), { headers: { "content-length": "1000" } }))
    );
    const seen: number[] = [];
    await preloadImage("/x.jpg", (p) => seen.push(p));
    expect(seen).toEqual([0.25, 0.5, 0.99, 1]);
  });

  it("still completes when the size is unknown", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("0123456789")));
    const seen: number[] = [];
    await preloadImage("/x.jpg", (p) => seen.push(p));
    expect(seen.at(-1)).toBe(1);
  });

  it("does not report after being aborted (section left / unmounted)", async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        ctrl.abort();
        throw new DOMException("aborted", "AbortError");
      })
    );
    const seen: number[] = [];
    await preloadImage("/x.jpg", (p) => seen.push(p), ctrl.signal);
    expect(seen).toEqual([]);
  });
});
