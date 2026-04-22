import * as pc from "playcanvas";

import {
  CAMERA_CONFIG,
  PLAYER_CONFIG,
  type PlayerSpawn,
  type RuntimeSettings,
  type SurfaceType
} from "@/core/config.ts";
import { clamp, damp, lerp } from "@/core/math.ts";
import { InputManager, type LookDelta } from "@/core/input.ts";
import { CollisionWorld } from "@/level/collision-world.ts";

export interface MovementEvents {
  footstepSurface: SurfaceType | null;
  jumpTriggered: boolean;
  landingIntensity: number;
}

export interface MovementSnapshot {
  isMoving: boolean;
  isWalking: boolean;
  isSprinting: boolean;
  isAirborne: boolean;
  speedAlpha: number;
  bobX: number;
  bobY: number;
  bobRoll: number;
  lookDelta: LookDelta;
  landingOffset: number;
}

export class PlayerController {
  readonly root = new pc.Entity("player-root");
  readonly pitchPivot = new pc.Entity("player-pitch");
  readonly camera = new pc.Entity("player-camera");
  readonly weaponAnchor = new pc.Entity("weapon-anchor");

  private readonly position = new pc.Vec3();
  private readonly velocity = new pc.Vec3();
  private yaw = 0;
  private pitch = 0;
  private onGround = false;
  private currentSurface: SurfaceType = "stone";
  private bobCycle = 0;
  private bobStrength = 0;
  private landingOffset = 0;
  private pendingEvents: MovementEvents = {
    footstepSurface: null,
    jumpTriggered: false,
    landingIntensity: 0
  };
  private footstepPhase = 0;
  private lookDelta: LookDelta = { x: 0, y: 0 };

  constructor(private readonly app: pc.Application, private readonly world: CollisionWorld) {
    this.app.root.addChild(this.root);
    this.root.addChild(this.pitchPivot);
    this.pitchPivot.addChild(this.camera);
    this.camera.addChild(this.weaponAnchor);

    this.camera.addComponent("camera", {
      clearColor: new pc.Color(0.81, 0.73, 0.65),
      farClip: CAMERA_CONFIG.farClip,
      nearClip: CAMERA_CONFIG.nearClip,
      fov: CAMERA_CONFIG.fov
    });

    const cameraComponent = this.camera.camera;
    if (cameraComponent) {
      cameraComponent.toneMapping = pc.TONEMAP_ACES;
    }
  }

  reset(spawn: PlayerSpawn): void {
    this.position.set(spawn.x, spawn.y, spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = spawn.yaw;
    this.pitch = 0;
    this.onGround = false;
    this.currentSurface = "stone";
    this.bobCycle = 0;
    this.bobStrength = 0;
    this.landingOffset = 0;
    this.pendingEvents = {
      footstepSurface: null,
      jumpTriggered: false,
      landingIntensity: 0
    };

    const ground = this.world.findGround(
      this.position.x,
      this.position.z,
      this.position.y + PLAYER_CONFIG.stepHeight + 1,
      PLAYER_CONFIG.radius,
      PLAYER_CONFIG.height + PLAYER_CONFIG.stepHeight + 2
    );

    if (ground) {
      this.position.y = ground.height;
      this.onGround = true;
      this.currentSurface = ground.surface;
    }

    this.applyTransforms();
  }

  update(dt: number, input: InputManager, settings: RuntimeSettings, active = true): MovementSnapshot {
    this.pendingEvents = {
      footstepSurface: null,
      jumpTriggered: false,
      landingIntensity: 0
    };

    const lookDelta = active ? input.consumeLookDelta() : { x: 0, y: 0 };
    this.lookDelta = lookDelta;
    const sensitivity = PLAYER_CONFIG.mouseSensitivity * settings.mouseSensitivity;
    if (active) {
      this.yaw -= lookDelta.x * sensitivity;
      this.pitch = clamp(this.pitch - lookDelta.y * sensitivity, -PLAYER_CONFIG.maxPitch, PLAYER_CONFIG.maxPitch);
    }

    const forwardInput = active ? (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0) : 0;
    const strafeInput = active ? (input.isDown("KeyD") ? 1 : 0) - (input.isDown("KeyA") ? 1 : 0) : 0;
    const hasMoveInput = forwardInput !== 0 || strafeInput !== 0;

    let moveSpeed = PLAYER_CONFIG.jogSpeed;
    const isWalking = input.isDown("AltLeft") || input.isDown("AltRight");
    const isSprinting =
      (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) &&
      forwardInput > 0 &&
      !isWalking &&
      hasMoveInput;

    if (isWalking) {
      moveSpeed = PLAYER_CONFIG.walkSpeed;
    } else if (isSprinting) {
      moveSpeed = PLAYER_CONFIG.sprintSpeed;
    }

    const yawRadians = this.yaw * pc.math.DEG_TO_RAD;
    const forwardX = Math.sin(yawRadians);
    const forwardZ = Math.cos(yawRadians);
    const rightX = Math.cos(yawRadians);
    const rightZ = -Math.sin(yawRadians);

    let moveX = forwardX * forwardInput + rightX * strafeInput;
    let moveZ = forwardZ * forwardInput + rightZ * strafeInput;
    const moveLength = Math.hypot(moveX, moveZ);

    if (moveLength > 0.0001) {
      moveX /= moveLength;
      moveZ /= moveLength;
    }

    const targetVelocityX = moveX * moveSpeed;
    const targetVelocityZ = moveZ * moveSpeed;
    const acceleration = this.onGround ? PLAYER_CONFIG.acceleration : PLAYER_CONFIG.airAcceleration;
    const damping = this.onGround ? PLAYER_CONFIG.deceleration : PLAYER_CONFIG.airDrag;

    if (hasMoveInput) {
      this.velocity.x = damp(this.velocity.x, targetVelocityX, acceleration, dt);
      this.velocity.z = damp(this.velocity.z, targetVelocityZ, acceleration, dt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, damping, dt);
      this.velocity.z = damp(this.velocity.z, 0, damping, dt);
    }

    const wasGrounded = this.onGround;

    if (active && input.wasPressed("Space") && this.onGround) {
      this.velocity.y = PLAYER_CONFIG.jumpVelocity;
      this.onGround = false;
      this.pendingEvents.jumpTriggered = true;
    }

    if (active) {
      this.velocity.y -= PLAYER_CONFIG.gravity * dt;
    } else {
      this.velocity.x = damp(this.velocity.x, 0, 12, dt);
      this.velocity.z = damp(this.velocity.z, 0, 12, dt);
    }

    if (active) {
      this.moveHorizontal("x", this.velocity.x * dt);
      this.moveHorizontal("z", this.velocity.z * dt);
      this.moveVertical(dt);
    }

    const ground = this.world.findGround(
      this.position.x,
      this.position.z,
      this.position.y,
      PLAYER_CONFIG.radius,
      PLAYER_CONFIG.maxSnapDown
    );

    if (ground && !this.onGround && this.velocity.y <= 0 && this.position.y <= ground.height + 0.08) {
      this.position.y = ground.height;
      this.velocity.y = 0;
      this.onGround = true;
      this.currentSurface = ground.surface;
    }

    if (this.onGround && ground) {
      this.position.y = ground.height;
      this.currentSurface = ground.surface;
    }

    if (!wasGrounded && this.onGround) {
      const landingIntensity = clamp(Math.abs(this.velocity.y) * 0.08 + 0.35, 0.25, 1);
      this.pendingEvents.landingIntensity = landingIntensity;
      this.landingOffset = -CAMERA_CONFIG.landingKick * landingIntensity;
    }

    this.landingOffset = damp(this.landingOffset, 0, CAMERA_CONFIG.landingRecover, dt);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const movementAlpha = clamp(horizontalSpeed / PLAYER_CONFIG.sprintSpeed, 0, 1);
    this.bobStrength = damp(this.bobStrength, this.onGround && horizontalSpeed > 0.25 ? 1 : 0, 10, dt);

    const bobFrequency = isSprinting ? CAMERA_CONFIG.sprintBobFrequency : CAMERA_CONFIG.bobFrequency;
    this.bobCycle += dt * bobFrequency * clamp(horizontalSpeed / PLAYER_CONFIG.jogSpeed, 0.2, 1.6);
    const bobX = Math.sin(this.bobCycle) * CAMERA_CONFIG.bobAmountX * this.bobStrength;
    const bobY = Math.abs(Math.cos(this.bobCycle * 2)) * CAMERA_CONFIG.bobAmountY * this.bobStrength;
    const bobRoll = Math.sin(this.bobCycle) * CAMERA_CONFIG.bobRoll * this.bobStrength;

    const footstepPhase = Math.floor(this.bobCycle / Math.PI);
    if (this.onGround && horizontalSpeed > 0.6 && footstepPhase !== this.footstepPhase) {
      this.footstepPhase = footstepPhase;
      this.pendingEvents.footstepSurface = this.currentSurface;
    } else if (!this.onGround) {
      this.footstepPhase = footstepPhase;
    }

    this.applyTransforms(bobX, bobY, bobRoll);

    return {
      isMoving: horizontalSpeed > 0.2,
      isWalking,
      isSprinting,
      isAirborne: !this.onGround,
      speedAlpha: movementAlpha,
      bobX,
      bobY,
      bobRoll,
      lookDelta,
      landingOffset: this.landingOffset
    };
  }

  addRecoil(pitchKick: number, yawKick: number): void {
    this.pitch = clamp(this.pitch - pitchKick, -PLAYER_CONFIG.maxPitch, PLAYER_CONFIG.maxPitch);
    this.yaw -= yawKick;
  }

  consumeMovementEvents(): MovementEvents {
    const events = this.pendingEvents;
    this.pendingEvents = {
      footstepSurface: null,
      jumpTriggered: false,
      landingIntensity: 0
    };
    return events;
  }

  getAimRay(): { origin: pc.Vec3; direction: pc.Vec3 } {
    return {
      origin: this.camera.getPosition().clone(),
      direction: this.camera.forward.clone().normalize()
    };
  }

  private moveHorizontal(axis: "x" | "z", amount: number): void {
    if (amount === 0) {
      return;
    }

    const nextX = axis === "x" ? this.position.x + amount : this.position.x;
    const nextZ = axis === "z" ? this.position.z + amount : this.position.z;

    if (this.world.canOccupy(nextX, this.position.y, nextZ, PLAYER_CONFIG.radius, PLAYER_CONFIG.height)) {
      this.position[axis] += amount;
      return;
    }

    if (this.onGround) {
      const stepHeight = this.world.findStepUp(
        nextX,
        nextZ,
        this.position.y,
        PLAYER_CONFIG.radius,
        PLAYER_CONFIG.stepHeight
      );

      if (
        stepHeight !== null &&
        this.world.canOccupy(nextX, stepHeight, nextZ, PLAYER_CONFIG.radius, PLAYER_CONFIG.height)
      ) {
        this.position[axis] += amount;
        this.position.y = stepHeight;
        return;
      }
    }

    this.velocity[axis] = 0;
  }

  private moveVertical(dt: number): void {
    const nextFeetY = this.position.y + this.velocity.y * dt;

    if (this.world.canOccupy(this.position.x, nextFeetY, this.position.z, PLAYER_CONFIG.radius, PLAYER_CONFIG.height)) {
      this.position.y = nextFeetY;
      this.onGround = false;
      return;
    }

    if (this.velocity.y > 0) {
      this.velocity.y = 0;
      return;
    }

    const ground = this.world.findGround(
      this.position.x,
      this.position.z,
      this.position.y,
      PLAYER_CONFIG.radius,
      PLAYER_CONFIG.maxSnapDown + Math.abs(this.velocity.y * dt)
    );

    if (ground) {
      this.position.y = ground.height;
      this.velocity.y = 0;
      this.onGround = true;
      this.currentSurface = ground.surface;
    }
  }

  private applyTransforms(bobX = 0, bobY = 0, bobRoll = 0): void {
    this.root.setPosition(this.position.x, this.position.y, this.position.z);
    this.root.setEulerAngles(0, this.yaw, 0);
    this.pitchPivot.setLocalPosition(0, PLAYER_CONFIG.eyeHeight + bobY + this.landingOffset, 0);
    this.pitchPivot.setLocalEulerAngles(this.pitch + this.landingOffset * 140, 0, bobRoll);
    this.camera.setLocalPosition(bobX, 0, 0);
    this.weaponAnchor.setLocalPosition(0, 0, 0);
  }
}
