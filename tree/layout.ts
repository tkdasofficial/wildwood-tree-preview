import * as THREE from "three";
import { rng } from "./rng";
import { ROOTS, merge, taperTube } from "./geometry";

export type Cluster = { pos: THREE.Vector3; r: number };
export type OakLayout = {
  /** Branches + surface roots merged into one geometry (per-seed). */
  branchGeo: THREE.BufferGeometry;
  clusters: Cluster[];
  leaves: { m: THREE.Matrix4; c: THREE.Color }[];
};

/** Seeded tree layout: branches, roots, foliage clusters and leaf-card transforms/colours. */
export function buildOakLayout(seed = 1337): OakLayout {
  const r = rng(seed);
  const branches: THREE.BufferGeometry[] = [];
  const roots: THREE.BufferGeometry[] = [];
  const clusters: Cluster[] = [];

  // Surface roots: short tapered tubes that dive into the soil between buttress lobes
  for (let i = 0; i < ROOTS; i++) {
    const a = (i / ROOTS) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const s = dir.clone().multiplyScalar(0.75).setY(0.12);
    const m = dir.clone().multiplyScalar(1.2 + r() * 0.3).setY(0.02);
    const e = dir.clone().multiplyScalar(1.7 + r() * 0.5).setY(-0.25);
    roots.push(taperTube(new THREE.QuadraticBezierCurve3(s, m, e), 8, 7, 0.2, 0.04));
  }

  // Crown: clusters scattered in an irregular, layered ellipsoid; each fed by a branch
  const layers = [
    { y: 3.4, n: 5, rad: 2.3, size: [0.8, 1.05] },
    { y: 4.2, n: 7, rad: 2.4, size: [0.9, 1.15] },
    { y: 5.0, n: 7, rad: 2.0, size: [0.9, 1.2] },
    { y: 5.8, n: 5, rad: 1.4, size: [0.85, 1.1] },
    { y: 6.6, n: 3, rad: 0.7, size: [0.8, 1.0] },
  ];
  let k = 0;
  for (const L of layers) {
    for (let i = 0; i < L.n; i++, k++) {
      const a = (i / L.n) * Math.PI * 2 + k * 0.9 + (r() - 0.5) * 0.6;
      const rad = L.rad * (0.75 + r() * 0.4);
      const pos = new THREE.Vector3(Math.cos(a) * rad, L.y + (r() - 0.5) * 0.7, Math.sin(a) * rad * 0.9);
      const size = THREE.MathUtils.lerp(L.size[0]!, L.size[1]!, r());
      clusters.push({ pos, r: size });
      // Branch from trunk to just inside the cluster centre
      const startY = Math.min(4.2, L.y - 1.0 - r() * 0.5);
      const start = new THREE.Vector3(0, Math.max(2.8, startY), 0);
      const end = pos.clone().lerp(new THREE.Vector3(0, pos.y, 0), 0.25).add(new THREE.Vector3(0, -0.2, 0));
      const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.35, 0));
      const thick = 0.1 + 0.06 * (rad / 2.1);
      branches.push(taperTube(new THREE.QuadraticBezierCurve3(start, mid, end), 7, 6, thick, 0.035));
    }
  }

  // Leaf cards: fewer, larger, varied sprigs on each cluster's outer shell
  const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  const shade = new THREE.Color("#2a5524"), mid = new THREE.Color("#4f8a33"), sun = new THREE.Color("#a9cf5c");
  const warm = new THREE.Color("#d8e37a");
  const q = new THREE.Quaternion(), tw = new THREE.Quaternion(), s = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0), SUN = new THREE.Vector3(0.5, 0.85, 0.35).normalize();
  for (const cl of clusters) {
    const clusterHue = (r() - 0.5) * 0.04, clusterLum = (r() - 0.5) * 0.08;
    const count = Math.round(cl.r * cl.r * 30);
    for (let i = 0; i < count; i++) {
      const n = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      n.y = n.y * 0.8 + 0.12; n.normalize();
      const depth = r();
      const p = cl.pos.clone().addScaledVector(n, cl.r * (0.35 + depth * 0.65));
      if (depth > 0.85 && r() > 0.5) continue; // thin the outer shell for a ragged edge
      // Face mostly outward, tilted upward, with random roll and droop
      const outward = n.clone().lerp(UP, 0.3 + r() * 0.2).normalize();
      q.setFromUnitVectors(Z, outward);
      q.multiply(tw.setFromAxisAngle(Z, r() * Math.PI * 2));
      q.multiply(tw.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 1.3));
      const sz = (0.7 + Math.pow(r(), 1.6) * 0.9) * (0.8 + cl.r * 0.25) * (1.05 - depth * 0.2);
      s.set(sz, sz, sz);
      // Light term: sun-facing, height in crown, and outer-shell exposure
      const facing = n.dot(SUN) * 0.5 + 0.5;
      const h = THREE.MathUtils.clamp((p.y - 3.2) / 3.6, 0, 1);
      const L = THREE.MathUtils.clamp(facing * 0.55 + h * 0.45 + depth * 0.15 - 0.12, 0, 1); // inner = darker
      const col = L < 0.45 ? shade.clone().lerp(mid, L / 0.45) : mid.clone().lerp(sun, (L - 0.45) / 0.55);
      if (L > 0.8 && r() > 0.5) col.lerp(warm, 0.35);
      col.offsetHSL(clusterHue + (r() - 0.5) * 0.03, (r() - 0.5) * 0.06, clusterLum + (r() - 0.5) * 0.06);
      leaves.push({ m: new THREE.Matrix4().compose(p, q, s), c: col });
    }
  }
  return { branchGeo: merge([...branches, ...roots]), clusters, leaves };
}
