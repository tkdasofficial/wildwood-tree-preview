import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Seeded RNG so the tree is identical every load
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function barkTexture() {
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

function leafTexture() {
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

// Trunk: lathe with taper + smooth flare that buttresses into root lobes
const ROOTS = 6;
function trunkGeometry() {
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

function taperTube(curve: THREE.Curve<THREE.Vector3>, seg: number, rad: number, r0: number, r1: number) {
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

function merge(list: THREE.BufferGeometry[]) {
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

type Cluster = { pos: THREE.Vector3; r: number };

function buildTree() {
  const r = rng(1337);
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

function lumpyBlob() {
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

// Shared across every tree instance: one set of textures/materials/geometries per app
let shared: ReturnType<typeof makeShared> | null = null;
function makeShared() {
  const bark = barkTexture();
  return {
    trunk: trunkGeometry(),
    barkMat: new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughnessMap: bark.rough, roughness: 1, color: "#d8b898" }),
    trunkMat: new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughnessMap: bark.rough, roughness: 1, color: "#d8b898", vertexColors: true }),
    leafMat: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }),
    innerMat: new THREE.MeshStandardMaterial({ color: "#2a5a24", roughness: 1 }),
    leafGeo: new THREE.PlaneGeometry(1, 1),
    blobGeo: lumpyBlob(),
    soilGeo: new THREE.CircleGeometry(2.4, 32).rotateX(-Math.PI / 2),
    soilMat: new THREE.MeshBasicMaterial({ map: soilTexture(), transparent: true, depthWrite: false }),
  };
}
export const getTreeAssets = () => (shared ??= makeShared());

function soilTexture() {
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

export function Tree({ sway }: { sway: boolean }) {
  const data = useMemo(buildTree, []);
  const { trunk, barkMat, trunkMat, leafMat, innerMat, leafGeo, blobGeo, soilGeo, soilMat } = getTreeAssets();

  const leafRef = useRef<THREE.InstancedMesh>(null);
  const blobRef = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.Group>(null);
  const amp = useRef(0);
  const time = useRef(0);
  const ready = useRef(false);

  useFrame((_, dt) => {
    if (!ready.current && leafRef.current && blobRef.current) {
      const lm = leafRef.current, bm = blobRef.current;
      data.leaves.forEach((l, i) => { lm.setMatrixAt(i, l.m); lm.setColorAt(i, l.c); });
      lm.instanceMatrix.needsUpdate = true; lm.instanceColor!.needsUpdate = true;
      const m = new THREE.Matrix4();
      data.clusters.forEach((c, i) => { m.makeScale(c.r * 0.5, c.r * 0.45, c.r * 0.5).setPosition(c.pos); bm.setMatrixAt(i, m); });
      bm.instanceMatrix.needsUpdate = true;
      ready.current = true;
    }
    const d = Math.min(dt, 0.05);
    if (sway) time.current += d;
    amp.current = THREE.MathUtils.damp(amp.current, sway ? 1 : 0, 2, d);
    const g = canopy.current;
    if (g) {
      const t = time.current, a = amp.current;
      g.rotation.z = a * (Math.sin(t * 1.1) * 0.016 + Math.sin(t * 2.9) * 0.005);
      g.rotation.x = a * Math.sin(t * 0.8 + 1) * 0.011;
    }
  });

  return (
    <group>
      <mesh geometry={trunk} material={trunkMat} castShadow receiveShadow />
      <mesh geometry={soilGeo} material={soilMat} position={[0, 0.012, 0]} renderOrder={1} />
      {/* Pivot near trunk top so sway bends the crown, not the base */}
      <group position={[0, 2.6, 0]}>
        <group ref={canopy}>
          <group position={[0, -2.6, 0]}>
            <mesh geometry={data.branchGeo} material={barkMat} castShadow receiveShadow />
            <instancedMesh ref={blobRef} args={[blobGeo, innerMat, data.clusters.length]} castShadow receiveShadow />
            <instancedMesh ref={leafRef} args={[leafGeo, leafMat, data.leaves.length]} castShadow receiveShadow />
          </group>
        </group>
      </group>
    </group>
  );
}
