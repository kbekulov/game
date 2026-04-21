# Whisper Grove

Atmospheric PlayCanvas starter for a browser-based first-person horror shooter.

## What is here

- A standalone PlayCanvas setup that runs without a local build step
- A full-screen 3D viewport with a DOM HUD layered on top
- First-person movement with pointer lock, sprinting, jumping, mouse look, and subtle step-driven camera/viewmodel motion
- A much larger early-dusk forest with a wider trail network, denser modeled tree cover, fog, lantern light, and layered sky/ground detail
- A simple first-person hand-and-gun viewmodel so exploration no longer feels completely disembodied
- A structure we can keep extending into weapons, enemies, audio, objectives, and survival systems

## Run it locally

From the repo root, start a static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Controls

- `W`, `A`, `S`, `D`: move
- `Shift`: sprint
- `Space`: jump
- Mouse: look
- Click viewport: enter pointer lock
- `Esc`: release the pointer lock

## Tech note

This starter uses the PlayCanvas engine via a pinned ES module import in `index.html`. The pinned version is `2.18.0`, matching the latest PlayCanvas Engine GitHub release I verified on April 21, 2026.
