# Greenfire Range

Greenfire Range is a compact playable 3D first-person shooter vertical slice built with PlayCanvas, TypeScript, npm, and Vite. The slice focuses on scenic outdoor atmosphere and polished first-person pistol handling over content sprawl.

## Features

- Hilly meadow environment with a dirt path, scattered rocks, trees, wildflowers, a broken stone ruin, and a fence line
- First-person controller with mouse look, walk, jog, sprint, jump, gravity, terrain following, and solid collision against world props
- Procedural Glock-style pistol viewmodel with:
  - idle, walk, jog, sprint, and airborne poses
  - fire, reload, empty reload, press-check, and dry fire actions
  - head bob, sprint low-ready pose, landing dip, and light recoil/camera kick
- Endless drone waves with patrol, aggro, chase-orbit, and shooting behavior
- Ammo and health pickups that occasionally drop from destroyed drones
- HUD with health, target count, ammo, and state feedback
- Survival loop with restart flow after being overrun
- Procedural audio for gunshots, reloads, dry fire, footsteps, enemy shots, damage feedback, and ambient meadow wind/birds

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

## Important Path Note

Vite has trouble when the project lives in a folder path containing `#` characters. This repository currently does, so `npm run build` uses a safe wrapper script that copies the project to a temporary clean path, runs the normal Vite build there, and copies the final `dist/` output back.

For day-to-day development, the cleanest option is still to clone or move the project into a path without `#` characters before running `npm run dev`.

The repo root `index.html` is a redirect shim. The actual Vite app entry lives at `play.html`, which keeps the source app and a committed `dist/` deployment side by side.

## Controls

- `WASD` or arrow keys: move
- `Ctrl`: walk
- `Shift`: sprint
- `Space`: jump
- `Right mouse`: focused aim / walk-only ADS
- `Mouse`: look / fire
- `R`: reload
- `V`: press-check
- `Esc`: release cursor
- `R` on win/lose screen: restart mission

## Project Structure

```text
public/
  CNAME
scripts/
  build-safe.mjs
src/
  app/
    config.ts
    Game.ts
  core/
    math.ts
  engine/
    audio.ts
    input.ts
  gameplay/
    enemy.ts
    pickup.ts
  player/
    controller.ts
    weapon.ts
  ui/
    hud.ts
  world/
    collision.ts
    environment.ts
    terrain.ts
  main.ts
  styles.css
ASSETS.md
index.html
play.html
package.json
tsconfig.json
vite.config.ts
```

## Tuning

Core gameplay tuning lives in [src/app/config.ts](./src/app/config.ts). Movement speeds, mouse sensitivity, jump tuning, pistol timings, enemy aggression, and map spawn data are all concentrated there to keep the slice easy to iterate.

## Verification

- `npm run build`

The build was verified successfully from this repository using the safe build wrapper for the current workspace path.
