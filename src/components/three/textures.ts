"use client";

import * as THREE from "three";
import { rand } from "@/lib/utils";

/** Procedural stone-brick texture painted on a canvas: no image downloads needed. */
export function makeStoneTexture({ size = 512, rows = 8, cols = 4, base = 34, seed = 1 } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0d0b0a";
  g.fillRect(0, 0, size, size);

  const bh = size / rows;
  const bw = size / cols;
  let k = seed * 1000;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let col = -1; col <= cols; col++) {
      const x = col * bw + off;
      const y = r * bh;
      const shade = base + rand(k++) * 22;
      g.fillStyle = `rgb(${shade + 8},${shade + 4},${shade})`;
      const inset = 3 + rand(k++) * 2;
      g.beginPath();
      g.roundRect(x + inset, y + inset, bw - inset * 2, bh - inset * 2, 4);
      g.fill();
      // speckle / wear
      for (let s = 0; s < 40; s++) {
        const a = rand(k++) * 0.25;
        g.fillStyle = rand(k++) > 0.5 ? `rgba(255,240,220,${a * 0.25})` : `rgba(0,0,0,${a})`;
        g.fillRect(x + rand(k++) * bw, y + rand(k++) * bh, 1 + rand(k++) * 3, 1 + rand(k++) * 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Rubber gym-floor tiles */
export function makeFloorTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#141210";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(255,255,255,${rand(i) * 0.035})`;
    g.fillRect(rand(i + 1) * size, rand(i + 2) * size, 1.5, 1.5);
  }
  g.strokeStyle = "rgba(0,0,0,0.8)";
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo((i * size) / 4, 0);
    g.lineTo((i * size) / 4, size);
    g.moveTo(0, (i * size) / 4);
    g.lineTo(size, (i * size) / 4);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial glow sprite (for flames, embers, light halos) */
export function makeGlowTexture(inner = "rgba(255,220,150,1)", outer = "rgba(255,90,20,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.5)"));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Text painted onto a texture (avoids downloading 3D fonts) */
export function makeTextTexture(text: string, { color = "#e9c46a", font = "bold 140px Impact, Anton, sans-serif", w = 1024, h = 256 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = color;
  g.shadowBlur = 30;
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
