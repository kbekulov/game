import * as pc from "playcanvas";

import { CAMERA_CONFIG, PLAYER_CONFIG, type PlayerSpawn, type RuntimeSettings } from "@/core/config.ts";
import { clamp, damp, dampAngle } from "@/core/math.ts";
import { InputManager } from "@/core/input.ts";
import { createPivot, createPrimitive } from "@/core/primitives.ts";
import { type ArenaMaterials } from "@/level/arena-builder.ts";
import { CollisionWorld } from "@/level/collision-world.ts";

export interface MovementSnapshot {
  isMoving: boolean;
  isSprinting: boolean;
  velocity: pc.Vec3;
}

export class PlayerController {
  readonly root = new pc.Entity("player-root");
  readonly visualRoot = new pc.Entity("player-visual");
  readonly weaponAnchor = new pc.Entity("weapon-anchor");
  readonly cameraYawPivot = new pc.Entity("camera-yaw");
  readonly cameraPitchPivot = new pc.Entity("camera-pitch");
  readonly camera = new pc.Entity("player-camera");

  private readonly position = new pc.Vec3();
  private readonly velocity = new pc.Vec3();
  private cameraYaw = 0;
  private cameraPitch = -18;
  private facingYaw = 180;

  constructor(
    private readonly app: pc.Application,
    private readonly world: CollisionWorld,
    materials: ArenaMaterials
  ) {
    this.app.root.addChild(this.root);
    this.root.addChild(this.visualRoot);
    this.visualRoot.addChild(this.weaponAnchor);
    this.app.root.addChild(this.cameraYawPivot);
    this.cameraYawPivot.addChild(this.cameraPitchPivot);
    this.cameraPitchPivot.addChild(this.camera);

    createPrimitive({
      name: "player-body",
      type: "capsule",
      parent: this.visualRoot,
      position: [0, 1.05, 0],
      scale: [0.95, 1.1, 0.95],
      material: materials.playerBody
    });
    createPrimitive({
      name: "player-head",
      type: "sphere",
      parent: this.visualRoot,
      position: [0, 2.2, 0],
      scale: [0.48, 0.48, 0.48],
      material: materials.playerAccent
    });
    createPrimitive({
      name: "player-shoulder",
      type: "box",
      parent: this.visualRoot,
      position: [0.18, 1.58, -0.12],
      scale: [0.34, 0.18, 0.34],
      material: materials.playerAccent
    });

    this.weaponAnchor.setLocalPosition(0.36, 1.52, -0.28);

    this.camera.addComponent("camera", {
      clearColor: new pc.Color(0.67, 0.75, 0.84),
      farClip: 140,
      nearClip: 0.04,
      fov: 60
    });

    const cameraComponent = this.camera.camera;
    if (cameraComponent) {
      cameraComponent.toneMapping = pc.TONEMAP_ACES;
    }
  }

  reset(spawn: PlayerSpawn): void {
    this.position.set(spawn.x, 0, spawn.z);
    this.velocity.set(0, 0, 0);
    this.cameraYaw = spawn.yaw;
    this.facingYaw = spawn.yaw;
    this.cameraPitch = -18;
    this.applyTransforms();
  }

  update(dt: number, input: InputManager, settings: RuntimeSettings, active = true): MovementSnapshot {
    const lookDelta = active ? input.consumeLookDelta() : { x: 0, y: 0 };
    const sensitivity = PLAYER_CONFIG.mouseSensitivity * settings.mouseSensitivity;

    if (active) {
      this.cameraYaw -= lookDelta.x * sensitivity;
      this.cameraPitch = clamp(
        this.cameraPitch - lookDelta.y * sensitivity,
        CAMERA_CONFIG.pitchMin,
        CAMERA_CONFIG.pitchMax
      );
    }

    const forwardInput = active ? (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0) : 0;
    const strafeInput = active ? (input.isDown("KeyD") ? 1 : 0) - (input.isDown("KeyA") ? 1 : 0) : 0;
    const hasMoveInput = forwardInput !== 0 || strafeInput !== 0;
    const isSprinting = active && hasMoveInput && (input.isDown("ShiftLeft") || input.isDown("ShiftRight"));
    const moveSpeed = isSprinting ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.moveSpeed;

    const yawRadians = this.cameraYaw * pc.math.DEG_TO_RAD;
    const forwardX = -Math.sin(yawRadians);
    const forwardZ = -Math.cos(yawRadians);
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

    if (hasMoveInput) {
      this.velocity.x = damp(this.velocity.x, targetVelocityX, PLAYER_CONFIG.acceleration, dt);
      this.velocity.z = damp(this.velocity.z, targetVelocityZ, PLAYER_CONFIG.acceleration, dt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, PLAYER_CONFIG.deceleration, dt);
      this.velocity.z = damp(this.velocity.z, 0, PLAYER_CONFIG.deceleration, dt);
    }

    if (active) {
      this.moveHorizontal("x", this.velocity.x * dt);
      this.moveHorizontal("z", this.velocity.z * dt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, 18, dt);
      this.velocity.z = damp(this.velocity.z, 0, 18, dt);
    }

    if (hasMoveInput) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z) * pc.math.RAD_TO_DEG;
      this.facingYaw = dampAngle(this.facingYaw, targetFacing, PLAYER_CONFIG.rotationSmoothing, dt);
    }

    this.applyTransforms();

    return {
      isMoving: Math.hypot(this.velocity.x, this.velocity.z) > 0.2,
      isSprinting,
      velocity: this.velocity.clone()
    };
  }

  getAimRay(): { origin: pc.Vec3; direction: pc.Vec3 } {
    return {
      origin: this.camera.getPosition().clone(),
      direction: this.camera.forward.clone().normalize()
    };
  }

  getPosition(): pc.Vec3 {
    return this.position.clone();
  }

  getTargetPoint(): pc.Vec3 {
    return new pc.Vec3(this.position.x, 1.1, this.position.z);
  }

  private moveHorizontal(axis: "x" | "z", amount: number): void {
    if (amount === 0) {
      return;
    }

    const nextX = axis === "x" ? this.position.x + amount : this.position.x;
    const nextZ = axis === "z" ? this.position.z + amount : this.position.z;

    if (this.world.canOccupy(nextX, nextZ, PLAYER_CONFIG.radius)) {
      this.position[axis] += amount;
    } else {
      this.velocity[axis] = 0;
    }
  }

  private applyTransforms(): void {
    this.root.setPosition(this.position.x, 0, this.position.z);
    this.visualRoot.setLocalEulerAngles(0, this.facingYaw, 0);

    const focusPoint = new pc.Vec3(this.position.x, CAMERA_CONFIG.focusHeight, this.position.z);
    this.cameraYawPivot.setPosition(focusPoint);
    this.cameraYawPivot.setEulerAngles(0, this.cameraYaw, 0);
    this.cameraPitchPivot.setLocalEulerAngles(this.cameraPitch, 0, 0);

    const behindDirection = this.cameraPitchPivot.forward.clone().mulScalar(-1).normalize();
    const cameraHit = this.world.raycast(
      focusPoint,
      behindDirection,
      CAMERA_CONFIG.distance,
      (collider) => collider.blocksCamera ?? false
    );
    const distance = cameraHit
      ? Math.max(CAMERA_CONFIG.minDistance, cameraHit.distance - 0.25)
      : CAMERA_CONFIG.distance;

    this.camera.setLocalPosition(0, 0, distance);
  }
}
