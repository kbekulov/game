import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { randRange } from "../core/math";

export type PickupType = "ammo" | "health";

export class WorldPickup {
  readonly type: PickupType;
  readonly root: pc.Entity;

  private readonly basePosition: pc.Vec3;
  private readonly pulsePhase = randRange(0, Math.PI * 2);
  private age = 0;

  constructor(
    parent: pc.Entity,
    type: PickupType,
    position: pc.Vec3
  ) {
    this.type = type;
    this.basePosition = position.clone();
    this.root = new pc.Entity(`${type}-pickup`);
    this.root.setLocalPosition(this.basePosition);
    parent.addChild(this.root);

    const accentMaterial = this.createMaterial(
      type === "ammo" ? [0.76, 0.62, 0.24] : [0.24, 0.78, 0.44],
      type === "ammo" ? [0.2, 0.14, 0.03] : [0.06, 0.2, 0.08],
      0.58,
      0.12,
      1.5
    );
    const trimMaterial = this.createMaterial([0.24, 0.26, 0.28], [0.04, 0.05, 0.06], 0.74, 0.34);

    this.addPrimitive(
      "pickup-base",
      "cylinder",
      trimMaterial,
      new pc.Vec3(0, 0.06, 0),
      new pc.Vec3(0.34, 0.06, 0.34)
    );

    if (type === "ammo") {
      this.addPrimitive(
        "ammo-mag-body",
        "box",
        accentMaterial,
        new pc.Vec3(0, 0.36, 0),
        new pc.Vec3(0.16, 0.42, 0.14)
      );
      this.addPrimitive(
        "ammo-mag-top",
        "box",
        trimMaterial,
        new pc.Vec3(0, 0.56, 0.01),
        new pc.Vec3(0.18, 0.06, 0.14)
      );
      this.addPrimitive(
        "ammo-mag-notch",
        "box",
        trimMaterial,
        new pc.Vec3(0, 0.26, -0.05),
        new pc.Vec3(0.08, 0.08, 0.03)
      );
    } else {
      this.addPrimitive(
        "health-core",
        "box",
        accentMaterial,
        new pc.Vec3(0, 0.34, 0),
        new pc.Vec3(0.16, 0.42, 0.16)
      );
      this.addPrimitive(
        "health-arm-horizontal",
        "box",
        accentMaterial,
        new pc.Vec3(0, 0.34, 0),
        new pc.Vec3(0.36, 0.12, 0.16)
      );
      this.addPrimitive(
        "health-arm-vertical",
        "box",
        accentMaterial,
        new pc.Vec3(0, 0.34, 0),
        new pc.Vec3(0.12, 0.56, 0.16)
      );
    }
  }

  update(dt: number): boolean {
    this.age += dt;

    const bob = Math.sin(this.age * 2.6 + this.pulsePhase) * 0.12;
    const pulse = 1 + Math.sin(this.age * 5.2 + this.pulsePhase) * 0.04;

    this.root.setLocalPosition(
      this.basePosition.x,
      this.basePosition.y + bob,
      this.basePosition.z
    );
    this.root.rotateLocal(0, 58 * dt, 0);
    this.root.setLocalScale(pulse, pulse, pulse);

    if (this.age >= GAME_CONFIG.pickups.lifetime) {
      this.destroy();
      return true;
    }

    return false;
  }

  canCollect(playerPosition: pc.Vec3): boolean {
    return this.basePosition.distance(playerPosition) <= GAME_CONFIG.pickups.pickupRadius;
  }

  destroy(): void {
    this.root.destroy();
  }

  private addPrimitive(
    name: string,
    type: "box" | "cylinder",
    material: pc.Material,
    position: pc.Vec3,
    scale: pc.Vec3
  ): void {
    const entity = new pc.Entity(name);
    entity.addComponent("render", {
      type,
      castShadows: false,
      receiveShadows: false
    });
    entity.render!.material = material;
    entity.setLocalPosition(position);
    entity.setLocalScale(scale);
    this.root.addChild(entity);
  }

  private createMaterial(
    diffuse: [number, number, number],
    emissive: [number, number, number],
    gloss: number,
    metalness: number,
    emissiveIntensity = 1
  ): pc.StandardMaterial {
    const material = new pc.StandardMaterial();
    material.diffuse.set(...diffuse);
    material.emissive.set(...emissive);
    material.emissiveIntensity = emissiveIntensity;
    material.useMetalness = true;
    material.metalness = metalness;
    material.gloss = gloss;
    material.update();
    return material;
  }
}
