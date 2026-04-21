import * as pc from "playcanvas";

import {
  FOREST_HALF_EXTENT,
  MAX_PITCH,
  MOUSE_SENSITIVITY,
  MOVE_SPEED,
  PLAYER_HEIGHT
} from "./config.js";

export class PlayerController {
  constructor(playerRig, camera, input) {
    this.playerRig = playerRig;
    this.camera = camera;
    this.input = input;
    this.yaw = 234;
    this.pitch = -6;
    this.moveDirection = new pc.Vec3();
    this.forward = new pc.Vec3();
    this.right = new pc.Vec3();
    this.temp = new pc.Vec3();

    this.playerRig.setEulerAngles(0, this.yaw, 0);
    this.camera.setLocalEulerAngles(this.pitch, 0, 0);
  }

  update(dt) {
    const look = this.input.consumeLookDelta();
    this.yaw -= look.x * MOUSE_SENSITIVITY;
    this.pitch = pc.math.clamp(this.pitch - look.y * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);

    this.playerRig.setEulerAngles(0, this.yaw, 0);
    this.camera.setLocalEulerAngles(this.pitch, 0, 0);

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

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize().mulScalar(MOVE_SPEED * dt);
      this.playerRig.translate(this.moveDirection);
    }

    this.temp.copy(this.playerRig.getPosition());
    this.temp.x = pc.math.clamp(this.temp.x, -FOREST_HALF_EXTENT + 1.25, FOREST_HALF_EXTENT - 1.25);
    this.temp.z = pc.math.clamp(this.temp.z, -FOREST_HALF_EXTENT + 1.25, FOREST_HALF_EXTENT - 1.25);
    this.temp.y = PLAYER_HEIGHT;
    this.playerRig.setPosition(this.temp);
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
