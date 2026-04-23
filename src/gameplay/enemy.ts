import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { damp, randRange } from "../core/math";
import { CollisionWorld } from "../world/collision";
import { Terrain } from "../world/terrain";

export interface EnemyShotEvent {
  readonly origin: pc.Vec3;
  readonly target: pc.Vec3;
  readonly damage: number;
}

export class EnemyDrone {
  readonly root: pc.Entity;
  readonly radius = 0.72;

  private readonly anchor: pc.Vec3;
  private readonly position: pc.Vec3;
  private readonly ring: pc.Entity;
  private readonly body: pc.Entity;
  private readonly meshMaterial: pc.StandardMaterial;
  private readonly ringMaterial: pc.StandardMaterial;
  private health: number = GAME_CONFIG.enemies.health;
  private active = true;
  private phase = randRange(0, Math.PI * 2);
  private shotTimer = randRange(
    GAME_CONFIG.enemies.shotIntervalMin,
    GAME_CONFIG.enemies.shotIntervalMax
  );
  private aggroTime = 0;
  private damageFlash = 0;
  private collapse = 0;

  constructor(
    app: pc.Application,
    parent: pc.Entity,
    spawn: pc.Vec3
  ) {
    this.anchor = spawn.clone();
    this.position = spawn.clone();
    this.root = new pc.Entity("enemy-drone");
    this.root.setLocalPosition(this.position);
    parent.addChild(this.root);

    this.meshMaterial = this.createMaterial([0.18, 0.22, 0.24], [0.04, 0.08, 0.1], 0.75, 0.18);
    this.ringMaterial = this.createMaterial([0.18, 0.48, 0.36], [0.18, 0.95, 0.72], 0.88, 0.25, 1.8);

    this.body = this.addPrimitive(
      this.root,
      "core",
      "sphere",
      this.meshMaterial,
      new pc.Vec3(0, 0, 0),
      new pc.Vec3(0.7, 0.52, 0.7)
    );

    const torusMesh = pc.Mesh.fromGeometry(
      app.graphicsDevice,
      new pc.TorusGeometry({
        tubeRadius: 0.045,
        ringRadius: 0.48,
        segments: 24,
        sides: 18
      })
    );
    const torusMeshInstance = new pc.MeshInstance(torusMesh, this.ringMaterial);
    this.ring = new pc.Entity("ring");
    this.ring.addComponent("render", {
      meshInstances: [torusMeshInstance],
      castShadows: false,
      receiveShadows: false
    });
    this.root.addChild(this.ring);

    this.addPrimitive(
      this.root,
      "wing-left",
      "box",
      this.meshMaterial,
      new pc.Vec3(-0.72, 0, 0),
      new pc.Vec3(0.34, 0.08, 0.14)
    );
    this.addPrimitive(
      this.root,
      "wing-right",
      "box",
      this.meshMaterial,
      new pc.Vec3(0.72, 0, 0),
      new pc.Vec3(0.34, 0.08, 0.14)
    );
    this.addPrimitive(
      this.root,
      "sensor",
      "sphere",
      this.ringMaterial,
      new pc.Vec3(0, -0.02, 0.3),
      new pc.Vec3(0.12, 0.12, 0.12)
    );
  }

  reset(spawn: pc.Vec3): void {
    this.anchor.copy(spawn);
    this.position.copy(spawn);
    this.root.setLocalPosition(this.position);
    this.root.setLocalScale(1, 1, 1);
    this.health = GAME_CONFIG.enemies.health;
    this.active = true;
    this.damageFlash = 0;
    this.collapse = 0;
    this.aggroTime = 0;
    this.shotTimer = randRange(
      GAME_CONFIG.enemies.shotIntervalMin,
      GAME_CONFIG.enemies.shotIntervalMax
    );
    this.root.enabled = true;
    this.updateMaterials();
  }

  setDormant(): void {
    this.active = false;
    this.health = 0;
    this.damageFlash = 0;
    this.collapse = 0;
    this.root.enabled = false;
    this.root.setLocalScale(1, 1, 1);
    this.updateMaterials();
  }

  update(
    dt: number,
    playerEye: pc.Vec3,
    terrain: Terrain,
    collision: CollisionWorld
  ): EnemyShotEvent | null {
    this.phase += dt;
    this.ring.rotateLocal(0, 120 * dt, 0);

    if (!this.active) {
      this.collapse += dt;
      this.position.y -= dt * 2.8;
      this.root.setLocalPosition(this.position);
      this.root.setLocalScale(
        Math.max(0, 1 - this.collapse * 0.7),
        Math.max(0, 1 - this.collapse * 0.7),
        Math.max(0, 1 - this.collapse * 0.7)
      );

      if (this.collapse > 1.2) {
        this.root.enabled = false;
      }

      return null;
    }

    this.damageFlash = damp(this.damageFlash, 0, 8, dt);

    const toPlayer = playerEye.clone().sub(this.position);
    const distance = toPlayer.length();
    const hasSight = !collision.isLineBlocked(
      this.position.clone().add(new pc.Vec3(0, 0.2, 0)),
      playerEye
    );

    if (distance < GAME_CONFIG.enemies.detectionRange && hasSight) {
      this.aggroTime = 3.5;
    } else {
      this.aggroTime = Math.max(0, this.aggroTime - dt);
    }

    let targetX = this.anchor.x + Math.sin(this.phase * 0.8) * GAME_CONFIG.enemies.patrolRadius;
    let targetZ = this.anchor.z + Math.cos(this.phase * 0.75) * GAME_CONFIG.enemies.patrolRadius;

    if (this.aggroTime > 0) {
      const dir = toPlayer.normalize();
      const strafe = new pc.Vec3(-dir.z, 0, dir.x).mulScalar(Math.sin(this.phase * 1.7));
      const approach = distance > 10 ? 1 : distance < 7 ? -0.75 : 0;
      targetX = this.position.x + (dir.x * approach + strafe.x * GAME_CONFIG.enemies.strafeSpeed) * dt * 4.5;
      targetZ = this.position.z + (dir.z * approach + strafe.z * GAME_CONFIG.enemies.strafeSpeed) * dt * 4.5;
    }

    this.position.x = damp(this.position.x, targetX, GAME_CONFIG.enemies.moveSpeed, dt);
    this.position.z = damp(this.position.z, targetZ, GAME_CONFIG.enemies.moveSpeed, dt);
    this.position.y =
      terrain.heightAt(this.position.x, this.position.z, this.anchor.y + 1) +
      GAME_CONFIG.enemies.hoverHeight +
      Math.sin(this.phase * 2.2) * 0.28;

    this.root.setLocalPosition(this.position);
    this.root.lookAt(playerEye);
    this.root.rotateLocal(0, 180, 0);
    this.updateMaterials();

    this.shotTimer -= dt;

    if (
      this.aggroTime > 0 &&
      hasSight &&
      distance < GAME_CONFIG.enemies.fireRange &&
      this.shotTimer <= 0
    ) {
      this.shotTimer = randRange(
        GAME_CONFIG.enemies.shotIntervalMin,
        GAME_CONFIG.enemies.shotIntervalMax
      );
      return {
        origin: this.position.clone().add(new pc.Vec3(0, -0.03, 0.24)),
        target: playerEye.clone(),
        damage: GAME_CONFIG.enemies.shotDamage
      };
    }

    return null;
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): number | null {
    if (!this.active) {
      return null;
    }

    const center = this.position.clone();
    const relative = origin.clone().sub(center);
    const a = direction.dot(direction);
    const b = 2 * relative.dot(direction);
    const c = relative.dot(relative) - this.radius * this.radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const distance = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (distance < 0 || distance > maxDistance) {
      return null;
    }

    return distance;
  }

  applyDamage(): boolean {
    if (!this.active) {
      return false;
    }

    this.health -= 1;
    this.damageFlash = 1;
    this.aggroTime = 4;

    if (this.health <= 0) {
      this.active = false;
      return true;
    }

    return false;
  }

  isAlive(): boolean {
    return this.active;
  }

  getPosition(): pc.Vec3 {
    return this.position.clone();
  }

  private updateMaterials(): void {
    const flash = this.damageFlash;
    this.meshMaterial.emissive.set(0.04 + flash * 0.42, 0.08 + flash * 0.08, 0.1 + flash * 0.06);
    this.meshMaterial.emissiveIntensity = 1 + flash * 1.5;
    this.meshMaterial.update();

    this.ringMaterial.emissive.set(
      0.18 + flash * 0.6,
      0.95 - flash * 0.2,
      0.72 - flash * 0.3
    );
    this.ringMaterial.emissiveIntensity = 1.8 + flash;
    this.ringMaterial.update();
  }

  private addPrimitive(
    parent: pc.Entity,
    name: string,
    type: "box" | "sphere",
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
