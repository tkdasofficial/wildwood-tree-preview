import * as THREE from "three";

/** Number of buttress root lobes around the trunk base. */
export const ROOTS = 6;

/** Trunk: lathe with taper + flare into root lobes. Base sits at y = 0 (slightly sinks to y = -0.15). */
export function trunkGeometry() {
  const pts: THREE.Vector2[] = [];
  const H = 4.4;
  for (let i = 0; i <= 32; i++) {
    const y = -0.15 + Math.pow(i / 32, 1.3) * (H + 0.15);
    const flare = 0.62 * Math.exp(-Math.max(y, 0) * 2.6);
    pts.push(new THREE.Vector2(0.58 - y * 0.07 + flare, y));
  }
  const geo = new THREE.LatheGeometry(pts, 36);
  const p = geo.attributes["position"]!;
  const cols: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const low = Math.exp(-Math.max(y, 0) * 1.4);
    // root buttress lobes fade upward, gentle twist, fine fluting
    const lobe = Math.pow(0.5 + 0.5 * Math.cos(ROOTS * (a + y * 0.15)), 3);
    const k = 1 + 0.3 * lobe * low - 0.06 * low + 0.025 * Math.sin(a * 13 + y * 2.5) + 0.03 * Math.sin(y * 1.7 + a * 2);
    p.setXYZ(i, x * k, y, z * k);
    const ao = THREE.MathUtils.clamp(0.55 + 0.45 * Math.min(1, y / 0.9) + 0.25 * lobe * low, 0.5, 1);
    cols.push(ao * 0.95, ao * 0.97, ao);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return geo;
}

export function taperTube(curve: THREE.Curve<THREE.Vector3>, seg: number, rad: number, r0: number, r1: number) {
  const g = new THREE.TubeGeometry(curve, seg, r0, rad, false);
  const p = g.attributes["position"]!;
  const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, c = curve.getPoint(t);
    const k = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8)) / r0;
    for (let j = 0; j <= rad; j++) {
      const idx = i * (rad + 1) + j;
      v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Merge indexed geometries (position/normal/uv) into one draw call. Disposes inputs. */
export function merge(list: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  let off = 0;
  for (const b of list) {
    const ni = b.index!.array;
    pos.push(...(b.attributes["position"]!.array as Float32Array));
    nor.push(...(b.attributes["normal"]!.array as Float32Array));
    uv.push(...(b.attributes["uv"]!.array as Float32Array));
    for (let i = 0; i < ni.length; i++) idx.push(ni[i]! + off);
    off += b.attributes["position"]!.count;
    b.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}

export function lumpyBlob() {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes["position"]!;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.16 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7 - v.y * 1.9);
    v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
