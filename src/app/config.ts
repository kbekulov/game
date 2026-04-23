export const GAME_CONFIG = {
  world: {
    objectiveText: "Hold the office tower, clear each floor, and use the elevator to reposition.",
    building: {
      floorCount: 10,
      floorHeight: 4.35,
      halfWidth: 18,
      halfDepth: 18,
      wallThickness: 0.32,
      slabThickness: 0.26,
      shaftHalfSize: 3.35,
      elevatorHalfSize: 2.05,
      elevatorSpeed: 3.4,
      lobbyDepth: 8.8,
      officeInset: 2.2,
      deskHeight: 0.82,
      playerSpawnFloor: 0
    }
  },
  waves: {
    startCount: 4,
    countGrowth: 1,
    maxCount: 10,
    intermission: 2.8,
    minPlayerDistance: 14
  },
  player: {
    fov: 74,
    aimFov: 56,
    aimSensitivityMultiplier: 0.72,
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
    cameraRoll: 2.1,
    aimMoveSpeedMultiplier: 1
  },
  weapon: {
    magazineSize: 17,
    reserveAmmo: 68,
    range: 72,
    damage: 1,
    fireInterval: 0.12,
    maxReserveAmmo: 170,
    reloadDuration: 1.48,
    emptyReloadDuration: 1.92,
    pressCheckDuration: 0.9,
    dryFireDuration: 0.18,
    recoilPitch: 1.4,
    recoilYaw: 0.5
  },
  pickups: {
    ammoAmount: 17,
    healthAmount: 28,
    dropChance: 0.34,
    healthChance: 0.4,
    pickupRadius: 1.2,
    lifetime: 18
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
