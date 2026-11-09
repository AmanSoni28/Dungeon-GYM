/**
 * Download an image with real progress (0..1), so the tour's loading bar reflects actual bytes.
 * The response lands in the HTTP cache, so the viewer's texture load afterwards is instant.
 * Falls back to an <img> load (no granular progress) when streaming isn't available.
 * Never rejects: a failed preload just means the viewer loads the image itself.
 */
export async function preloadImage(src: string, onProgress: (p: number) => void, signal?: AbortSignal): Promise<void> {
  try {
    const res = await fetch(src, { signal });
    const total = Number(res.headers.get("content-length")) || 0;
    if (!res.ok || !res.body || !total) {
      await res.blob();
    } else {
      const reader = res.body.getReader();
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        onProgress(Math.min(0.99, loaded / total));
      }
    }
  } catch {
    if (signal?.aborted) return;
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = src;
    });
  }
  if (!signal?.aborted) onProgress(1);
}
