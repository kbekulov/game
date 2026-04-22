import * as pc from "playcanvas";

import { WEAPON_CONFIG } from "@/core/config.ts";
import { damp } from "@/core/math.ts";
import { createPivot, createPrimitive } from "@/core/primitives.ts";
import type { ArenaMaterials } from "@/level/arena-builder.ts";
import type { MovementSnapshot } from "@/player/player-controller.ts";

type FireResult = "shot" | "dry" | "blocked";

export class RifleController {
  private readonly root: pc.Entity;
  private readonly muzzle: pc.Entity;
  private readonly muzzleFlash: pc.Entity;
  private magAmmo = WEAPON_CONFIG.magazineSize;
  private reserveAmmo = WEAPON_CONFIG.reserveAmmo;
  private fireCooldown = 0;
  private reloadTimer = 0;
  private flashTimer = 0;
  private sway = 0;

  constructor(anchor: pc.Entity, materials: ArenaMaterials) {
    this.root = createPivot(anchor, "rifle-root");
    createPrimitive({
      name: "rifle-body",
      type: "box",
      parent: this.root,
      position: [0, 0, -0.32],
      scale: [0.16, 0.14, 0.7],
      material: materials.weapon
    });
    createPrimitive({
      name: "rifle-stock",
      type: "box",
      parent: this.root,
      position: [0, -0.03, 0.08],
      scale: [0.14, 0.18, 0.28],
      material: materials.weapon
    });
    createPrimitive({
      name: "rifle-mag",
      type: "box",
      parent: this.root,
      position: [0, -0.16, -0.1],
      scale: [0.08, 0.22, 0.12],
      material: materials.weapon
    });

    this.muzzle = createPivot(this.root, "muzzle", [0, 0.03, -0.7]);
    this.muzzleFlash = createPrimitive({
      name: "muzzle-flash",
      type: "sphere",
      parent: this.muzzle,
      position: [0, 0, 0],
      scale: [0.14, 0.14, 0.14],
      material: materials.muzzleFlash,
      castShadows: false,
      receiveShadows: false
    });
    this.muzzleFlash.enabled = false;
  }

  reset(): void {
    this.magAmmo = WEAPON_CONFIG.magazineSize;
    this.reserveAmmo = WEAPON_CONFIG.reserveAmmo;
    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.flashTimer = 0;
    this.sway = 0;
    this.muzzleFlash.enabled = false;
  }

  update(dt: number, movement: MovementSnapshot): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.muzzleFlash.enabled = this.flashTimer > 0;

    if (this.reloadTimer > 0) {
      const previous = this.reloadTimer;
      this.reloadTimer = Math.max(0, this.reloadTimer - dt);

      if (previous > 0 && this.reloadTimer === 0) {
        const needed = WEAPON_CONFIG.magazineSize - this.magAmmo;
        const moved = Math.min(needed, this.reserveAmmo);
        this.magAmmo += moved;
        this.reserveAmmo -= moved;
      }
    }

    const targetSway = movement.isMoving ? (movement.isSprinting ? 0.2 : 0.08) : 0;
    this.sway = damp(this.sway, targetSway, 8, dt);
    this.root.setLocalEulerAngles(this.sway * 8, movement.isSprinting ? 12 : 0, this.sway * -10);
    this.root.setLocalPosition(0, movement.isSprinting ? -0.06 : 0, movement.isSprinting ? 0.08 : 0);
  }

  tryFire(canFire = true): FireResult {
    if (!canFire || this.reloadTimer > 0 || this.fireCooldown > 0) {
      return "blocked";
    }

    if (this.magAmmo <= 0) {
      return "dry";
    }

    this.magAmmo -= 1;
    this.fireCooldown = WEAPON_CONFIG.fireInterval;
    this.flashTimer = WEAPON_CONFIG.muzzleFlashDuration;
    return "shot";
  }

  tryReload(): boolean {
    if (this.reloadTimer > 0 || this.magAmmo === WEAPON_CONFIG.magazineSize || this.reserveAmmo <= 0) {
      return false;
    }

    this.reloadTimer = WEAPON_CONFIG.reloadDuration;
    return true;
  }

  isReloading(): boolean {
    return this.reloadTimer > 0;
  }

  getAmmo(): { current: number; reserve: number } {
    return {
      current: this.magAmmo,
      reserve: this.reserveAmmo
    };
  }

  getStatusMessage(): string {
    if (this.reloadTimer > 0) {
      return "Reloading";
    }

    if (this.magAmmo === 0 && this.reserveAmmo === 0) {
      return "Out Of Ammo";
    }

    return "";
  }
}
