/** Procedural canvas textures (no external image files). Browser-only: needs `document`. */
import * as THREE from "three";
import { rng } from "./rng";

export function barkTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d")!;
  const base = g.createLinearGradient(0, 0, 256, 0);
  base.addColorStop(0, "#5e4029"); base.addColorStop(0.5, "#74513a"); base.addColorStop(1, "#5e4029");
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  const r = rng(7);
  // Vertical grain ridges: dark furrows + light ridge highlights
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, w = 2 + r() * 7, ph = r() * 10;
    g.strokeStyle = r() > 0.45 ? `rgba(35,20,10,${0.35 + r() * 0.35})` : `rgba(170,128,90,${0.2 + r() * 0.25})`;
    g.lineWidth = w;
    g.beginPath();
    for (let y = -20; y <= 532; y += 16) {
      const xx = x + Math.sin(y * 0.018 + ph) * 7 + Math.sin(y * 0.07 + ph) * 2;
      if (y < 0) g.moveTo(xx, y); else g.lineTo(xx, y);
    }
    g.stroke();
  }
  // Occasional knots
  for (let i = 0; i < 5; i++) {
    const x = r() * 256, y = r() * 512;
    g.fillStyle = "rgba(30,18,10,0.6)";
    g.beginPath(); g.ellipse(x, y, 5 + r() * 4, 9 + r() * 6, 0, 0, Math.PI * 2); g.fill();
  }
  // Fine speckle for surface roughness variation
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(20,12,6,0.25)" : "rgba(190,150,110,0.15)";
    g.fillRect(r() * 256, r() * 512, 1 + r() * 2, 1 + r() * 3);
  }
  const wrap = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.anisotropy = 4; return t; };
  const map = wrap(new THREE.CanvasTexture(c)); map.colorSpace = THREE.SRGBColorSpace;
  // Normal map from bark luminance (Sobel) -> real ridge relief, no external files
  const src = g.getImageData(0, 0, 256, 512).data;
  const H = (x: number, y: number) => { const i = (((y + 512) % 512) * 256 + ((x + 256) % 256)) * 4; return (src[i]! + src[i + 1]! + src[i + 2]!) / 765; };
  const n = document.createElement("canvas"); n.width = 256; n.height = 512;
  const ng = n.getContext("2d")!, nd = ng.createImageData(256, 512);
  const rc = document.createElement("canvas"); rc.width = 256; rc.height = 512;
  const rg = rc.getContext("2d")!, rd = rg.createImageData(256, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 256; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3.5, dy = (H(x, y + 1) - H(x, y - 1)) * 3.5;
    const l = Math.hypot(dx, dy, 1), i = (y * 256 + x) * 4;
    nd.data[i] = (-dx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
    const rv = 200 + (1 - H(x, y)) * 55; // furrows rougher, ridges a touch smoother
    rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = rv; rd.data[i + 3] = 255;
  }
  ng.putImageData(nd, 0, 0); rg.putImageData(rd, 0, 0);
  return { map, normal: wrap(new THREE.CanvasTexture(n)), rough: wrap(new THREE.CanvasTexture(rc)) };
}

export function leafTexture() {
  // Dense clump of many small leaves (Free Fire-style foliage card)
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = rng(99);
  for (let i = 0; i < 420; i++) {
    const ang = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 112;
    const x = 128 + Math.cos(ang) * d, y = 128 + Math.sin(ang) * d * 0.9;
    const edge = d / 112;
    const top = 1 - y / 256;
    const v = Math.round(110 + 145 * Math.min(1, top * 0.7 + (1 - edge) * 0.25 + r() * 0.3));
    g.save(); g.translate(x, y); g.rotate(ang + (r() - 0.5) * 1.2 + Math.PI / 2);
    const sz = 7 + r() * 7;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(sz * 0.55, -sz * 0.5, 0, -sz * 1.6);
    g.quadraticCurveTo(-sz * 0.55, -sz * 0.5, 0, 0); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function soilTexture() {
  // Dark soil/contact patch that seats the root flare into the grass
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(45,32,20,0.85)"); grd.addColorStop(0.45, "rgba(60,48,28,0.5)"); grd.addColorStop(1, "rgba(60,60,30,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const r = rng(5);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,20,10,${r() * 0.35})`; const a = r() * 6.28, d = r() * 50; g.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
