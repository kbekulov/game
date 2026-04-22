# Asset And License Notes

## Runtime Assets

This project ships without third-party art or audio packs.

- Environment geometry: generated procedurally in TypeScript using PlayCanvas primitive meshes and a custom terrain mesh
- Weapon viewmodel: generated procedurally in TypeScript from PlayCanvas primitives
- Enemy drones: generated procedurally in TypeScript from PlayCanvas primitives and a torus mesh
- HUD: authored locally in HTML and CSS
- Audio: synthesized at runtime with the Web Audio API

Because all runtime art/audio content is authored directly in the project, there are no external asset-license obligations for models, textures, sound effects, or ambience.

## Dependency Licenses

- `playcanvas` - MIT
- `vite` - MIT
- `typescript` - Apache-2.0
- `@rollup/wasm-node` - MIT

## Notes

- `public/CNAME` preserves the existing custom domain setup.
- `scripts/build-safe.mjs` exists to work around Vite path-resolution problems in folder names containing `#`.
