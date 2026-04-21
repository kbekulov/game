import * as pc from "playcanvas";

import {
  FOREST_HALF_EXTENT,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_PITCH,
  MOUSE_SENSITIVITY,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  SPRINT_MULTIPLIER,
  STEP_BOB_FREQUENCY,
  STEP_BOB_PITCH,
  STEP_BOB_ROLL,
  STEP_BOB_SPRINT_FREQUENCY,
  STEP_BOB_X,
  STEP_BOB_Y
} from "./config.js";
import { sampleTerrainHeight } from "./terrain.js";

export class PlayerController {
  constructor(playerRig, cameraRig, camera, viewModel, input) {
    this.playerRig = playerRig;
    this.cameraRig = cameraRig;
    this.camera = camera;
    this.viewModel = viewModel;
    this.input = input;
    this.yaw = 234;
    this.pitch = -6;
    this.moveDirection = new pc.Vec3();
    this.forward = new pc.Vec3();
    this.right = new pc.Vec3();
    this.temp = new pc.Vec3();
    this.verticalVelocity = 0;
    this.grounded = true;
    this.walkBlend = 0;
    this.stepPhase = 0;
    this.landingBounce = 0;
    this.lookSway = new pc.Vec2();
    this.viewModelBasePosition = viewModel.getLocalPosition().clone();
    this.viewModelBaseRotation = viewModel.getLocalEulerAngles().clone();

    this.playerRig.setEulerAngles(0, this.yaw, 0);
    this.cameraRig.setLocalEulerAngles(this.pitch, 0, 0);
  }

  update(dt) {
    const look = this.input.consumeLookDelta();
    this.yaw -= look.x * MOUSE_SENSITIVITY;
    this.pitch = pc.math.clamp(this.pitch - look.y * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
    this.lookSway.x = pc.math.lerp(
      this.lookSway.x,
      pc.math.clamp(-look.x * 0.0016, -0.026, 0.026),
      1 - Math.exp(-dt * 14)
    );
    this.lookSway.y = pc.math.lerp(
      this.lookSway.y,
      pc.math.clamp(look.y * 0.0013, -0.022, 0.022),
      1 - Math.exp(-dt * 14)
    );

    this.playerRig.setEulerAngles(0, this.yaw, 0);

    this.moveDirection.set(0, 0, 0);

    this.forward.copy(this.playerRig.forward);
    this.forward.y = 0;
    this.forward.normalize();

    this.right.copy(this.playerRig.right);
    this.right.y = 0;
    this.right.normalize();

    if (this.input.isDown("KeyW")) {
      this.moveDirection.add(this.forward);
    }

    if (this.input.isDown("KeyS")) {
      this.moveDirection.sub(this.forward);
    }

    if (this.input.isDown("KeyD")) {
      this.moveDirection.add(this.right);
    }

    if (this.input.isDown("KeyA")) {
      this.moveDirection.sub(this.right);
    }

    const isSprinting = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
    const moveSpeed = MOVE_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1);
    const moveIntent = Math.min(this.moveDirection.length(), 1);

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize().mulScalar(moveSpeed * dt);
      this.playerRig.translate(this.moveDirection);
    }

    if (this.grounded && this.input.consumeJump()) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.grounded = false;
    }

    this.temp.copy(this.playerRig.getPosition());
    const impactVelocity = this.verticalVelocity;
    this.verticalVelocity -= GRAVITY * dt;
    this.temp.y += this.verticalVelocity * dt;
    this.temp.x = pc.math.clamp(this.temp.x, -FOREST_HALF_EXTENT + 1.25, FOREST_HALF_EXTENT - 1.25);
    this.temp.z = pc.math.clamp(this.temp.z, -FOREST_HALF_EXTENT + 1.25, FOREST_HALF_EXTENT - 1.25);
    const wasGrounded = this.grounded;
    const groundLevel = sampleTerrainHeight(this.temp.x, this.temp.z) + PLAYER_HEIGHT;
    const groundSnap = wasGrounded ? 0.48 : 0.18;

    if (this.temp.y <= groundLevel + groundSnap && this.verticalVelocity <= 0) {
      this.temp.y = groundLevel;
      this.verticalVelocity = 0;
      this.grounded = true;

      if (!wasGrounded) {
        this.landingBounce = Math.min(Math.abs(impactVelocity) * 0.0034, 0.032);
      }
    } else {
      this.grounded = false;
    }

    this.playerRig.setPosition(this.temp);

    const walkTarget = this.grounded ? moveIntent : 0;
    this.walkBlend = pc.math.lerp(this.walkBlend, walkTarget, 1 - Math.exp(-dt * 10));

    if (this.walkBlend > 0.01) {
      this.stepPhase +=
        dt * (isSprinting ? STEP_BOB_SPRINT_FREQUENCY : STEP_BOB_FREQUENCY) * (0.55 + moveIntent * 0.45);
    }

    this.landingBounce = pc.math.lerp(this.landingBounce, 0, 1 - Math.exp(-dt * 11));

    const sway = Math.sin(this.stepPhase);
    const lift = 0.5 - 0.5 * Math.cos(this.stepPhase * 2);
    const cameraBobX = sway * STEP_BOB_X * this.walkBlend * 0.4;
    const cameraBobY = lift * STEP_BOB_Y * this.walkBlend - this.landingBounce;
    const cameraRoll = sway * STEP_BOB_ROLL * this.walkBlend;
    const cameraPitch = this.pitch + Math.sin(this.stepPhase * 2) * STEP_BOB_PITCH * this.walkBlend - this.landingBounce * 180;

    this.cameraRig.setLocalEulerAngles(cameraPitch, 0, cameraRoll);
    this.camera.setLocalPosition(
      cameraBobX,
      cameraBobY,
      -this.landingBounce * 0.22
    );

    this.viewModel.setLocalPosition(
      this.viewModelBasePosition.x + sway * STEP_BOB_X * this.walkBlend * 0.95 + this.lookSway.x * 0.9,
      this.viewModelBasePosition.y - lift * STEP_BOB_Y * this.walkBlend * 0.72 - this.landingBounce * 0.82 + this.lookSway.y * 0.55,
      this.viewModelBasePosition.z + lift * 0.018 * this.walkBlend
    );
    this.viewModel.setLocalEulerAngles(
      this.viewModelBaseRotation.x + Math.sin(this.stepPhase * 2) * STEP_BOB_PITCH * this.walkBlend * 3.2 + this.lookSway.y * 52,
      this.viewModelBaseRotation.y - this.lookSway.x * 40,
      this.viewModelBaseRotation.z + sway * STEP_BOB_ROLL * this.walkBlend * 2.7 - this.lookSway.x * 58
    );
  }

  getPosition() {
    return this.playerRig.getPosition().clone();
  }

  getYaw() {
    return this.yaw;
  }

  getEyePosition() {
    return this.camera.getPosition().clone();
  }

  getAimDirection() {
    return this.camera.forward.clone().normalize();
  }
}
