import * as THREE from "three";
import { getOakAssets } from "./assets";
import { buildOakLayout } from "./layout";

export type OakTreeOptions = {
  /** Layout seed; same seed => identical tree. Default 1337. */
  seed?: number;
  /** Uniform scale. Base stays at y = 0. Default 1. */
  scale?: number;
  /** Start with breeze sway enabled. Default true. */
  sway?: boolean;
  /** Add the dark soil contact patch under the roots. Default true. */
  soilPatch?: boolean;
  /** Enable cast/receive shadows. Default true. */
  shadows?: boolean;
};

export type OakTree = {
  /** Root object. Origin = trunk base centre at ground (y = 0). Position/rotate/scale this. */
  group: THREE.Group;
  /** Pivot at the crown base (y ≈ 2.6); rotate for sway or as part of a felling animation. */
  crown: THREE.Group;
  /** Approx. world-unit dimensions at scale 1 (for colliders / chop logic). */
  bounds: { height: number; trunkRadius: number; crownRadius: number };
  setSway(on: boolean): void;
  /** Call once per frame with delta seconds. Cheap: 2 rotations, no allocations. */
  update(dt: number): void;
  /** Frees per-tree geometry only (shared assets are kept). */
  dispose(): void;
};

const CROWN_PIVOT_Y = 2.6;

/** Create a stylized thick-trunk oak. Draw calls per tree: 5 (trunk, branches, inner blobs, leaves, soil). */
export function createOakTree(opts: OakTreeOptions = {}): OakTree {
  const { seed = 1337, scale = 1, sway: swayInit = true, soilPatch = true, shadows = true } = opts;
  const A = getOakAssets();
  const layout = buildOakLayout(seed);

  const group = new THREE.Group();
  group.name = "OakTree";
  group.scale.setScalar(scale);

  const mesh = <T extends THREE.Mesh>(g: T): T => { g.castShadow = shadows; g.receiveShadow = shadows; return g; };
  const trunk = mesh(new THREE.Mesh(A.trunkGeo, A.trunkMat));
  trunk.name = "trunk";
  group.add(trunk);

  if (soilPatch) {
    const soil = new THREE.Mesh(A.soilGeo, A.soilMat);
    soil.position.y = 0.012; soil.renderOrder = 1; soil.name = "soil";
    group.add(soil);
  }

  const crown = new THREE.Group();
  crown.name = "crown";
  crown.position.y = CROWN_PIVOT_Y;
  const inner = new THREE.Group();
  inner.position.y = -CROWN_PIVOT_Y;
  crown.add(inner);
  group.add(crown);

  inner.add(mesh(new THREE.Mesh(layout.branchGeo, A.barkMat)));

  const blobs = mesh(new THREE.InstancedMesh(A.blobGeo, A.innerMat, layout.clusters.length));
  const m = new THREE.Matrix4();
  layout.clusters.forEach((c, i) => { m.makeScale(c.r * 0.5, c.r * 0.45, c.r * 0.5).setPosition(c.pos); blobs.setMatrixAt(i, m); });
  inner.add(blobs);

  const leaves = mesh(new THREE.InstancedMesh(A.leafGeo, A.leafMat, layout.leaves.length));
  layout.leaves.forEach((l, i) => { leaves.setMatrixAt(i, l.m); leaves.setColorAt(i, l.c); });
  inner.add(leaves);
  blobs.computeBoundingSphere(); leaves.computeBoundingSphere();

  let sway = swayInit, amp = swayInit ? 1 : 0, t = seed * 0.37; // phase offset per tree
  return {
    group, crown,
    bounds: { height: 7.6, trunkRadius: 0.6, crownRadius: 3.2 },
    setSway(on) { sway = on; },
    update(dt) {
      const d = Math.min(dt, 0.05);
      if (sway) t += d;
      amp = THREE.MathUtils.damp(amp, sway ? 1 : 0, 2, d);
      crown.rotation.z = amp * (Math.sin(t * 1.1) * 0.016 + Math.sin(t * 2.9) * 0.005);
      crown.rotation.x = amp * Math.sin(t * 0.8 + 1) * 0.011;
    },
    dispose() { layout.branchGeo.dispose(); blobs.dispose(); leaves.dispose(); group.removeFromParent(); },
  };
}
