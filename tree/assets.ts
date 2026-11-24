import * as THREE from "three";
import { barkTexture, leafTexture, soilTexture } from "./textures";
import { lumpyBlob, trunkGeometry } from "./geometry";

export type OakAssets = ReturnType<typeof makeAssets>;

function makeAssets() {
  const bark = barkTexture();
  const barkProps = { map: bark.map, normalMap: bark.normal, roughnessMap: bark.rough, roughness: 1, color: "#d8b898" };
  return {
    trunkGeo: trunkGeometry(),
    leafGeo: new THREE.PlaneGeometry(1, 1),
    blobGeo: lumpyBlob(),
    soilGeo: new THREE.CircleGeometry(2.4, 32).rotateX(-Math.PI / 2),
    barkMat: new THREE.MeshStandardMaterial({ ...barkProps, normalScale: new THREE.Vector2(1.2, 1.2) }),
    trunkMat: new THREE.MeshStandardMaterial({ ...barkProps, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true }),
    leafMat: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }),
    innerMat: new THREE.MeshStandardMaterial({ color: "#2a5a24", roughness: 1 }),
    soilMat: new THREE.MeshBasicMaterial({ map: soilTexture(), transparent: true, depthWrite: false }),
  };
}

let shared: OakAssets | null = null;

/** Shared GPU resources for ALL oak trees (created lazily, once). */
export const getOakAssets = (): OakAssets => (shared ??= makeAssets());

/** Free shared resources (e.g. on level unload). Only call when no oak trees remain. */
export function disposeOakAssets() {
  if (!shared) return;
  for (const v of Object.values(shared)) {
    if (v instanceof THREE.Material) {
      for (const t of [(v as THREE.MeshStandardMaterial).map, (v as THREE.MeshStandardMaterial).normalMap, (v as THREE.MeshStandardMaterial).roughnessMap]) t?.dispose();
    }
    v.dispose();
  }
  shared = null;
}
