export const GAME_CONFIG = {
  world: {
    terrainSize: 72,
    terrainResolution: 112,
    fogStart: 42,
    fogEnd: 98,
    objectiveText: "Clear the meadow drones and survive the patrol.",
    playerSpawn: { x: -27.5, z: 21.5 },
    enemySpawns: [
      { x: 14, z: 15 },
      { x: 9, z: -18 },
      { x: -17, z: -11 },
      { x: 1, z: 10 }
    ]
  },
  player: {
    eyeHeight: 1.62,
    radius: 0.42,
    collisionHeight: 1.82,
    walkSpeed: 3.15,
    jogSpeed: 5.4,
    sprintSpeed: 8.4,
    groundAcceleration: 24,
    airAcceleration: 8.5,
    jumpSpeed: 7.9,
    gravity: 20.5,
    mouseSensitivity: 0.095,
    health: 100,
    maxLookPitch: 83,
    headBob: {
      walkAmplitude: 0.018,
      jogAmplitude: 0.032,
      sprintAmplitude: 0.055,
      walkSpeed: 6.4,
      jogSpeed: 8.9,
      sprintSpeed: 11.8
    },
    landingScale: 0.025,
    recoilRecovery: 14,
    cameraRoll: 2.1
  },
  weapon: {
    magazineSize: 17,
    reserveAmmo: 68,
    range: 72,
    damage: 1,
    fireInterval: 0.12,
    reloadDuration: 1.48,
    emptyReloadDuration: 1.92,
    pressCheckDuration: 0.9,
    dryFireDuration: 0.18,
    recoilPitch: 1.4,
    recoilYaw: 0.5
  },
  enemies: {
    health: 3,
    hoverHeight: 2.6,
    patrolRadius: 2.6,
    detectionRange: 30,
    fireRange: 22,
    moveSpeed: 5.2,
    strafeSpeed: 2.2,
    shotDamage: 9,
    shotIntervalMin: 1.1,
    shotIntervalMax: 1.7
  }
} as const;

export type MovementState = "idle" | "walk" | "jog" | "sprint" | "airborne";
