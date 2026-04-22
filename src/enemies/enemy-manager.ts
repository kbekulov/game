import * as pc from "playcanvas";

import { ENEMY_CONFIG } from "@/core/config.ts";
import { createPivot, createPrimitive, setEntityMaterial } from "@/core/primitives.ts";
import type { EnemySpawn } from "@/core/config.ts";
import type { ArenaMaterials } from "@/level/arena-builder.ts";
import { CollisionWorld } from "@/level/collision-world.ts";

interface EnemyInstance {
  root: pc.Entity;
  body: pc.Entity;
  head: pc.Entity;
  gunFlash: pc.Entity;
  spawn: EnemySpawn;
  health: number;
  cooldown: number;
  flashTimer: number;
  alive: boolean;
  radius: number;
}

export interface EnemyRayHit {
  enemy: EnemyInstance;
  point: pc.Vec3;
  normal: pc.Vec3;
  distance: number;
}

export interface EnemyUpdateResult {
  damageToPlayer: number;
}

export class EnemyManager {
  private readonly root = new pc.Entity("enemy-root");
  private readonly enemies: EnemyInstance[] = [];

  constructor(
    app: pc.Application,
    spawns: EnemySpawn[],
    private readonly materials: ArenaMaterials
  ) {
    app.root.addChild(this.root);

    for (const spawn of spawns) {
      this.enemies.push(this.createEnemy(spawn));
    }
  }

  reset(): void {
    for (const enemy of this.enemies) {
      enemy.health = ENEMY_CONFIG.health;
      enemy.cooldown = 0.8 + enemy.spawn.phase * 0.15;
      enemy.flashTimer = 0;
      enemy.alive = true;
      enemy.root.enabled = true;
      setEntityMaterial(enemy.body, this.materials.enemyBody);
      setEntityMaterial(enemy.head, this.materials.enemyAccent);
    }
  }

  update(dt: number, playerTarget: pc.Vec3, world: CollisionWorld): EnemyUpdateResult {
    let damageToPlayer = 0;

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      enemy.gunFlash.enabled = enemy.flashTimer > 0;

      const offset = Math.sin(performance.now() * 0.0018 + enemy.spawn.phase) * enemy.spawn.patrolAmplitude;
      const x = enemy.spawn.patrolAxis === "x" ? enemy.spawn.x + offset : enemy.spawn.x;
      const z = enemy.spawn.patrolAxis === "z" ? enemy.spawn.z + offset : enemy.spawn.z;
      enemy.root.setPosition(x, 0, z);

      const enemyAim = new pc.Vec3(x, 1.1, z);
      const facingYaw = Math.atan2(playerTarget.x - x, playerTarget.z - z) * pc.math.RAD_TO_DEG;
      enemy.root.setEulerAngles(0, facingYaw, 0);

      const toPlayer = playerTarget.clone().sub(enemyAim);
      const distance = toPlayer.length();

      if (distance > ENEMY_CONFIG.range || enemy.cooldown > 0) {
        continue;
      }

      const direction = toPlayer.normalize();
      const obstruction = world.raycast(enemyAim, direction, Math.max(0, distance - 0.8), (collider) => collider.shootable ?? false);

      if (obstruction) {
        continue;
      }

      damageToPlayer += ENEMY_CONFIG.damage;
      enemy.cooldown = ENEMY_CONFIG.fireInterval + Math.random() * 0.35;
      enemy.flashTimer = 0.06;
    }

    return {
      damageToPlayer
    };
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): EnemyRayHit | null {
    let best: EnemyRayHit | null = null;

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      const center = enemy.root.getPosition().clone().add(new pc.Vec3(0, 1.1, 0));
      const toEnemy = center.clone().sub(origin);
      const projection = toEnemy.dot(direction);

      if (projection < 0 || projection > maxDistance) {
        continue;
      }

      const closest = origin.clone().add(direction.clone().mulScalar(projection));
      const missDistance = closest.distance(center);

      if (missDistance > enemy.radius) {
        continue;
      }

      const offset = Math.sqrt(enemy.radius * enemy.radius - missDistance * missDistance);
      const distance = projection - offset;

      if (distance < 0 || distance > maxDistance) {
        continue;
      }

      const point = origin.clone().add(direction.clone().mulScalar(distance));
      const normal = point.clone().sub(center).normalize();
      const hit = {
        enemy,
        point,
        normal,
        distance
      };

      if (!best || hit.distance < best.distance) {
        best = hit;
      }
    }

    return best;
  }

  damageEnemy(enemy: EnemyInstance, amount: number): void {
    if (!enemy.alive) {
      return;
    }

    enemy.health -= amount;

    if (enemy.health > 0) {
      return;
    }

    enemy.alive = false;
    enemy.root.enabled = false;
  }

  remainingCount(): number {
    return this.enemies.reduce((count, enemy) => count + (enemy.alive ? 1 : 0), 0);
  }

  totalCount(): number {
    return this.enemies.length;
  }

  private createEnemy(spawn: EnemySpawn): EnemyInstance {
    const root = createPivot(this.root, `enemy-${spawn.x}-${spawn.z}`, [spawn.x, 0, spawn.z]);
    const body = createPrimitive({
      name: "enemy-body",
      type: "capsule",
      parent: root,
      position: [0, 1.05, 0],
      scale: [0.95, 1.1, 0.95],
      material: this.materials.enemyBody
    });
    const head = createPrimitive({
      name: "enemy-head",
      type: "sphere",
      parent: root,
      position: [0, 2.15, 0],
      scale: [0.46, 0.46, 0.46],
      material: this.materials.enemyAccent
    });
    createPrimitive({
      name: "enemy-rifle",
      type: "box",
      parent: root,
      position: [0, 1.42, -0.38],
      scale: [0.16, 0.12, 0.58],
      material: this.materials.weapon
    });
    const gunFlash = createPrimitive({
      name: "enemy-flash",
      type: "sphere",
      parent: root,
      position: [0, 1.48, -0.7],
      scale: [0.14, 0.14, 0.14],
      material: this.materials.muzzleFlash,
      castShadows: false,
      receiveShadows: false
    });
    gunFlash.enabled = false;

    return {
      root,
      body,
      head,
      gunFlash,
      spawn,
      health: ENEMY_CONFIG.health,
      cooldown: 0.8 + spawn.phase * 0.15,
      flashTimer: 0,
      alive: true,
      radius: 0.62
    };
  }
}
