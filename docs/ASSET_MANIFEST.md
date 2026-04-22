# Asset Manifest

## Bundled Asset Strategy

This vertical slice currently uses no third-party bundled binary assets. The playable build is self-contained and all shipped content falls into one of these categories:

- Procedural materials generated at runtime in [src/level/materials.ts](../src/level/materials.ts)
- Procedural first-person pistol and hand geometry generated in [src/weapons/pistol-view.ts](../src/weapons/pistol-view.ts)
- Procedural FX geometry generated in [src/fx/effects-system.ts](../src/fx/effects-system.ts)
- Procedural synthesized audio in [src/audio/audio-manager.ts](../src/audio/audio-manager.ts)

This means there are currently no external bundled licenses required for the running project.

## Reserved Replacement Slots

The following asset slots are intentionally left open and documented so higher-fidelity permissive assets can be dropped in later without changing the overall architecture:

| Slot | Expected Path | Current State | Notes |
| --- | --- | --- | --- |
| First-person sidearm viewmodel | `assets/models/weapons/pistol_view.glb` | Procedural placeholder | Separate slide and magazine parts recommended |
| First-person hands / arms | `assets/models/weapons/arms_view.glb` | Procedural placeholder | Should align with the viewmodel rig root |
| Environment texture set | `assets/textures/town/*` | Procedural materials | Cobble, stucco, roof tile, wood, iron, trim |
| Ambient loop / city bed | `assets/audio/ambience/*` | Procedural placeholder | Wind, birds, distant civic bells |
| Weapon Foley | `assets/audio/weapons/pistol/*` | Procedural placeholder | Shot, dry fire, mag out, mag in, slide rack |
| Impact sprites / decals | `assets/textures/fx/*` | Procedural placeholder | Optional muzzle flash, dust, spark atlases |

## Recommended External Sources For Future Swaps

These were the intended categories from the project plan if higher-fidelity art/audio is added later:

- CC0 or similarly permissive texture libraries for old-town surfaces
- CC0 or clearly permissive glTF props for lamps, shutters, fountain details, and market clutter
- A clearly licensed Glock-style or generic polymer-framed pistol model without trademarked branding
- CC0 or permissively licensed urban ambience / foley packs

Any future asset import should be documented here with:

- asset name
- source URL
- license
- local path
- any required attribution text
