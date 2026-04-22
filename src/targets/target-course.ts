import * as pc from "playcanvas";

import { createPivot, createPrimitive, setEntityMaterial } from "@/core/primitives.ts";
import type { TownMaterials } from "@/level/materials.ts";
import type { TargetSpawn } from "@/level/town-builder.ts";

interface TargetInstance {
  root: pc.Entity;
  plate: pc.Entity;
  head: pc.Entity;
  basePosition: pc.Vec3;
  radius: number;
  down: boolean;
  angle: number;
  wobble: number;
  hitPoint: pc.Vec3;
  label: string;
}

export interface TargetRayHit {
  target: TargetInstance;
  point: pc.Vec3;
  distance: number;
  normal: pc.Vec3;
}

export class TargetCourse {
  private readonly root = new pc.Entity("targets-root");
  private readonly targets: TargetInstance[] = [];

  constructor(app: pc.Application, spawns: TargetSpawn[], private readonly materials: TownMaterials) {
    app.root.addChild(this.root);

    for (const spawn of spawns) {
      this.targets.push(this.createTarget(spawn));
    }
  }

  reset(): void {
    for (const target of this.targets) {
      target.down = false;
      target.angle = 0;
      target.wobble = 0;
      setEntityMaterial(target.plate, this.materials.targetFace);
      setEntityMaterial(target.head, this.materials.targetFace);
      target.root.setLocalEulerAngles(0, target.root.getLocalEulerAngles().y, 0);
    }
  }

  update(dt: number): void {
    for (const target of this.targets) {
      const targetAngle = target.down ? 92 : 0;
      target.angle = pc.math.lerp(target.angle, targetAngle, 1 - Math.exp(-9 * dt));
      target.wobble = pc.math.lerp(target.wobble, 0, 1 - Math.exp(-10 * dt));
      target.root.setLocalEulerAngles(target.angle + target.wobble, target.root.getLocalEulerAngles().y, 0);
    }
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): TargetRayHit | null {
    let best: TargetRayHit | null = null;

    for (const target of this.targets) {
      if (target.down) {
        continue;
      }

      const toSphere = target.hitPoint.clone().sub(origin);
      const projection = toSphere.dot(direction);

      if (projection < 0 || projection > maxDistance) {
        continue;
      }

      const closest = origin.clone().add(direction.clone().mulScalar(projection));
      const missDistance = closest.distance(target.hitPoint);

      if (missDistance > target.radius) {
        continue;
      }

      const offset = Math.sqrt(target.radius * target.radius - missDistance * missDistance);
      const distance = projection - offset;

      if (distance < 0 || distance > maxDistance) {
        continue;
      }

      const point = origin.clone().add(direction.clone().mulScalar(distance));
      const normal = point.clone().sub(target.hitPoint).normalize();
      const hit = {
        target,
        point,
        distance,
        normal
      };

      if (!best || hit.distance < best.distance) {
        best = hit;
      }
    }

    return best;
  }

  hit(target: TargetInstance): void {
    if (target.down) {
      return;
    }

    target.down = true;
    target.wobble = 18;
    setEntityMaterial(target.plate, this.materials.targetHit);
    setEntityMaterial(target.head, this.materials.targetHit);
  }

  remainingCount(): number {
    return this.targets.reduce((count, target) => count + (target.down ? 0 : 1), 0);
  }

  totalCount(): number {
    return this.targets.length;
  }

  private createTarget(spawn: TargetSpawn): TargetInstance {
    const base = createPivot(this.root, `target-${spawn.label}`, [
      spawn.position.x,
      spawn.position.y - 1.1,
      spawn.position.z
    ]);
    base.setLocalEulerAngles(0, spawn.yaw, 0);

    createPrimitive({
      name: `${spawn.label}-stand`,
      type: "box",
      parent: base,
      position: [0, 0.7, 0],
      scale: [0.1, 1.4, 0.1],
      material: this.materials.targetStand
    });

    const plate = createPrimitive({
      name: `${spawn.label}-plate`,
      type: "box",
      parent: base,
      position: [0, 1.68, 0],
      scale: [0.72, 0.92, 0.12],
      material: this.materials.targetFace
    });

    const head = createPrimitive({
      name: `${spawn.label}-head`,
      type: "sphere",
      parent: base,
      position: [0, 2.34, 0],
      scale: [0.34, 0.34, 0.18],
      material: this.materials.targetFace
    });

    return {
      root: base,
      plate,
      head,
      basePosition: spawn.position.clone(),
      radius: 0.6,
      down: false,
      angle: 0,
      wobble: 0,
      hitPoint: spawn.position.clone(),
      label: spawn.label
    };
  }
}
