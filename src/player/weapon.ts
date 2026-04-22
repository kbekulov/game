import * as pc from "playcanvas";

import { GAME_CONFIG, MovementState } from "../app/config";
import { clamp, damp, easeInOutCubic, inverseLerp, lerp, trianglePulse } from "../core/math";
import { InputManager } from "../engine/input";

export interface WeaponFrameState {
  readonly movementState: MovementState;
  readonly moveAmount: number;
  readonly sprintAmount: number;
  readonly aiming: boolean;
  readonly aimAmount: number;
  readonly grounded: boolean;
  readonly bobX: number;
  readonly bobY: number;
  readonly landingKick: number;
  readonly lookDeltaX: number;
  readonly lookDeltaY: number;
}

export interface WeaponShot {
  readonly origin: pc.Vec3;
  readonly direction: pc.Vec3;
  readonly maxDistance: number;
}

export type WeaponAudioCue = "reload" | "empty-reload" | "dry-fire";

type WeaponAction = "reload" | "empty-reload" | "press-check" | "dry-fire" | "fire";

interface ActiveAction {
  readonly type: WeaponAction;
  readonly duration: number;
  time: number;
}

export class PistolWeapon {
  readonly root: pc.Entity;

  private readonly slide: pc.Entity;
  private readonly frame: pc.Entity;
  private readonly barrel: pc.Entity;
  private readonly magazine: pc.Entity;
  private readonly trigger: pc.Entity;
  private readonly muzzleFlash: pc.Entity;

  private magazineAmmo: number = GAME_CONFIG.weapon.magazineSize;
  private reserveAmmo: number = GAME_CONFIG.weapon.reserveAmmo;
  private action: ActiveAction | null = null;
  private shotCooldown = 0;
  private time = 0;
  private swayX = 0;
  private swayY = 0;
  private recoilBack = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private actionLabel = "Ready";
  private slideLocked = false;
  private readonly audioCues: WeaponAudioCue[] = [];

  constructor(parent: pc.Entity) {
    this.root = new pc.Entity("pistol-root");
    parent.addChild(this.root);

    const materials = this.createMaterials();
    this.frame = this.addPart(
      this.root,
      "frame",
      "box",
      materials.frame,
      new pc.Vec3(0, -0.02, 0),
      new pc.Vec3(0.11, 0.14, 0.3)
    );
    this.slide = this.addPart(
      this.root,
      "slide",
      "box",
      materials.slide,
      new pc.Vec3(0, 0.03, 0.02),
      new pc.Vec3(0.098, 0.07, 0.28)
    );
    this.barrel = this.addPart(
      this.slide,
      "barrel",
      "box",
      materials.steel,
      new pc.Vec3(0, -0.005, 0.07),
      new pc.Vec3(0.03, 0.03, 0.1)
    );
    this.magazine = this.addPart(
      this.frame,
      "magazine",
      "box",
      materials.magazine,
      new pc.Vec3(0, -0.12, -0.035),
      new pc.Vec3(0.065, 0.14, 0.11)
    );
    this.trigger = this.addPart(
      this.frame,
      "trigger",
      "box",
      materials.steel,
      new pc.Vec3(0, -0.03, -0.05),
      new pc.Vec3(0.02, 0.06, 0.02)
    );

    this.addPart(
      this.root,
      "sight-rear",
      "box",
      materials.steel,
      new pc.Vec3(0, 0.075, -0.07),
      new pc.Vec3(0.08, 0.02, 0.03)
    );

    this.addPart(
      this.root,
      "sight-front",
      "box",
      materials.steel,
      new pc.Vec3(0, 0.065, 0.125),
      new pc.Vec3(0.03, 0.03, 0.02)
    );

    this.muzzleFlash = this.addPart(
      this.barrel,
      "muzzle-flash",
      "sphere",
      materials.flash,
      new pc.Vec3(0, 0, 0.07),
      new pc.Vec3(0.05, 0.05, 0.05)
    );
    this.muzzleFlash.enabled = false;

    this.reset();
  }

  reset(): void {
    this.magazineAmmo = GAME_CONFIG.weapon.magazineSize;
    this.reserveAmmo = GAME_CONFIG.weapon.reserveAmmo;
    this.action = null;
    this.shotCooldown = 0;
    this.time = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.recoilBack = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.actionLabel = "Ready";
    this.slideLocked = false;
    this.muzzleFlash.enabled = false;
    this.audioCues.length = 0;
  }

  update(
    dt: number,
    input: InputManager,
    frame: WeaponFrameState,
    eyePosition: pc.Vec3,
    direction: pc.Vec3
  ): WeaponShot | null {
    this.time += dt;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.recoilBack = damp(this.recoilBack, 0, 22, dt);
    this.recoilPitch = damp(this.recoilPitch, 0, 16, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 16, dt);
    this.swayX = damp(this.swayX, clamp(-frame.lookDeltaX * 0.0009, -0.06, 0.06), 16, dt);
    this.swayY = damp(this.swayY, clamp(-frame.lookDeltaY * 0.0009, -0.06, 0.06), 16, dt);
    this.muzzleFlash.enabled = false;

    if (this.action) {
      this.action.time += dt;

      if (this.action.time >= this.action.duration) {
        this.finishAction(this.action.type);
        this.action = null;
      }
    } else if (input.wasActionPressed("reload")) {
      this.tryStartReload();
    } else if (input.wasActionPressed("pressCheck")) {
      this.tryStartPressCheck();
    }

    let shot: WeaponShot | null = null;

    if (!this.action && frame.movementState !== "sprint" && input.isActionDown("fire")) {
      if (this.magazineAmmo > 0 && this.shotCooldown <= 0) {
        this.magazineAmmo -= 1;
        this.slideLocked = this.magazineAmmo === 0;
        this.shotCooldown = GAME_CONFIG.weapon.fireInterval;
        this.action = {
          type: "fire",
          duration: 0.1,
          time: 0
        };
        this.actionLabel = "Firing";
        this.recoilBack = 1;
        this.recoilPitch = 1;
        this.recoilYaw += (Math.random() - 0.5) * 0.6;
        shot = {
          origin: eyePosition.clone(),
          direction: direction.clone(),
          maxDistance: GAME_CONFIG.weapon.range
        };
      } else if (this.magazineAmmo === 0 && this.shotCooldown <= 0) {
        this.action = {
          type: "dry-fire",
          duration: GAME_CONFIG.weapon.dryFireDuration,
          time: 0
        };
        this.shotCooldown = 0.12;
        this.actionLabel = "Dry fire";
        this.audioCues.push("dry-fire");
      }
    }

    this.applyPose(dt, frame);
    return shot;
  }

  getAmmo(): number {
    return this.magazineAmmo;
  }

  getReserveAmmo(): number {
    return this.reserveAmmo;
  }

  addReserveAmmo(amount: number): number {
    const previous = this.reserveAmmo;
    this.reserveAmmo = Math.min(
      GAME_CONFIG.weapon.maxReserveAmmo,
      this.reserveAmmo + amount
    );
    return this.reserveAmmo - previous;
  }

  getActionLabel(): string {
    if (this.action) {
      return this.actionLabel;
    }

    if (this.slideLocked) {
      return "Slide locked";
    }

    if (this.magazineAmmo <= 4) {
      return "Low ammo";
    }

    return "Ready";
  }

  consumeAudioCues(): WeaponAudioCue[] {
    return this.audioCues.splice(0, this.audioCues.length);
  }

  private tryStartReload(): void {
    if (this.reserveAmmo <= 0 || this.magazineAmmo === GAME_CONFIG.weapon.magazineSize) {
      return;
    }

    const empty = this.magazineAmmo === 0;
    this.action = {
      type: empty ? "empty-reload" : "reload",
      duration: empty ? GAME_CONFIG.weapon.emptyReloadDuration : GAME_CONFIG.weapon.reloadDuration,
      time: 0
    };
    this.actionLabel = empty ? "Empty reload" : "Reloading";
    this.audioCues.push(empty ? "empty-reload" : "reload");
  }

  private tryStartPressCheck(): void {
    if (this.magazineAmmo <= 0) {
      return;
    }

    this.action = {
      type: "press-check",
      duration: GAME_CONFIG.weapon.pressCheckDuration,
      time: 0
    };
    this.actionLabel = "Press-check";
  }

  private finishAction(type: WeaponAction): void {
    if (type === "reload" || type === "empty-reload") {
      const amountNeeded = GAME_CONFIG.weapon.magazineSize - this.magazineAmmo;
      const ammoToLoad = Math.min(amountNeeded, this.reserveAmmo);
      this.magazineAmmo += ammoToLoad;
      this.reserveAmmo -= ammoToLoad;
      this.slideLocked = false;
      this.actionLabel = "Ready";
      return;
    }

    if (type === "press-check" || type === "dry-fire" || type === "fire") {
      this.actionLabel = this.slideLocked ? "Slide locked" : "Ready";
    }
  }

  private applyPose(dt: number, frame: WeaponFrameState): void {
    const basePosition = new pc.Vec3(0.18, -0.19, -0.34);
    const baseRotation = new pc.Vec3(-2, 0, 0);

    if (frame.movementState === "walk") {
      basePosition.set(0.185, -0.2, -0.34);
      baseRotation.set(-2, 0, 1.5);
    } else if (frame.movementState === "jog") {
      basePosition.set(0.19, -0.205, -0.33);
      baseRotation.set(-3, 0.5, 2.8);
    } else if (frame.movementState === "sprint") {
      basePosition.set(0.28, -0.3, -0.2);
      baseRotation.set(16, 20, -14);
    } else if (frame.movementState === "airborne") {
      basePosition.set(0.2, -0.22, -0.29);
      baseRotation.set(4, 1.8, 3.5);
    }

    basePosition.x += frame.bobX * 0.65 + this.swayX;
    basePosition.y += frame.bobY * 0.48 + this.swayY - frame.landingKick * 0.08;
    basePosition.z += this.recoilBack * 0.04;
    baseRotation.x += this.recoilPitch * 10;
    baseRotation.y += this.recoilYaw * 8;
    baseRotation.z += frame.lookDeltaX * -0.03;

    let slideOffset = this.slideLocked ? 0.05 : 0;
    let magazineOffset = 0;
    let triggerPull = 0;

    if (this.action) {
      const t = clamp(this.action.time / this.action.duration, 0, 1);
      const smooth = easeInOutCubic(t);

      if (this.action.type === "fire") {
        const kick = trianglePulse(t, 0, 0.25, 1);
        basePosition.z += kick * 0.035;
        basePosition.y -= kick * 0.02;
        baseRotation.x += kick * 14;
        slideOffset = Math.max(slideOffset, trianglePulse(t, 0.02, 0.12, 0.38) * 0.08);
        triggerPull = kick;
        this.muzzleFlash.enabled = t < 0.12;
      }

      if (this.action.type === "dry-fire") {
        const click = trianglePulse(t, 0, 0.4, 1);
        baseRotation.x += click * 4;
        basePosition.z -= click * 0.015;
        triggerPull = click;
      }

      if (this.action.type === "reload" || this.action.type === "empty-reload") {
        const present = inverseLerp(0.06, 0.22, t) - inverseLerp(0.86, 1, t);
        const posture = clamp(present, 0, 1);
        basePosition.x += posture * 0.1;
        basePosition.y -= posture * 0.05;
        basePosition.z += posture * 0.08;
        baseRotation.x += posture * 4;
        baseRotation.y += posture * 18;
        baseRotation.z += posture * 32;

        if (t >= 0.16 && t < 0.28) {
          magazineOffset = -0.18 * smooth;
        } else if (t >= 0.28 && t < 0.54) {
          magazineOffset = -0.18;
        } else if (t >= 0.54 && t < 0.72) {
          magazineOffset = -0.18 * (1 - inverseLerp(0.54, 0.72, t));
        }

        if (this.action.type === "empty-reload") {
          slideOffset = t < 0.8
            ? 0.05
            : trianglePulse(t, 0.8, 0.86, 0.96) * 0.05;
        }
      }

      if (this.action.type === "press-check") {
        const inspect = trianglePulse(t, 0.08, 0.4, 0.92);
        basePosition.x -= inspect * 0.08;
        basePosition.y += inspect * 0.018;
        basePosition.z += inspect * 0.03;
        baseRotation.x += inspect * 2;
        baseRotation.y -= inspect * 14;
        baseRotation.z -= inspect * 18;
        slideOffset = Math.max(slideOffset, trianglePulse(t, 0.16, 0.36, 0.58) * 0.04);
      }
    }

    const aimBlend =
      this.action && this.action.type !== "fire"
        ? 0
        : frame.aimAmount;
    const aimPosition = {
      x: 0.04,
      y: -0.145,
      z: -0.145
    };
    const aimRotation = {
      x: 0.4,
      y: -0.8,
      z: 0
    };
    const bobScale = 1 - aimBlend * 0.78;

    basePosition.x *= bobScale;
    basePosition.y = lerp(basePosition.y, basePosition.y - frame.bobY * 0.32, aimBlend);
    baseRotation.z *= bobScale;

    basePosition.x = lerp(basePosition.x, aimPosition.x, aimBlend);
    basePosition.y = lerp(basePosition.y, aimPosition.y, aimBlend);
    basePosition.z = lerp(basePosition.z, aimPosition.z, aimBlend);
    baseRotation.x = lerp(baseRotation.x, aimRotation.x, aimBlend);
    baseRotation.y = lerp(baseRotation.y, aimRotation.y, aimBlend);
    baseRotation.z = lerp(baseRotation.z, aimRotation.z, aimBlend);

    this.root.setLocalPosition(basePosition);
    this.root.setLocalEulerAngles(baseRotation);
    this.slide.setLocalPosition(0, 0.03, 0.02 + slideOffset);
    this.magazine.setLocalPosition(0, -0.12 + magazineOffset, -0.035);
    this.trigger.setLocalEulerAngles(triggerPull * 18, 0, 0);

    this.recoilBack = damp(this.recoilBack, 0, 18, dt);
  }

  private createMaterials(): Record<string, pc.StandardMaterial> {
    return {
      slide: this.createMaterial([0.11, 0.12, 0.13], [0.03, 0.04, 0.05], 0.66, 0.36),
      frame: this.createMaterial([0.18, 0.19, 0.17], [0.03, 0.04, 0.03], 0.42, 0.1),
      steel: this.createMaterial([0.36, 0.37, 0.39], [0.05, 0.05, 0.06], 0.8, 0.62),
      magazine: this.createMaterial([0.16, 0.16, 0.18], [0.03, 0.03, 0.04], 0.62, 0.26),
      flash: this.createMaterial([1, 0.82, 0.45], [1, 0.8, 0.32], 0.92, 0.05, 2.8)
    };
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

  private addPart(
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
      castShadows: false,
      receiveShadows: false
    });
    entity.render!.material = material;
    entity.setLocalPosition(position);
    entity.setLocalScale(scale);
    parent.addChild(entity);
    return entity;
  }
}
