import * as pc from "playcanvas";

import type { SurfaceType } from "@/core/config.ts";
import { createPrimitive } from "@/core/primitives.ts";

interface TimedEffect {
  entity: pc.Entity;
  velocity: pc.Vec3;
  angularVelocity: pc.Vec3;
  age: number;
  lifetime: number;
}

export class EffectsSystem {
  private readonly root = new pc.Entity("effects-root");
  private readonly casings: TimedEffect[] = [];
  private readonly puffs: TimedEffect[] = [];
  private readonly impactMaterials: Record<SurfaceType, pc.StandardMaterial>;

  constructor(private readonly app: pc.Application) {
    this.app.root.addChild(this.root);
    this.impactMaterials = {
      stone: this.createImpactMaterial(new pc.Color(0.78, 0.72, 0.64)),
      wood: this.createImpactMaterial(new pc.Color(0.46, 0.32, 0.2)),
      metal: this.createImpactMaterial(new pc.Color(0.88, 0.8, 0.58)),
      plaster: this.createImpactMaterial(new pc.Color(0.94, 0.88, 0.78)),
      tile: this.createImpactMaterial(new pc.Color(0.66, 0.36, 0.22)),
      water: this.createImpactMaterial(new pc.Color(0.4, 0.62, 0.74))
    };
  }

  update(dt: number): void {
    this.updateEffects(this.casings, dt);
    this.updateEffects(this.puffs, dt);
  }

  spawnImpact(point: pc.Vec3, normal: pc.Vec3, surface: SurfaceType): void {
    const entity = createPrimitive({
      name: `impact-${surface}`,
      type: "sphere",
      parent: this.root,
      position: [point.x + normal.x * 0.02, point.y + normal.y * 0.02, point.z + normal.z * 0.02],
      scale: [0.12, 0.12, 0.12],
      material: this.impactMaterials[surface],
      castShadows: false,
      receiveShadows: false
    });

    this.puffs.push({
      entity,
      velocity: normal.clone().mulScalar(0.45),
      angularVelocity: new pc.Vec3(140, 160, 90),
      age: 0,
      lifetime: 0.18
    });
  }

  spawnCasing(position: pc.Vec3, impulse: pc.Vec3): void {
    const brass = new pc.StandardMaterial();
    brass.diffuse = new pc.Color(0.78, 0.66, 0.28);
    brass.gloss = 0.48;
    brass.metalness = 0.74;
    brass.update();

    const entity = createPrimitive({
      name: "casing",
      type: "box",
      parent: this.root,
      position: [position.x, position.y, position.z],
      scale: [0.05, 0.08, 0.05],
      material: brass
    });

    this.casings.push({
      entity,
      velocity: impulse.clone(),
      angularVelocity: new pc.Vec3(420, 280, 510),
      age: 0,
      lifetime: 1.1
    });
  }

  private updateEffects(items: TimedEffect[], dt: number): void {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      item.age += dt;

      if (item.age >= item.lifetime) {
        item.entity.destroy();
        items.splice(index, 1);
        continue;
      }

      item.entity.translate(
        item.velocity.x * dt,
        item.velocity.y * dt,
        item.velocity.z * dt
      );
      item.entity.rotate(
        item.angularVelocity.x * dt,
        item.angularVelocity.y * dt,
        item.angularVelocity.z * dt
      );
      item.velocity.y -= 7.2 * dt;

      const alpha = 1 - item.age / item.lifetime;
      item.entity.setLocalScale(alpha * 0.12 + 0.02, alpha * 0.12 + 0.02, alpha * 0.12 + 0.02);
    }
  }

  private createImpactMaterial(color: pc.Color): pc.StandardMaterial {
    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = color;
    material.emissiveIntensity = 1.1;
    material.update();
    return material;
  }
}
