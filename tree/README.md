# Oak · Hardwood — procedural tree module

Pure TypeScript + Three.js (`three` is the only dependency, no React). Generates textures on a canvas at runtime, so there are no image files. Browser only (uses `document`).

Copy this folder to `models/environment/trees/oak/`.

## Usage
```ts
import { createOakTree } from "./models/environment/trees/oak";

const oak = createOakTree({ seed: 42, scale: 1.1 });
oak.group.position.set(x, groundY, z); // base sits at y = 0
scene.add(oak.group);

// in your render loop
oak.update(delta);
```
React Three Fiber: `<primitive object={oak.group} />` and call `oak.update(delta)` in `useFrame`.

## Structure
| File | Role |
| --- | --- |
| `index.ts` | Public entry |
| `oakTree.ts` | `createOakTree()` → `{ group, crown, bounds, update, setSway, dispose }` |
| `layout.ts` | Seeded branches, roots, clusters, leaf transforms |
| `geometry.ts` | Trunk lathe, tapered tubes, merge, foliage blob |
| `textures.ts` | Bark (colour, normal, roughness), leaf clump, soil patch |
| `assets.ts` | Shared materials/geometries for all trees (`getOakAssets`, `disposeOakAssets`) |
| `rng.ts` | Seeded RNG |

## Game notes
- **Origin** is the trunk base centre at the ground, y = 0. Roots sink slightly below 0 so they look embedded.
- **Chopping/felling:** rotate `oak.group` about a pivot at the base, or animate `oak.crown` separately. `bounds` gives sizes for colliders (trunk cylinder r≈0.6, h≈4.4).
- **Performance:** 5 draw calls per tree, about 25k triangles. Materials and textures are shared by every tree. For large forests, use different seeds near the camera and share one layout far away.
- `dispose()` frees only that tree's own geometry. Call `disposeOakAssets()` when you unload the whole level.
