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
  g.fillStyle = "#6b4a32"; g.fillRect(0, 0, 256, 512);
  const r = rng(7);
  for (let i = 0; i < 70; i++) {
    const x = r() * 256, w = 3 + r() * 9;
    g.fillStyle = r() > 0.5 ? "rgba(40,24,14,0.55)" : "rgba(150,110,75,0.35)";
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y);
    g.lineTo(x + w, 512); g.lineTo(x + w, 0); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function leafTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  // Three-leaf stylized card
  const leaf = (a: number, s: number) => {
    g.save(); g.translate(64, 110); g.rotate(a); g.scale(s, s);
    const grd = g.createLinearGradient(0, 0, 0, -95);
    grd.addColorStop(0, "#cfcfcf"); grd.addColorStop(1, "#ffffff");
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(30, -25, 26, -70, 0, -98);
    g.bezierCurveTo(-26, -70, -30, -25, 0, 0); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -88); g.stroke();
    g.restore();
  };
  leaf(-0.6, 0.75); leaf(0.6, 0.75); leaf(0, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Trunk: lathe with taper + root flare, then noise-bulged
function trunkGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const y = (i / 24) * 4.2;
    const flare = 0.55 * Math.exp(-y * 3.2);
    pts.push(new THREE.Vector2(0.62 - y * 0.075 + flare, y));
  }
  const geo = new THREE.LatheGeometry(pts, 20);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const lobes = 1 + 0.12 * Math.sin(a * 5 + y * 0.6) * Math.exp(-y * 0.8) + 0.03 * Math.sin(a * 11 + y * 3);
    p.setXYZ(i, x * lobes, y, z * lobes);
  }
  geo.computeVertexNormals();
  return geo;
}

type Cluster = { pos: THREE.Vector3; r: number };

function buildTree() {
  const r = rng(42);
  const branches: THREE.BufferGeometry[] = [];
  const clusters: Cluster[] = [];
  const top = new THREE.Vector3(0, 4.1, 0);
  // Primary branches
  const N = 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + r() * 0.5;
    const startY = 2.9 + r() * 1.1;
    const len = 1.8 + r() * 0.7;
    const dir = new THREE.Vector3(Math.cos(a), 0.7 + r() * 0.4, Math.sin(a)).normalize();
    const start = new THREE.Vector3(0, startY, 0);
    const end = start.clone().addScaledVector(dir, len);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.25, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.TubeGeometry(curve, 8, 0.17, 7, false);
    taperTube(tube, 0.17, 0.06, 8, 7);
    branches.push(tube);
    clusters.push({ pos: end.clone().add(new THREE.Vector3(0, 0.3, 0)), r: 1.25 + r() * 0.3 });
    // Secondary branch
    const s0 = curve.getPoint(0.55);
    const sDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 1.6).setY(0.9).normalize();
    const s1 = s0.clone().addScaledVector(sDir, 1.0);
    const sc = new THREE.QuadraticBezierCurve3(s0, s0.clone().lerp(s1, 0.5).add(new THREE.Vector3(0, 0.15, 0)), s1);
    const st = new THREE.TubeGeometry(sc, 5, 0.08, 5, false);
    taperTube(st, 0.08, 0.035, 5, 5);
    branches.push(st);
    clusters.push({ pos: s1.clone().add(new THREE.Vector3(0, 0.2, 0)), r: 0.95 + r() * 0.25 });
  }
  clusters.push({ pos: top.clone().add(new THREE.Vector3(0, 1.0, 0)), r: 1.5 });
  clusters.push({ pos: new THREE.Vector3(0, 5.9, 0), r: 1.1 });

  // Leaf card transforms on cluster surfaces
  const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  const deep = new THREE.Color("#3a7a30"), mid = new THREE.Color("#4f9a36"), sun = new THREE.Color("#9fd651");
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);
  for (const cl of clusters) {
    const count = Math.round(cl.r * 70);
    for (let i = 0; i < count; i++) {
      const n = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      n.y = n.y * 0.75 + 0.15; n.normalize();
      const d = cl.r * (0.7 + r() * 0.35);
      const p = cl.pos.clone().addScaledVector(n, d);
      const outward = n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.35).normalize();
      q.setFromUnitVectors(up, outward);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(up, r() * Math.PI * 2));
      const sz = 0.55 + r() * 0.35;
      s.set(sz, sz, sz);
      const light = THREE.MathUtils.clamp(n.y * 0.5 + 0.5 + (p.y - 5) * 0.08, 0, 1);
      const col = light < 0.5 ? deep.clone().lerp(mid, light * 2) : mid.clone().lerp(sun, (light - 0.5) * 2);
      col.offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.06);
      leaves.push({ m: new THREE.Matrix4().compose(p, q, s), c: col });
    }
  }
  return { branches, clusters, leaves };
}

function taperTube(g: THREE.TubeGeometry, r0: number, r1: number, seg: number, rad: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const path = g.parameters.path;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, c = path.getPoint(t), k = THREE.MathUtils.lerp(r0, r1, t) / r0;
    for (let j = 0; j <= rad; j++) {
      const idx = i * (rad + 1) + j;
      const v = new THREE.Vector3().fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
}

export function Tree({ sway }: { sway: boolean }) {
  const data = useMemo(buildTree, []);
  const trunk = useMemo(trunkGeometry, []);
  const bark = useMemo(barkTexture, []);
  const leafTex = useMemo(leafTexture, []);
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ map: bark, roughness: 0.9, color: "#c9a888" }), [bark]);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }), [leafTex]);
  const innerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2e6426", roughness: 1, flatShading: true }), []);
  const leafGeo = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, 0.3, 0), []);
  const blobGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const rootGeo = useMemo(() => new THREE.ConeGeometry(0.22, 1.3, 6).rotateZ(Math.PI / 2).translate(0.55, 0.08, 0), []);
  const branchGeo = useMemo(() => {
    // merge branches into one draw call
    const merged = new THREE.BufferGeometry();
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
    let off = 0;
    for (const b of data.branches) {
      const ni = b.index!.array;
      pos.push(...(b.attributes.position.array as Float32Array));
      nor.push(...(b.attributes.normal.array as Float32Array));
      uv.push(...(b.attributes.uv.array as Float32Array));
      for (let i = 0; i < ni.length; i++) idx.push(ni[i]! + off);
      off += b.attributes.position.count;
    }
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    merged.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    merged.setIndex(idx);
    return merged;
  }, [data]);

  const leafRef = useRef<THREE.InstancedMesh>(null);
  const blobRef = useRef<THREE.InstancedMesh>(null);
  const rootRef = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.Group>(null);
  const time = useRef(0);

  const setup = () => {
    const lm = leafRef.current, bm = blobRef.current, rm = rootRef.current;
    if (lm && !lm.userData.done) {
      data.leaves.forEach((l, i) => { lm.setMatrixAt(i, l.m); lm.setColorAt(i, l.c); });
      lm.instanceMatrix.needsUpdate = true; lm.instanceColor!.needsUpdate = true; lm.userData.done = true;
    }
    if (bm && !bm.userData.done) {
      const m = new THREE.Matrix4();
      data.clusters.forEach((c, i) => { m.makeScale(c.r * 0.82, c.r * 0.7, c.r * 0.82).setPosition(c.pos); bm.setMatrixAt(i, m); });
      bm.instanceMatrix.needsUpdate = true; bm.userData.done = true;
    }
    if (rm && !rm.userData.done) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < 7; i++) { m.makeRotationY((i / 7) * Math.PI * 2 + 0.3); rm.setMatrixAt(i, m); }
      rm.instanceMatrix.needsUpdate = true; rm.userData.done = true;
    }
  };

  useFrame((_, dt) => {
    setup();
    const d = Math.min(dt, 0.05);
    if (sway) time.current += d;
    const g = canopy.current;
    if (g) {
      const t = time.current;
      const target = sway ? 1 : 0;
      g.userData.amp = THREE.MathUtils.damp(g.userData.amp ?? 0, target, 2, d);
      const a = g.userData.amp as number;
      g.rotation.z = a * (Math.sin(t * 1.1) * 0.018 + Math.sin(t * 2.7) * 0.006);
      g.rotation.x = a * Math.sin(t * 0.8 + 1) * 0.012;
    }
  });

  return (
    <group>
      <mesh geometry={trunk} material={barkMat} castShadow receiveShadow />
      <instancedMesh ref={rootRef} args={[rootGeo, barkMat, 7]} castShadow receiveShadow />
      <group ref={canopy}>
        <mesh geometry={branchGeo} material={barkMat} castShadow />
        <instancedMesh ref={blobRef} args={[blobGeo, innerMat, data.clusters.length]} castShadow receiveShadow />
        <instancedMesh ref={leafRef} args={[leafGeo, leafMat, data.leaves.length]} castShadow receiveShadow />
      </group>
    </group>
  );
}
