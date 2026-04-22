export interface AssetSlot {
  id: string;
  expectedPath: string;
  description: string;
  notes: string;
}

export const ASSET_SLOTS: AssetSlot[] = [
  {
    id: "weapon_viewmodel",
    expectedPath: "assets/models/weapons/pistol_view.glb",
    description: "First-person Glock-style sidearm with separate slide and magazine pieces.",
    notes: "Keep pivot at weapon root and preserve distinct slide / magazine nodes for current animation logic."
  },
  {
    id: "weapon_arms",
    expectedPath: "assets/models/weapons/arms_view.glb",
    description: "First-person gloved arms for the pistol handling rig.",
    notes: "Should line up with the current weapon root and support procedural reload / press-check offsets."
  },
  {
    id: "town_textures",
    expectedPath: "assets/textures/town/",
    description: "Cobblestone, stucco, tile roof, stone trim, wood, and iron surface set.",
    notes: "Can replace the procedural material generator without changing level geometry."
  },
  {
    id: "weapon_audio",
    expectedPath: "assets/audio/weapons/pistol/",
    description: "Recorded or designed pistol shot and foley set.",
    notes: "Current WebAudio synthesis can be replaced by file-backed cues in the audio manager."
  },
  {
    id: "ambient_audio",
    expectedPath: "assets/audio/ambience/",
    description: "Old-town ambience beds and one-shots.",
    notes: "Wind, birds, distant bells, and civic texture should remain subtle."
  }
];
