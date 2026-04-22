export type SurfaceType = "stone" | "wood" | "metal" | "plaster" | "tile" | "water";

export interface RuntimeSettings {
  mouseSensitivity: number;
  masterVolume: number;
}

export interface PlayerSpawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export const STORAGE_KEYS = {
  settings: "old-town-tactical-settings"
};

export const DEFAULT_SETTINGS: RuntimeSettings = {
  mouseSensitivity: 1,
  masterVolume: 0.8
};

export const GAME_CONFIG = {
  courseTimeSeconds: 95,
  interactionDistance: 120,
  restartDelaySeconds: 0.3
};

export const PLAYER_CONFIG = {
  radius: 0.34,
  height: 1.72,
  eyeHeight: 1.58,
  walkSpeed: 2.3,
  jogSpeed: 4.7,
  sprintSpeed: 7.1,
  acceleration: 34,
  deceleration: 22,
  airAcceleration: 7.5,
  airDrag: 1.5,
  gravity: 22,
  jumpVelocity: 7.25,
  stepHeight: 0.48,
  maxSnapDown: 0.55,
  fallRecoveryY: -6,
  maxPitch: 84,
  mouseSensitivity: 0.085
};

export const CAMERA_CONFIG = {
  fov: 67,
  nearClip: 0.03,
  farClip: 220,
  bobFrequency: 8.3,
  sprintBobFrequency: 10.4,
  bobAmountX: 0.016,
  bobAmountY: 0.03,
  bobRoll: 1.3,
  swayPosition: 0.00075,
  swayRotation: 0.16,
  landingKick: 0.055,
  landingRoll: 0.8,
  landingRecover: 11,
  jumpPoseDrop: 0.04
};

export const PISTOL_CONFIG = {
  magazineSize: 17,
  reserveAmmo: 68,
  fireInterval: 0.14,
  recoilPositionKick: 0.08,
  recoilRotationKick: 5.8,
  recoilYawKick: 1.05,
  recoilReturn: 16,
  muzzleFlashSeconds: 0.045,
  tacticalReloadDuration: 1.32,
  emptyReloadDuration: 1.68,
  pressCheckDuration: 0.94,
  dryFireDuration: 0.24,
  hitMarkerDuration: 0.08,
  chamberCheckMessageDuration: 1.2
};

export const UI_CONFIG = {
  startTitle: "Old Town Tactical",
  objectiveText: "Clear every steel target in the district before time expires.",
  controlHints:
    "WASD move, Left Shift sprint, Left Alt walk, Space jump, Click fire, R reload, T press-check, Esc pause."
};
