# Townline Baseline

`Townline Baseline` is a very simple PlayCanvas standalone third-person shooter starter built with TypeScript and Vite. It is intentionally lightweight: one arena, one player controller, one rifle baseline, a few enemy dummies, a HUD, and a clean restart loop.

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

3. Build the production bundle:

   ```bash
   npm run build
   ```

4. Optional type check:

   ```bash
   npm run typecheck
   ```

## Controls

- `WASD`: move
- `Mouse`: orbit camera / aim
- `Left Click`: fire
- `R`: reload
- `Left Shift`: sprint
- `Esc`: pause / resume
- `R` on end screen: restart

## Baseline Features

- Third-person follow camera with pointer lock
- Flat arena with walls and cover blocks
- Responsive movement and sprint
- Simple rifle baseline with magazine ammo and reload
- Basic enemy dummies that patrol and shoot back
- Health, ammo, enemy-count HUD
- Intro, pause, win, lose, and restart flow
- GitHub Pages workflow for easy deployment

## Project Structure

- `src/core`: config, input, math, primitive helpers
- `src/game`: main game orchestration
- `src/player`: third-person player controller
- `src/weapons`: simple rifle handling
- `src/enemies`: enemy dummy logic
- `src/level`: arena build and collision helpers
- `src/ui`: HUD and overlays
- `public`: static assets copied into the build
- `.github/workflows`: GitHub Pages deploy workflow

## Tuning Notes

The main knobs live in [src/core/config.ts](/Users/kirilbekulov/Library/CloudStorage/OneDrive-Personal/Documents/# IMPORTANT/# GITHUB/game/src/core/config.ts).

The arena layout and spawn points live in [src/level/arena-builder.ts](/Users/kirilbekulov/Library/CloudStorage/OneDrive-Personal/Documents/# IMPORTANT/# GITHUB/game/src/level/arena-builder.ts).

## Deployment

The repo includes a GitHub Pages workflow at [/.github/workflows/deploy-pages.yml](/Users/kirilbekulov/Library/CloudStorage/OneDrive-Personal/Documents/# IMPORTANT/# GITHUB/game/.github/workflows/deploy-pages.yml). Pushes to `main` build the app and deploy the generated `dist/` bundle.
