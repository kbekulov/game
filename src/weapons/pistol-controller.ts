import * as pc from "playcanvas";

import { PISTOL_CONFIG } from "@/core/config.ts";
import type { MovementSnapshot } from "@/player/player-controller.ts";
import type { TownMaterials } from "@/level/materials.ts";
import { PistolView, type WeaponActionState, type WeaponActionType } from "@/weapons/pistol-view.ts";

type AudioCue = "shot" | "dry-fire" | "reload-out" | "reload-in" | "slide-rack" | "press-check";

interface ActionRuntime {
  type: Exclude<WeaponActionType, "idle">;
  duration: number;
  elapsed: number;
  cuesPlayed: Set<AudioCue>;
  magTransferred: boolean;
}

export interface FireResult {
  kind: "blocked" | "dry-fire" | "shot";
  emptyAfterShot: boolean;
}

export class PistolController {
  readonly view: PistolView;
  private magazineAmmo = PISTOL_CONFIG.magazineSize;
  private reserveAmmo = PISTOL_CONFIG.reserveAmmo;
  private slideLocked = false;
  private timeSinceLastShot = PISTOL_CONFIG.fireInterval;
  private activeAction: ActionRuntime | null = null;
  private readonly audioCues: AudioCue[] = [];
  private chamberStatusMessage = "";
  private chamberStatusTimer = 0;

  constructor(parent: pc.Entity, materials: TownMaterials) {
    this.view = new PistolView(parent, materials);
  }

  reset(): void {
    this.magazineAmmo = PISTOL_CONFIG.magazineSize;
    this.reserveAmmo = PISTOL_CONFIG.reserveAmmo;
    this.slideLocked = false;
    this.timeSinceLastShot = PISTOL_CONFIG.fireInterval;
    this.activeAction = null;
    this.audioCues.length = 0;
    this.chamberStatusMessage = "";
    this.chamberStatusTimer = 0;
  }

  update(dt: number, movement: MovementSnapshot): void {
    this.timeSinceLastShot += dt;
    this.chamberStatusTimer = Math.max(0, this.chamberStatusTimer - dt);

    if (this.activeAction) {
      this.activeAction.elapsed += dt;
      const progress = Math.min(1, this.activeAction.elapsed / this.activeAction.duration);
      this.advanceAction(progress);

      if (progress >= 1) {
        this.activeAction = null;
      }
    }

    this.view.update(dt, movement, this.getActionState());
  }

  tryFire(canUseWeapon: boolean): FireResult {
    if (!canUseWeapon || this.activeAction) {
      return { kind: "blocked", emptyAfterShot: this.magazineAmmo === 0 };
    }

    if (this.timeSinceLastShot < PISTOL_CONFIG.fireInterval) {
      return { kind: "blocked", emptyAfterShot: this.magazineAmmo === 0 };
    }

    if (this.magazineAmmo <= 0) {
      this.activeAction = {
        type: "dry-fire",
        duration: PISTOL_CONFIG.dryFireDuration,
        elapsed: 0,
        cuesPlayed: new Set<AudioCue>(),
        magTransferred: false
      };
      this.audioCues.push("dry-fire");
      return { kind: "dry-fire", emptyAfterShot: true };
    }

    this.timeSinceLastShot = 0;
    this.magazineAmmo -= 1;
    this.slideLocked = this.magazineAmmo === 0;
    this.view.triggerRecoil();
    this.audioCues.push("shot");
    return { kind: "shot", emptyAfterShot: this.slideLocked };
  }

  tryReload(): boolean {
    if (this.activeAction || this.reserveAmmo <= 0 || this.magazineAmmo === PISTOL_CONFIG.magazineSize) {
      return false;
    }

    this.activeAction = {
      type: this.magazineAmmo === 0 ? "reload-empty" : "reload-tactical",
      duration:
        this.magazineAmmo === 0
          ? PISTOL_CONFIG.emptyReloadDuration
          : PISTOL_CONFIG.tacticalReloadDuration,
      elapsed: 0,
      cuesPlayed: new Set<AudioCue>(),
      magTransferred: false
    };
    return true;
  }

  tryPressCheck(): boolean {
    if (this.activeAction) {
      return false;
    }

    this.activeAction = {
      type: "press-check",
      duration: PISTOL_CONFIG.pressCheckDuration,
      elapsed: 0,
      cuesPlayed: new Set<AudioCue>(),
      magTransferred: false
    };
    this.chamberStatusMessage = this.magazineAmmo > 0 ? "Chamber check: ready." : "Chamber check: empty.";
    this.chamberStatusTimer = PISTOL_CONFIG.chamberCheckMessageDuration;
    return true;
  }

  getAmmo(): { current: number; reserve: number } {
    return {
      current: this.magazineAmmo,
      reserve: this.reserveAmmo
    };
  }

  getStatusMessage(): string {
    return this.chamberStatusTimer > 0 ? this.chamberStatusMessage : "";
  }

  consumeAudioCues(): AudioCue[] {
    const cues = [...this.audioCues];
    this.audioCues.length = 0;
    return cues;
  }

  getMuzzlePosition(): pc.Vec3 {
    return this.view.getMuzzlePosition();
  }

  getEjectionPosition(): pc.Vec3 {
    return this.view.getEjectionPosition();
  }

  isBusy(): boolean {
    return this.activeAction !== null;
  }

  private advanceAction(progress: number): void {
    if (!this.activeAction) {
      return;
    }

    if (this.activeAction.type === "reload-tactical" || this.activeAction.type === "reload-empty") {
      if (progress > 0.18 && !this.activeAction.cuesPlayed.has("reload-out")) {
        this.activeAction.cuesPlayed.add("reload-out");
        this.audioCues.push("reload-out");
      }

      if (progress > 0.58 && !this.activeAction.magTransferred) {
        const needed = PISTOL_CONFIG.magazineSize - this.magazineAmmo;
        const transferred = Math.min(needed, this.reserveAmmo);
        this.magazineAmmo += transferred;
        this.reserveAmmo -= transferred;
        this.slideLocked = false;
        this.activeAction.magTransferred = true;
        this.audioCues.push("reload-in");
      }

      if (
        this.activeAction.type === "reload-empty" &&
        progress > 0.84 &&
        !this.activeAction.cuesPlayed.has("slide-rack")
      ) {
        this.activeAction.cuesPlayed.add("slide-rack");
        this.audioCues.push("slide-rack");
      }
    }

    if (this.activeAction.type === "press-check" && progress > 0.2 && !this.activeAction.cuesPlayed.has("press-check")) {
      this.activeAction.cuesPlayed.add("press-check");
      this.audioCues.push("press-check");
    }
  }

  private getActionState(): WeaponActionState {
    if (!this.activeAction) {
      return {
        type: "idle",
        progress: 0,
        slideLocked: this.slideLocked
      };
    }

    return {
      type: this.activeAction.type,
      progress: Math.min(1, this.activeAction.elapsed / this.activeAction.duration),
      slideLocked: this.slideLocked
    };
  }
}
