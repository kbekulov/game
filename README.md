# Orbital Range

Basic PlayCanvas starter for a browser-based first-person 3D shooter.

## What is here

- A standalone PlayCanvas setup that runs without a local build step
- A full-screen 3D viewport with a DOM HUD layered on top
- First-person movement with pointer lock, mouse look, and hitscan shooting
- A simple training arena with floating targets that respawn
- A structure we can keep extending into weapons, enemies, pickups, audio, and maps

## Run it locally

From the repo root, start a static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Controls

- `W`, `A`, `S`, `D`: move
- Mouse: look
- Left click: shoot
- `Esc`: release the pointer lock

## Tech note

This starter uses the PlayCanvas engine via a pinned ES module import in `index.html`. The pinned version is `2.18.0`, matching the latest PlayCanvas Engine GitHub release I verified on April 21, 2026.
