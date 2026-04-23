import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { approach } from "../core/math";
import { InputManager } from "../engine/input";
import { Terrain } from "./terrain";

export interface ElevatorStatus {
  readonly prompt: string | null;
  readonly moving: boolean;
  readonly currentFloor: number;
  readonly targetFloor: number | null;
}

export class ElevatorSystem {
  readonly root: pc.Entity;

  private readonly terrain: Terrain;
  private readonly cabin: pc.Entity;
  private currentFloor = 0;
  private targetFloor: number | null = null;
  private cabinHeight: number;

  constructor(
    parent: pc.Entity,
    terrain: Terrain,
    materials: {
      frame: pc.StandardMaterial;
      trim: pc.StandardMaterial;
      light: pc.StandardMaterial;
    }
  ) {
    this.terrain = terrain;
    this.cabinHeight = this.terrain.getFloorY(0);
    this.terrain.setElevatorHeight(this.cabinHeight);
    this.root = new pc.Entity("elevator");
    parent.addChild(this.root);

    this.cabin = new pc.Entity("elevator-cabin");
    this.root.addChild(this.cabin);

    this.addPart(
      this.cabin,
      "platform",
      "box",
      materials.frame,
      new pc.Vec3(0, -0.06, 0),
      new pc.Vec3(
        GAME_CONFIG.world.building.elevatorHalfSize * 2,
        0.12,
        GAME_CONFIG.world.building.elevatorHalfSize * 2
      )
    );
    this.addPart(
      this.cabin,
      "back-wall",
      "box",
      materials.trim,
      new pc.Vec3(0, 1.9, -GAME_CONFIG.world.building.elevatorHalfSize + 0.08),
      new pc.Vec3(4.05, 3.7, 0.12)
    );
    this.addPart(
      this.cabin,
      "left-rail",
      "box",
      materials.trim,
      new pc.Vec3(-GAME_CONFIG.world.building.elevatorHalfSize + 0.08, 1.9, 0),
      new pc.Vec3(0.12, 3.7, 4.05)
    );
    this.addPart(
      this.cabin,
      "right-rail",
      "box",
      materials.trim,
      new pc.Vec3(GAME_CONFIG.world.building.elevatorHalfSize - 0.08, 1.9, 0),
      new pc.Vec3(0.12, 3.7, 4.05)
    );
    this.addPart(
      this.cabin,
      "ceiling",
      "box",
      materials.frame,
      new pc.Vec3(0, 3.78, 0),
      new pc.Vec3(4.05, 0.12, 4.05)
    );
    this.addPart(
      this.cabin,
      "light-strip",
      "box",
      materials.light,
      new pc.Vec3(0, 3.68, 0),
      new pc.Vec3(1.8, 0.04, 1.4)
    ).render!.castShadows = false;
    this.addPart(
      this.cabin,
      "control-panel",
      "box",
      materials.light,
      new pc.Vec3(1.72, 1.6, 1.15),
      new pc.Vec3(0.08, 1.1, 0.55)
    ).render!.castShadows = false;

    this.cabin.setLocalPosition(0, this.cabinHeight, 0);
  }

  update(dt: number, input: InputManager, playerPosition: pc.Vec3): ElevatorStatus {
    const selection = input.consumeFloorSelection();
    const inside = this.isInsideCabin(playerPosition);

    if (
      inside &&
      !this.isMoving() &&
      selection !== null &&
      selection >= 1 &&
      selection <= this.terrain.floorCount &&
      selection - 1 !== this.currentFloor
    ) {
      this.targetFloor = selection - 1;
    }

    if (this.targetFloor !== null) {
      const targetHeight = this.terrain.getFloorY(this.targetFloor);
      this.cabinHeight = approach(
        this.cabinHeight,
        targetHeight,
        GAME_CONFIG.world.building.elevatorSpeed * dt
      );

      if (Math.abs(this.cabinHeight - targetHeight) < 0.001) {
        this.cabinHeight = targetHeight;
        this.currentFloor = this.targetFloor;
        this.targetFloor = null;
      }
    } else {
      this.currentFloor = this.terrain.getNearestFloorIndex(this.cabinHeight);
    }

    this.cabin.setLocalPosition(0, this.cabinHeight, 0);
    this.terrain.setElevatorHeight(this.cabinHeight);

    return {
      prompt: this.getPrompt(playerPosition),
      moving: this.isMoving(),
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor
    };
  }

  reset(): void {
    this.currentFloor = 0;
    this.targetFloor = null;
    this.cabinHeight = this.terrain.getFloorY(0);
    this.cabin.setLocalPosition(0, this.cabinHeight, 0);
    this.terrain.setElevatorHeight(this.cabinHeight);
  }

  getPrompt(playerPosition: pc.Vec3): string | null {
    const inside = this.isInsideCabin(playerPosition);

    if (inside && this.targetFloor !== null) {
      return `Elevator moving to ${this.terrain.getFloorLabel(this.targetFloor)}.`;
    }

    if (inside) {
      return `${this.terrain.getFloorLabel(this.currentFloor)} | press 1-0 in the elevator`;
    }

    const sameFloorDoor =
      Math.abs(playerPosition.y - this.cabinHeight) < 1.8 &&
      Math.abs(playerPosition.x) < this.terrain.shaftHalfSize + 1.2 &&
      playerPosition.z > this.terrain.shaftHalfSize &&
      playerPosition.z < this.terrain.shaftHalfSize + 3.4;

    if (sameFloorDoor) {
      return `Elevator at ${this.terrain.getFloorLabel(this.currentFloor)}. Step inside to ride`;
    }

    return null;
  }

  private isMoving(): boolean {
    return this.targetFloor !== null;
  }

  private isInsideCabin(playerPosition: pc.Vec3): boolean {
    return (
      Math.abs(playerPosition.x) <= GAME_CONFIG.world.building.elevatorHalfSize - 0.1 &&
      Math.abs(playerPosition.z) <= GAME_CONFIG.world.building.elevatorHalfSize - 0.1 &&
      Math.abs(playerPosition.y - this.cabinHeight) <= 2
    );
  }

  private addPart(
    parent: pc.Entity,
    name: string,
    type: "box",
    material: pc.Material,
    position: pc.Vec3,
    scale: pc.Vec3
  ): pc.Entity {
    const entity = new pc.Entity(name);
    entity.addComponent("render", {
      type,
      castShadows: true,
      receiveShadows: true
    });
    entity.render!.material = material;
    entity.setLocalPosition(position);
    entity.setLocalScale(scale);
    parent.addChild(entity);
    return entity;
  }
}
