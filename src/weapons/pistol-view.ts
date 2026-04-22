import * as pc from "playcanvas";

import { CAMERA_CONFIG, PISTOL_CONFIG } from "@/core/config.ts";
import { clamp, easeInOutCubic, lerp } from "@/core/math.ts";
import { createPivot, createPrimitive } from "@/core/primitives.ts";
import type { TownMaterials } from "@/level/materials.ts";
import type { MovementSnapshot } from "@/player/player-controller.ts";

export type WeaponActionType = "idle" | "reload-tactical" | "reload-empty" | "press-check" | "dry-fire";

export interface WeaponActionState {
  type: WeaponActionType;
  progress: number;
  slideLocked: boolean;
}

export class PistolView {
  readonly root: pc.Entity;
  private readonly handRoot: pc.Entity;
  private readonly pistolRoot: pc.Entity;
  private readonly slide: pc.Entity;
  private readonly magazine: pc.Entity;
  private readonly looseMagazine: pc.Entity;
  private readonly leftHand: pc.Entity;
  private readonly rightHand: pc.Entity;
  private readonly muzzle: pc.Entity;
  private readonly ejectionPort: pc.Entity;
  private readonly muzzleFlash: pc.Entity;
  private recoilKick = 0;
  private recoilYaw = 0;
  private flashTimer = 0;
  private time = 0;

  constructor(parent: pc.Entity, materials: TownMaterials) {
    this.root = createPivot(parent, "viewmodel-root", [0.18, -0.2, -0.35]);
    this.handRoot = createPivot(this.root, "viewmodel-hands");
    this.pistolRoot = createPivot(this.handRoot, "pistol-root");
    this.rightHand = this.createHand(this.handRoot, materials, [0.11, -0.02, 0.04]);
    this.leftHand = this.createHand(this.handRoot, materials, [-0.06, -0.05, 0.12]);
    this.slide = createPivot(this.pistolRoot, "slide");
    this.magazine = createPivot(this.pistolRoot, "magazine");
    this.looseMagazine = createPivot(this.handRoot, "loose-magazine");
    this.looseMagazine.enabled = false;

    createPrimitive({
      name: "pistol-frame",
      type: "box",
      parent: this.pistolRoot,
      position: [0, 0, 0],
      scale: [0.14, 0.12, 0.46],
      material: materials.matteBlack
    });
    createPrimitive({
      name: "trigger-guard",
      type: "box",
      parent: this.pistolRoot,
      position: [0, -0.045, 0.06],
      scale: [0.1, 0.05, 0.12],
      material: materials.matteBlack
    });
    createPrimitive({
      name: "grip",
      type: "box",
      parent: this.pistolRoot,
      position: [0, -0.14, 0.02],
      rotation: [10, 0, 0],
      scale: [0.11, 0.22, 0.16],
      material: materials.matteBlack
    });
    createPrimitive({
      name: "slide-body",
      type: "box",
      parent: this.slide,
      position: [0, 0.06, -0.02],
      scale: [0.13, 0.09, 0.42],
      material: materials.matteBlack
    });
    createPrimitive({
      name: "barrel",
      type: "box",
      parent: this.pistolRoot,
      position: [0, 0.045, -0.22],
      scale: [0.055, 0.04, 0.18],
      material: materials.iron
    });
    createPrimitive({
      name: "front-sight",
      type: "box",
      parent: this.slide,
      position: [0, 0.115, -0.2],
      scale: [0.02, 0.03, 0.02],
      material: materials.iron
    });
    createPrimitive({
      name: "rear-sight",
      type: "box",
      parent: this.slide,
      position: [0, 0.115, 0.1],
      scale: [0.04, 0.03, 0.03],
      material: materials.iron
    });
    createPrimitive({
      name: "magazine-body",
      type: "box",
      parent: this.magazine,
      position: [0, -0.18, 0.02],
      scale: [0.08, 0.2, 0.1],
      material: materials.matteBlack
    });
    createPrimitive({
      name: "loose-magazine-body",
      type: "box",
      parent: this.looseMagazine,
      position: [0, 0, 0],
      scale: [0.08, 0.2, 0.1],
      material: materials.matteBlack
    });

    this.muzzle = createPivot(this.slide, "muzzle", [0, 0.05, -0.29]);
    this.ejectionPort = createPivot(this.slide, "eject-port", [0.09, 0.06, -0.02]);
    this.muzzleFlash = createPrimitive({
      name: "muzzle-flash",
      type: "plane",
      parent: this.muzzle,
      position: [0, 0, 0],
      rotation: [0, 90, 0],
      scale: [0.16, 0.22, 0.16],
      material: materials.lampGlow,
      castShadows: false,
      receiveShadows: false
    });
    this.muzzleFlash.enabled = false;
  }

  update(dt: number, movement: MovementSnapshot, action: WeaponActionState): void {
    this.time += dt;
    this.recoilKick = lerp(this.recoilKick, 0, 1 - Math.exp(-PISTOL_CONFIG.recoilReturn * dt));
    this.recoilYaw = lerp(this.recoilYaw, 0, 1 - Math.exp(-PISTOL_CONFIG.recoilReturn * dt));
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.muzzleFlash.enabled = this.flashTimer > 0;

    const breathing = Math.sin(this.time * 1.65) * 0.004;
    const micro = Math.sin(this.time * 2.1 + 0.7) * 0.003;

    let posX = 0.18 + movement.bobX * 0.55 + movement.lookDelta.x * CAMERA_CONFIG.swayPosition + micro;
    let posY = -0.2 - movement.bobY * 0.38 + breathing + movement.landingOffset * 0.6;
    let posZ = -0.35 + this.recoilKick * 0.04;
    let rotX = movement.lookDelta.y * CAMERA_CONFIG.swayRotation - movement.speedAlpha * 0.5;
    let rotY = -movement.lookDelta.x * CAMERA_CONFIG.swayRotation * 0.6 + this.recoilYaw;
    let rotZ = movement.bobRoll * 0.5 - movement.lookDelta.x * 0.02;

    if (movement.isSprinting) {
      posX = lerp(posX, 0.26, 0.72);
      posY = lerp(posY, -0.34, 0.72);
      posZ = lerp(posZ, -0.24, 0.72);
      rotX = lerp(rotX, 18, 0.72);
      rotY = lerp(rotY, 8, 0.72);
      rotZ = lerp(rotZ, -15, 0.72);
    } else if (movement.isAirborne) {
      posY -= CAMERA_CONFIG.jumpPoseDrop;
      rotX += 5;
    }

    const actionPose = this.sampleActionPose(action);
    posX += actionPose.position.x;
    posY += actionPose.position.y;
    posZ += actionPose.position.z;
    rotX += actionPose.rotation.x;
    rotY += actionPose.rotation.y;
    rotZ += actionPose.rotation.z;

    this.root.setLocalPosition(posX, posY, posZ);
    this.root.setLocalEulerAngles(rotX, rotY, rotZ);
    this.slide.setLocalPosition(0, 0, actionPose.slide);
    this.magazine.setLocalPosition(0, actionPose.magazineY, 0);
    this.looseMagazine.enabled = actionPose.showLooseMagazine;
    this.looseMagazine.setLocalPosition(
      actionPose.looseMagazineX,
      actionPose.looseMagazineY,
      actionPose.looseMagazineZ
    );
    this.leftHand.setLocalPosition(
      -0.06 + actionPose.leftHandX,
      -0.05 + actionPose.leftHandY,
      0.12 + actionPose.leftHandZ
    );
    this.leftHand.setLocalEulerAngles(actionPose.leftHandPitch, actionPose.leftHandYaw, actionPose.leftHandRoll);
    this.rightHand.setLocalEulerAngles(0, 0, 0);
  }

  triggerRecoil(): void {
    this.recoilKick += 1;
    this.recoilYaw += (Math.random() - 0.5) * PISTOL_CONFIG.recoilYawKick;
    this.flashTimer = PISTOL_CONFIG.muzzleFlashSeconds;
  }

  getMuzzlePosition(): pc.Vec3 {
    return this.muzzle.getPosition().clone();
  }

  getEjectionPosition(): pc.Vec3 {
    return this.ejectionPort.getPosition().clone();
  }

  private createHand(parent: pc.Entity, materials: TownMaterials, position: [number, number, number]): pc.Entity {
    const root = createPivot(parent, `hand-${position.join("-")}`, position);
    createPrimitive({
      name: "wrist",
      type: "box",
      parent: root,
      position: [0, -0.06, 0.08],
      rotation: [8, 0, 0],
      scale: [0.12, 0.12, 0.22],
      material: materials.glove
    });
    createPrimitive({
      name: "palm",
      type: "box",
      parent: root,
      position: [0, 0, 0],
      rotation: [18, 0, 0],
      scale: [0.12, 0.1, 0.18],
      material: materials.glove
    });
    createPrimitive({
      name: "thumb",
      type: "box",
      parent: root,
      position: [0.05, -0.02, 0.03],
      rotation: [0, 0, 36],
      scale: [0.04, 0.08, 0.06],
      material: materials.glove
    });
    return root;
  }

  private sampleActionPose(action: WeaponActionState) {
    const zero = {
      position: new pc.Vec3(0, 0, 0),
      rotation: new pc.Vec3(0, 0, 0),
      slide: action.slideLocked ? 0.12 : 0,
      magazineY: 0,
      showLooseMagazine: false,
      looseMagazineX: 0,
      looseMagazineY: 0,
      looseMagazineZ: 0,
      leftHandX: 0,
      leftHandY: 0,
      leftHandZ: 0,
      leftHandPitch: 0,
      leftHandYaw: 0,
      leftHandRoll: 0
    };

    if (action.type === "reload-tactical" || action.type === "reload-empty") {
      const p = clamp(action.progress, 0, 1);
      const lower = easeInOutCubic(clamp(p / 0.18, 0, 1));
      const magOut = easeInOutCubic(clamp((p - 0.18) / 0.18, 0, 1));
      const magIn = easeInOutCubic(clamp((p - 0.48) / 0.24, 0, 1));
      const recover = easeInOutCubic(clamp((p - 0.74) / 0.26, 0, 1));
      const rack = action.type === "reload-empty" ? easeInOutCubic(clamp((p - 0.76) / 0.14, 0, 1)) : 0;

      zero.position.set(0.08 * lower, -0.08 * lower, 0.1 * lower);
      zero.rotation.set(14 * lower - 6 * recover, -8 * lower, -22 * lower + 22 * recover);
      zero.magazineY = magOut > 0 && magIn < 1 ? -0.28 * magOut + 0.28 * magIn : 0;
      zero.showLooseMagazine = p > 0.22 && p < 0.7;
      zero.looseMagazineX = -0.11 - magOut * 0.08;
      zero.looseMagazineY = -0.21 + 0.06 * magIn;
      zero.looseMagazineZ = 0.1 + 0.08 * magOut - 0.1 * magIn;
      zero.leftHandX = -0.05 - magOut * 0.05;
      zero.leftHandY = 0.02 - 0.12 * magOut + 0.1 * magIn;
      zero.leftHandZ = 0.14 + 0.04 * magOut - 0.05 * magIn;
      zero.leftHandPitch = -18 * magOut + 10 * magIn;
      zero.leftHandYaw = -16 * magOut + 8 * magIn;
      zero.leftHandRoll = -12 * magOut;
      zero.slide = action.type === "reload-empty" ? (p > 0.86 ? 0.12 * (1 - rack) : 0.12) : 0;
      return zero;
    }

    if (action.type === "press-check") {
      const p = clamp(action.progress, 0, 1);
      const grasp = easeInOutCubic(clamp(p / 0.28, 0, 1));
      const inspect = Math.sin(clamp((p - 0.22) / 0.48, 0, 1) * Math.PI);
      const release = easeInOutCubic(clamp((p - 0.66) / 0.34, 0, 1));

      zero.position.set(-0.01 * grasp, -0.015 * grasp, 0.02 * grasp);
      zero.rotation.set(6 * grasp - 6 * release, 7 * inspect, -7 * inspect);
      zero.slide = inspect * 0.065;
      zero.leftHandX = -0.04 * grasp;
      zero.leftHandY = 0.04 * grasp;
      zero.leftHandZ = 0.08 * grasp;
      zero.leftHandPitch = -12 * inspect;
      zero.leftHandRoll = -18 * inspect;
      return zero;
    }

    if (action.type === "dry-fire") {
      const p = Math.sin(clamp(action.progress, 0, 1) * Math.PI);
      zero.position.set(0, 0.004 * p, 0.012 * p);
      zero.rotation.set(2.8 * p, 0, 0);
      return zero;
    }

    return zero;
  }
}
