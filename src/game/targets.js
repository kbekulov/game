import * as pc from "playcanvas";

import {
  TARGET_RADIUS,
  TARGET_RESPAWN_DELAY,
  TARGET_SPAWN_POINTS
} from "./config.js";
import { applyMaterial } from "./scene.js";

const pickSpawnIndex = (usedIndices, currentIndex = -1) => {
  const available = TARGET_SPAWN_POINTS.map((_, index) => index).filter(
    (index) => index !== currentIndex && !usedIndices.has(index)
  );

  if (available.length === 0) {
    return Math.floor(Math.random() * TARGET_SPAWN_POINTS.length);
  }

  return available[Math.floor(Math.random() * available.length)];
};

const raySphereDistance = (origin, direction, center, radius) => {
  const offset = center.clone().sub(origin);
  const projection = offset.dot(direction);

  if (projection < 0) {
    return Number.POSITIVE_INFINITY;
  }

  const closestDistanceSq = offset.lengthSq() - projection * projection;
  const radiusSq = radius * radius;

  if (closestDistanceSq > radiusSq) {
    return Number.POSITIVE_INFINITY;
  }

  return projection - Math.sqrt(radiusSq - closestDistanceSq);
};

export class TargetManager {
  constructor(app, materials) {
    this.app = app;
    this.materials = materials;
    this.targets = [];
    this.elapsed = 0;
  }

  spawnInitialTargets(count) {
    const usedIndices = new Set();

    for (let index = 0; index < count; index += 1) {
      const spawnIndex = pickSpawnIndex(usedIndices);
      usedIndices.add(spawnIndex);
      this.targets.push(this.createTarget(index + 1, spawnIndex));
    }
  }

  createTarget(id, spawnIndex) {
    const anchor = new pc.Entity(`target-${id}`);
    const shell = new pc.Entity(`target-shell-${id}`);
    const core = new pc.Entity(`target-core-${id}`);

    shell.addComponent("render", {
      type: "box",
      castShadows: true,
      receiveShadows: true
    });
    shell.setLocalScale(1.3, 1.5, 0.35);
    applyMaterial(shell, this.materials.targetShell);

    core.addComponent("render", {
      type: "box",
      castShadows: false,
      receiveShadows: true
    });
    core.setLocalPosition(0, 0, 0.24);
    core.setLocalScale(0.45, 0.45, 0.12);
    applyMaterial(core, this.materials.targetCore);

    anchor.addChild(shell);
    anchor.addChild(core);
    this.app.root.addChild(anchor);

    const target = {
      id,
      anchor,
      spawnIndex,
      alive: true,
      radius: TARGET_RADIUS,
      phase: Math.random() * Math.PI * 2,
      respawnTimer: 0
    };

    this.placeTarget(target);
    return target;
  }

  placeTarget(target) {
    const spawn = TARGET_SPAWN_POINTS[target.spawnIndex];
    target.anchor.setPosition(spawn.x, spawn.y, spawn.z);
  }

  update(dt) {
    this.elapsed += dt;

    const occupied = new Set(
      this.targets.filter((target) => target.alive).map((target) => target.spawnIndex)
    );

    for (const target of this.targets) {
      if (target.alive) {
        const spawn = TARGET_SPAWN_POINTS[target.spawnIndex];
        const bob = Math.sin(this.elapsed * 2.1 + target.phase) * 0.3;
        const sway = Math.sin(this.elapsed * 0.9 + target.phase) * 0.35;
        target.anchor.setPosition(spawn.x + sway, spawn.y + bob, spawn.z);
        target.anchor.setEulerAngles(0, this.elapsed * 55 + target.phase * 30, 0);
        continue;
      }

      target.respawnTimer -= dt;

      if (target.respawnTimer > 0) {
        continue;
      }

      target.spawnIndex = pickSpawnIndex(occupied, target.spawnIndex);
      occupied.add(target.spawnIndex);
      target.phase = Math.random() * Math.PI * 2;
      target.alive = true;
      target.anchor.enabled = true;
      this.placeTarget(target);
    }
  }

  shoot(origin, direction) {
    let closestTarget = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      if (!target.alive) {
        continue;
      }

      const distance = raySphereDistance(
        origin,
        direction,
        target.anchor.getPosition(),
        target.radius
      );

      if (distance >= closestDistance) {
        continue;
      }

      closestDistance = distance;
      closestTarget = target;
    }

    if (!closestTarget) {
      return { hit: false };
    }

    closestTarget.alive = false;
    closestTarget.anchor.enabled = false;
    closestTarget.respawnTimer = TARGET_RESPAWN_DELAY;

    return {
      hit: true,
      target: closestTarget
    };
  }

  getActiveCount() {
    return this.targets.reduce((count, target) => count + Number(target.alive), 0);
  }
}
