# Wildwood Tree Preview

Create a clean, high-craft single-file or TypeScript Three.js 3D preview of a thick-trunked Free Fire-style stylized forest tree for a landscape survival game prototype.

Visual Style & Proportions:

- Free Fire-inspired stylized aesthetic: crisp, vibrant, and readable silhouette with clean shading—not overly chaotic or ultra-heavy realistic foliage, yet rich and well-detailed rather than plain spheres or flat blocks.

- Thick, sturdy trunk: Make the main trunk noticeably thick and strong with natural organic taper, subtle root flare gripping the ground at y = 0, and clean bark texture/shading variation so it clearly reads as a substantial, heavy tree (fitting future size-based wood/chopping mechanics).

- Controlled branching: Primary and secondary branches should spread naturally and stay well-integrated inside or right beneath the foliage canopy—never poking out awkwardly like sharp sticks or spikes beyond the leaf silhouette.

- Detailed foliage clusters: Build the canopy out of layered, multi-part stylized leaf clusters and individual/grouped leaf cards or sculpted clusters with natural color variation (rich mid-green base, deeper inner green for depth, and soft sunlit green highlights on top).

Performance & Viewer Controls:

- Reuse geometries and materials cleanly and keep triangle/draw-call counts well-optimized for smooth performance on a 4GB RAM mobile target.

- Include orbit/zoom camera controls, soft directional lighting with ground shadows, and a subtle breeze/sway toggle so I can inspect the thick trunk, detailed leaves, and overall silhouette closely.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e236fb2-7c59-49fe-a52c-b82cd0b41784).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
