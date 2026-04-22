# Old Town Tactical

`Old Town Tactical` is a PlayCanvas standalone + TypeScript + Vite first-person shooter vertical slice set in a late-afternoon European old town. It ships as a complete timed combat-course slice with a modular codebase, a custom first-person controller, a tactical pistol handling system, reactive steel targets, HUD flow, pause/options, procedural audio, and a fully playable restart loop.

## Stack

- PlayCanvas standalone
- TypeScript
- Vite
- npm

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Build a production bundle:

   ```bash
   npm run build
   ```

   The production site is emitted to `site/`.

4. Preview the production build:

   ```bash
   npm run preview
   ```

5. Optional type check:

   ```bash
   npm run typecheck
   ```

The Vite config is set to emit relative asset URLs so the production build works both locally and on repo-hosted GitHub Pages URLs such as `/game/`.
The repo root [index.html](./index.html) redirects to [app.html](./app.html) for local development and to the committed `site/` build for branch-hosted GitHub Pages deployments.

## GitHub Pages

The repository includes [/.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml) so pushes to `main` build the Vite app and deploy the generated `site/` bundle to GitHub Pages. If the repository Pages settings are still pointing at `main` branch files, the root redirect will forward visitors to the committed production build in `site/`.

## Controls

- `WASD`: move
- `Left Shift`: sprint
- `Left Alt`: slow walk
- `Space`: jump
- `Mouse`: look
- `Left Click`: fire
- `R`: reload
- `T`: press-check
- `Esc`: pause / resume
- `R` on end screen: restart

## What Is In The Slice

- One authored old-town combat district with:
  - plaza
  - fountain
  - archways
  - alleys
  - stairs
  - a raised terrace
  - balconies
  - lamps
  - cover props
- Responsive first-person movement with:
  - walk / jog / sprint
  - jump + gravity
  - stair stepping
  - custom collision against the authored level
  - head bob and landing settle
- Tactical sidearm handling with:
  - semi-auto fire
  - magazine + reserve ammo
  - tactical reload
  - empty reload
  - press-check
  - dry fire
  - slide-lock behavior
  - recoil, muzzle flash, ejected casing, and impact FX
- Reactive steel targets placed through the district
- Timed game loop with win / fail / restart
- Clean HUD, pause menu, sensitivity slider, and volume slider
- Procedural in-project audio for weapon handling, footsteps, impacts, and ambient town mood

## Project Structure

- `src/core`: config, math helpers, input, primitive helpers
- `src/game`: top-level game orchestration
- `src/player`: first-person controller and camera feel
- `src/weapons`: pistol logic and procedural animation/viewmodel
- `src/targets`: reactive combat targets
- `src/ui`: HUD and overlay flow
- `src/audio`: procedural audio manager
- `src/level`: materials, collision world, town builder
- `src/fx`: impact and casing effects
- `src/assets`: replacement hooks for future real assets
- `assets`: reserved folders for swappable external textures, models, and audio
- `docs`: asset provenance and replacement notes

## Tuning Notes

The main values you will want to tweak live in [src/core/config.ts](./src/core/config.ts):

- `PLAYER_CONFIG`
- `CAMERA_CONFIG`
- `PISTOL_CONFIG`
- `GAME_CONFIG`

The authored town layout and target placements live in [src/level/town-builder.ts](./src/level/town-builder.ts).

## Asset Provenance

This build intentionally ships without third-party binary art/audio assets so it always runs from a clean checkout. Visual materials, the Glock-style sidearm silhouette, target meshes, and audio cues are generated procedurally in code and documented in [docs/ASSET_MANIFEST.md](./docs/ASSET_MANIFEST.md).

Replacement slots for future permissively licensed assets are documented in [src/assets/asset-slots.ts](./src/assets/asset-slots.ts) and mirrored by the reserved `assets/` folders.

## Known Simplifications

- Enemies are represented by a polished steel-target combat course instead of AI NPCs.
- The pistol is a clean procedural Glock-style sidearm rather than a scanned model.
- Audio is synthesized in-project rather than sourced from recorded weapon libraries.

Those tradeoffs were chosen to keep the vertical slice complete, playable, and self-contained while preserving the architecture needed to swap in higher-end assets later.
