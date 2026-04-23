import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { clamp } from "../core/math";

export class Terrain {
  readonly entity = new pc.Entity("office-navigation");
  readonly floorCount = GAME_CONFIG.world.building.floorCount;
  readonly floorHeight = GAME_CONFIG.world.building.floorHeight;
  readonly halfWidth = GAME_CONFIG.world.building.halfWidth;
  readonly halfDepth = GAME_CONFIG.world.building.halfDepth;
  readonly shaftHalfSize = GAME_CONFIG.world.building.shaftHalfSize;
  readonly elevatorHalfSize = GAME_CONFIG.world.building.elevatorHalfSize;

  private readonly floorBaseY = 0;
  private elevatorHeight = this.getFloorY(0);

  heightAt(x: number, z: number, preferredY = 0): number {
    let bestHeight = Number.NEGATIVE_INFINITY;
    const searchLimit = preferredY + this.floorHeight * 0.55;

    if (
      this.isInsideElevator(x, z) &&
      this.elevatorHeight <= searchLimit
    ) {
      bestHeight = this.elevatorHeight;
    }

    if (this.isWalkableOnFloor(x, z)) {
      for (let floorIndex = 0; floorIndex < this.floorCount; floorIndex += 1) {
        const floorY = this.getFloorY(floorIndex);

        if (floorY <= searchLimit && floorY > bestHeight) {
          bestHeight = floorY;
        }
      }
    }

    return bestHeight === Number.NEGATIVE_INFINITY ? -120 : bestHeight;
  }

  setElevatorHeight(height: number): void {
    this.elevatorHeight = height;
  }

  getElevatorHeight(): number {
    return this.elevatorHeight;
  }

  getFloorY(floorIndex: number): number {
    return this.floorBaseY + floorIndex * this.floorHeight;
  }

  getNearestFloorIndex(y: number): number {
    return clamp(
      Math.round((y - this.floorBaseY) / this.floorHeight),
      0,
      this.floorCount - 1
    );
  }

  getFloorLabelFromY(y: number): string {
    return this.getFloorLabel(this.getNearestFloorIndex(y));
  }

  getFloorLabel(floorIndex: number): string {
    return `Floor ${String(floorIndex + 1).padStart(2, "0")}`;
  }

  getPlayerSpawn(): pc.Vec3 {
    const floorY = this.getFloorY(GAME_CONFIG.world.building.playerSpawnFloor);
    return new pc.Vec3(0, floorY, this.shaftHalfSize + 4.6);
  }

  getEnemySpawns(): pc.Vec3[] {
    const spawns: pc.Vec3[] = [];

    for (let floorIndex = 0; floorIndex < this.floorCount; floorIndex += 1) {
      const y = this.getFloorY(floorIndex) + 0.1;
      spawns.push(
        new pc.Vec3(-9.5, y, -9.5),
        new pc.Vec3(9.5, y, -9.5),
        new pc.Vec3(-10.5, y, 9.5),
        new pc.Vec3(10.5, y, 9.5)
      );
    }

    return spawns;
  }

  isInsideBuilding(x: number, z: number): boolean {
    return (
      Math.abs(x) <= this.halfWidth - GAME_CONFIG.world.building.wallThickness &&
      Math.abs(z) <= this.halfDepth - GAME_CONFIG.world.building.wallThickness
    );
  }

  isInsideElevator(x: number, z: number): boolean {
    return Math.abs(x) <= this.elevatorHalfSize && Math.abs(z) <= this.elevatorHalfSize;
  }

  isInsideShaft(x: number, z: number): boolean {
    return Math.abs(x) <= this.shaftHalfSize && Math.abs(z) <= this.shaftHalfSize;
  }

  private isWalkableOnFloor(x: number, z: number): boolean {
    return this.isInsideBuilding(x, z) && !this.isInsideShaft(x, z);
  }
}
