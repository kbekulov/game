import * as pc from "playcanvas";

import { GAME_CONFIG, MovementState } from "../app/config";
import { approach, clamp, damp, radians } from "../core/math";
import { InputManager } from "../engine/input";
import { CollisionWorld } from "../world/collision";
import { Terrain } from "../world/terrain";

export interface PlayerFrameState {
  readonly movementState: MovementState;
  readonly moveAmount: number;
  readonly sprintAmount: number;
  readonly aiming: boolean;
  readonly aimAmount: number;
  readonly grounded: boolean;
  readonly bobX: number;
  readonly bobY: number;
  readonly landingKick: number;
  readonly lookDeltaX: number;
  readonly lookDeltaY: number;
}

export class PlayerController {
  readonly root: pc.Entity;
  readonly pitchPivot: pc.Entity;
  readonly camera: pc.Entity;
  readonly weaponMount: pc.Entity;

  private readonly position = new pc.Vec3();
  private readonly velocity = new pc.Vec3();
  private yaw = 0;
  private pitch = 0;
  private health: number = GAME_CONFIG.player.health;
  private grounded = true;
  private bobTime = 0;
  private bobX = 0;
  private bobY = 0;
  private landingKick = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private aimAmount = 0;
  private stepAccumulator = 0;
  private stepEvents = 0;
  private landEvents: number[] = [];
  private lastLookX = 0;
  private lastLookY = 0;
  private lastMovementState: MovementState = "idle";

  constructor(root: pc.Entity) {
    this.root = new pc.Entity("player");
    this.pitchPivot = new pc.Entity("player-pitch");
    this.camera = new pc.Entity("player-camera");
    this.weaponMount = new pc.Entity("weapon-mount");

    this.camera.addComponent("camera", {
      fov: GAME_CONFIG.player.fov,
      nearClip: 0.03,
      farClip: 140,
      clearColor: new pc.Color(0.72, 0.84, 0.93)
    });
    this.camera.camera!.gammaCorrection = pc.GAMMA_SRGB;
    this.camera.camera!.toneMapping = pc.TONEMAP_ACES;

    this.root.addChild(this.pitchPivot);
    this.pitchPivot.addChild(this.camera);
    this.camera.addChild(this.weaponMount);
    root.addChild(this.root);
  }

  reset(spawn: pc.Vec3): void {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.health = GAME_CONFIG.player.health;
    this.grounded = true;
    this.bobTime = 0;
    this.bobX = 0;
    this.bobY = 0;
    this.landingKick = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.aimAmount = 0;
    this.stepAccumulator = 0;
    this.stepEvents = 0;
    this.landEvents = [];
    this.lastMovementState = "idle";
    this.syncTransforms();
  }

  update(
    dt: number,
    input: InputManager,
    terrain: Terrain,
    collision: CollisionWorld
  ): PlayerFrameState {
    const look = input.consumeLookDelta();
    this.lastLookX = look.x;
    this.lastLookY = look.y;
    const aiming = input.isActionDown("aim") && input.isPointerLocked();
    const lookSensitivity =
      GAME_CONFIG.player.mouseSensitivity *
      (aiming ? GAME_CONFIG.player.aimSensitivityMultiplier : 1);

    if (input.isPointerLocked()) {
      this.yaw -= look.x * lookSensitivity;
      this.pitch = clamp(
        this.pitch + look.y * lookSensitivity,
        -GAME_CONFIG.player.maxLookPitch,
        GAME_CONFIG.player.maxLookPitch
      );
    }

    const moveX = Number(input.isActionDown("moveRight")) - Number(input.isActionDown("moveLeft"));
    const moveZ = Number(input.isActionDown("moveForward")) - Number(input.isActionDown("moveBackward"));
    const movementLength = Math.hypot(moveX, moveZ);
    const normalizedX = movementLength > 0 ? moveX / movementLength : 0;
    const normalizedZ = movementLength > 0 ? moveZ / movementLength : 0;

    const forwardInput = normalizedZ;
    const walking = input.isActionDown("walk") || aiming;
    const sprinting =
      input.isActionDown("sprint") &&
      !aiming &&
      forwardInput > 0.25 &&
      movementLength > 0.1 &&
      this.grounded;
    const stateSpeed = sprinting
      ? GAME_CONFIG.player.sprintSpeed
      : walking
        ? GAME_CONFIG.player.walkSpeed *
          (aiming ? GAME_CONFIG.player.aimMoveSpeedMultiplier : 1)
        : GAME_CONFIG.player.jogSpeed;

    const yawRadians = radians(this.yaw);
    const sinYaw = Math.sin(yawRadians);
    const cosYaw = Math.cos(yawRadians);
    const worldMoveX = normalizedX * cosYaw - normalizedZ * sinYaw;
    const worldMoveZ = -normalizedX * sinYaw - normalizedZ * cosYaw;
    const desiredVelocityX = worldMoveX * stateSpeed;
    const desiredVelocityZ = worldMoveZ * stateSpeed;
    const acceleration = this.grounded
      ? GAME_CONFIG.player.groundAcceleration
      : GAME_CONFIG.player.airAcceleration;

    this.velocity.x = approach(this.velocity.x, desiredVelocityX, acceleration * dt);
    this.velocity.z = approach(this.velocity.z, desiredVelocityZ, acceleration * dt);

    if (this.grounded && input.wasActionPressed("jump")) {
      this.velocity.y = GAME_CONFIG.player.jumpSpeed;
      this.grounded = false;
    }

    if (!this.grounded) {
      this.velocity.y -= GAME_CONFIG.player.gravity * dt;
    }

    const previousPosition = this.position.clone();
    const candidate = this.position.clone();
    candidate.x += this.velocity.x * dt;
    candidate.z += this.velocity.z * dt;

    const resolved = collision.resolveHorizontal(
      this.position,
      candidate,
      GAME_CONFIG.player.radius,
      this.position.y,
      GAME_CONFIG.player.collisionHeight
    );

    if (Math.abs(resolved.x - candidate.x) > 0.001) {
      this.velocity.x = 0;
    }

    if (Math.abs(resolved.z - candidate.z) > 0.001) {
      this.velocity.z = 0;
    }

    this.position.x = resolved.x;
    this.position.z = resolved.z;

    if (!this.grounded) {
      this.position.y += this.velocity.y * dt;
    }

    const groundHeight = terrain.heightAt(this.position.x, this.position.z);

    if (this.position.y <= groundHeight) {
      if (!this.grounded && this.velocity.y < -1.8) {
        this.landEvents.push(Math.min(1.4, Math.abs(this.velocity.y) * GAME_CONFIG.player.landingScale));
      }

      this.position.y = groundHeight;
      this.velocity.y = 0;
      this.grounded = true;
    }

    if (this.grounded) {
      this.position.y = damp(this.position.y, groundHeight, 28, dt);
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const moveAmount = clamp(
      horizontalSpeed / GAME_CONFIG.player.sprintSpeed,
      0,
      1
    );
    const sprintAmount = sprinting ? 1 : 0;

    let movementState: MovementState = "idle";

    if (!this.grounded) {
      movementState = "airborne";
    } else if (horizontalSpeed > 0.22) {
      if (sprinting) {
        movementState = "sprint";
      } else if (walking) {
        movementState = "walk";
      } else {
        movementState = "jog";
      }
    }

    this.updateHeadBob(dt, movementState, horizontalSpeed);
    this.updateLanding(dt);
    this.updateRecoil(dt);
    this.aimAmount = damp(this.aimAmount, aiming ? 1 : 0, 12, dt);
    this.syncTransforms(dt);

    const distanceTravelled = Math.hypot(
      this.position.x - previousPosition.x,
      this.position.z - previousPosition.z
    );

    if (this.grounded && movementState !== "idle") {
      const stepLength = movementState === "walk" ? 1.35 : movementState === "sprint" ? 1.7 : 1.5;
      this.stepAccumulator += distanceTravelled;

      while (this.stepAccumulator >= stepLength) {
        this.stepAccumulator -= stepLength;
        this.stepEvents += 1;
      }
    } else {
      this.stepAccumulator = 0;
    }

    this.lastMovementState = movementState;

    return {
      movementState,
      moveAmount,
      sprintAmount,
      aiming,
      aimAmount: this.aimAmount,
      grounded: this.grounded,
      bobX: this.bobX,
      bobY: this.bobY,
      landingKick: this.landingKick,
      lookDeltaX: look.x,
      lookDeltaY: look.y
    };
  }

  consumeFootsteps(): number {
    const steps = this.stepEvents;
    this.stepEvents = 0;
    return steps;
  }

  consumeLandings(): number[] {
    const impacts = [...this.landEvents];
    this.landEvents = [];
    return impacts;
  }

  addRecoil(pitchAmount: number, yawAmount: number): void {
    this.recoilPitch += pitchAmount;
    this.recoilYaw += yawAmount;
  }

  applyDamage(amount: number): number {
    this.health = Math.max(0, this.health - amount);
    return this.health;
  }

  getHealth(): number {
    return this.health;
  }

  getPosition(): pc.Vec3 {
    return this.position.clone();
  }

  getEyePosition(): pc.Vec3 {
    return this.camera.getPosition().clone();
  }

  getViewDirection(): pc.Vec3 {
    return this.camera.forward.clone().normalize();
  }

  getMovementState(): MovementState {
    return this.lastMovementState;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  private updateHeadBob(dt: number, movementState: MovementState, speed: number): void {
    const bob = GAME_CONFIG.player.headBob;
    let amplitude = 0;
    let bobSpeed = 0;

    if (movementState === "walk") {
      amplitude = bob.walkAmplitude;
      bobSpeed = bob.walkSpeed;
    } else if (movementState === "jog") {
      amplitude = bob.jogAmplitude;
      bobSpeed = bob.jogSpeed;
    } else if (movementState === "sprint") {
      amplitude = bob.sprintAmplitude;
      bobSpeed = bob.sprintSpeed;
    }

    if (movementState === "idle" || movementState === "airborne") {
      this.bobX = damp(this.bobX, 0, 8, dt);
      this.bobY = damp(this.bobY, 0, 8, dt);
      return;
    }

    const normalizedSpeed = clamp(speed / GAME_CONFIG.player.sprintSpeed, 0.45, 1.05);
    this.bobTime += dt * bobSpeed * normalizedSpeed;
    this.bobX = damp(this.bobX, Math.sin(this.bobTime) * amplitude, 10, dt);
    this.bobY = damp(this.bobY, Math.abs(Math.cos(this.bobTime * 2)) * amplitude, 10, dt);
  }

  private updateLanding(dt: number): void {
    this.landingKick = damp(this.landingKick, 0, 12, dt);

    if (this.landEvents.length > 0) {
      const impact = this.landEvents[this.landEvents.length - 1];
      this.landingKick = Math.max(this.landingKick, impact);
    }
  }

  private updateRecoil(dt: number): void {
    this.recoilPitch = damp(this.recoilPitch, 0, GAME_CONFIG.player.recoilRecovery, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, GAME_CONFIG.player.recoilRecovery, dt);
  }

  private syncTransforms(dt = 1 / 60): void {
    const breathing = Math.sin(this.bobTime * 0.32) * 0.005;
    const aimBobScale = 1 - this.aimAmount * 0.72;
    const cameraRoll =
      this.bobX * 45 * aimBobScale +
      clamp(
        this.velocity.x * 0.08,
        -GAME_CONFIG.player.cameraRoll * aimBobScale,
        GAME_CONFIG.player.cameraRoll * aimBobScale
      );
    const targetFov =
      GAME_CONFIG.player.fov +
      (GAME_CONFIG.player.aimFov - GAME_CONFIG.player.fov) * this.aimAmount;

    this.root.setLocalPosition(this.position);
    this.root.setLocalEulerAngles(0, this.yaw, 0);
    this.pitchPivot.setLocalEulerAngles(-this.pitch - this.recoilPitch, 0, 0);
    this.camera.camera!.fov = damp(this.camera.camera!.fov, targetFov, 16, dt);
    this.camera.setLocalPosition(
      this.bobX * 0.1 * aimBobScale,
      GAME_CONFIG.player.eyeHeight + breathing + this.bobY * aimBobScale - this.landingKick * 0.12,
      0
    );
    this.camera.setLocalEulerAngles(0, this.recoilYaw * 0.4, cameraRoll);
    this.weaponMount.setLocalPosition(0, -0.03, 0);
  }
}
