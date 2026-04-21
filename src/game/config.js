export const PLAYER_HEIGHT = 1.65;
export const PLAYER_START = { x: 0, y: PLAYER_HEIGHT, z: 15 };
export const ARENA_HALF_EXTENT = 22;
export const MOVE_SPEED = 10;
export const MOUSE_SENSITIVITY = 0.11;
export const MAX_PITCH = 78;
export const FIRE_COOLDOWN = 0.18;
export const TARGET_COUNT = 6;
export const TARGET_RESPAWN_DELAY = 1.1;
export const TARGET_RADIUS = 0.82;

export const COVER_LAYOUT = [
  { position: [-10, 1.4, -7], scale: [3, 2.8, 1.5] },
  { position: [10, 1.4, -7], scale: [3, 2.8, 1.5] },
  { position: [-6, 1.1, 4], scale: [2.6, 2.2, 2.6] },
  { position: [6, 1.1, 4], scale: [2.6, 2.2, 2.6] },
  { position: [0, 1.7, -13], scale: [4.4, 3.4, 2.2] }
];

export const TARGET_SPAWN_POINTS = [
  { x: -15, y: 2.8, z: -16 },
  { x: -7, y: 3.1, z: -11 },
  { x: 0, y: 3.5, z: -18 },
  { x: 7, y: 2.7, z: -11 },
  { x: 15, y: 3.1, z: -16 },
  { x: -13, y: 2.5, z: 2 },
  { x: 13, y: 2.5, z: 2 },
  { x: 0, y: 4.2, z: -4 }
];
