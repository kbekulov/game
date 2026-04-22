export interface RuntimeSettings {
  mouseSensitivity: number;
}

export interface PlayerSpawn {
  x: number;
  z: number;
  yaw: number;
}

export interface EnemySpawn {
  x: number;
  z: number;
  patrolAxis: "x" | "z";
  patrolAmplitude: number;
  phase: number;
}

export const STORAGE_KEYS = {
  settings: "townline-baseline-settings"
};

export const DEFAULT_SETTINGS: RuntimeSettings = {
  mouseSensitivity: 1
};

export const PLAYER_CONFIG = {
  radius: 0.55,
  moveSpeed: 5.2,
  sprintSpeed: 7.8,
  acceleration: 18,
  deceleration: 16,
  mouseSensitivity: 0.09,
  rotationSmoothing: 14,
  health: 100
};

export const CAMERA_CONFIG = {
  distance: 6.5,
  minDistance: 2.4,
  focusHeight: 1.6,
  pitchMin: -52,
  pitchMax: 12
};

export const WEAPON_CONFIG = {
  magazineSize: 24,
  reserveAmmo: 144,
  damage: 34,
  range: 120,
  fireInterval: 0.11,
  reloadDuration: 1.2,
  muzzleFlashDuration: 0.05
};

export const ENEMY_CONFIG = {
  health: 100,
  damage: 8,
  fireInterval: 1.3,
  range: 24
};
