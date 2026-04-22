import * as pc from "playcanvas";

import {
  DEFAULT_SETTINGS,
  GAME_CONFIG,
  PISTOL_CONFIG,
  STORAGE_KEYS,
  type RuntimeSettings
} from "@/core/config.ts";
import { InputManager } from "@/core/input.ts";
import { clamp } from "@/core/math.ts";
import { AudioManager } from "@/audio/audio-manager.ts";
import { EffectsSystem } from "@/fx/effects-system.ts";
import { buildTownLevel } from "@/level/town-builder.ts";
import { PlayerController } from "@/player/player-controller.ts";
import { TargetCourse } from "@/targets/target-course.ts";
import { HudController, type GamePhase } from "@/ui/hud.ts";
import { PistolController } from "@/weapons/pistol-controller.ts";

interface RunStats {
  shotsFired: number;
  targetsHit: number;
}

export class GameController {
  private readonly app: pc.Application;
  private readonly input: InputManager;
  private readonly hud: HudController;
  private readonly audio = new AudioManager();
  private readonly effects: EffectsSystem;
  private readonly player: PlayerController;
  private readonly weapon: PistolController;
  private readonly targets: TargetCourse;
  private readonly settings: RuntimeSettings;
  private readonly town: ReturnType<typeof buildTownLevel>;
  private phase: GamePhase = "intro";
  private timer: number = GAME_CONFIG.courseTimeSeconds;
  private stats: RunStats = {
    shotsFired: 0,
    targetsHit: 0
  };
  private restartCooldown = 0;

  constructor(private readonly canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.settings = this.loadSettings();
    this.app = this.createApp();
    this.town = buildTownLevel(this.app);
    this.input = new InputManager(canvas);
    this.hud = new HudController(uiRoot, this.settings);
    this.player = new PlayerController(this.app, this.town.collisionWorld);
    this.player.reset(this.town.playerSpawn);
    this.weapon = new PistolController(this.player.weaponAnchor, this.town.materials);
    this.targets = new TargetCourse(this.app, this.town.targetSpawns, this.town.materials);
    this.effects = new EffectsSystem(this.app);

    this.hud.bind({
      onStart: () => {
        void this.beginRun();
      },
      onResume: () => {
        void this.resumeFromPause();
      },
      onRestart: () => {
        void this.beginRun();
      },
      onSensitivityChange: (value) => {
        this.settings.mouseSensitivity = value;
        this.persistSettings();
      },
      onVolumeChange: (value) => {
        this.settings.masterVolume = value;
        this.audio.setVolume(value);
        this.persistSettings();
      }
    });

    this.audio.setVolume(this.settings.masterVolume);
    this.hud.updateSettings(this.settings);
    this.hud.setPhase("intro");
    this.hud.setObjective(this.targets.remainingCount(), this.targets.totalCount());
    this.hud.setAmmo(this.weapon.getAmmo().current, this.weapon.getAmmo().reserve);
    this.hud.setTimer(this.timer);

    this.input.onPointerLockChange((locked) => {
      if (!locked && this.phase === "playing") {
        this.pauseRun();
      }
    });

    this.app.on("update", (rawDt: number) => this.update(Math.min(rawDt, 1 / 20)));
  }

  private createApp(): pc.Application {
    const app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(document.body),
      touch: new pc.TouchDevice(document.body)
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.start();
    window.addEventListener("resize", () => app.resizeCanvas());
    return app;
  }

  private update(dt: number): void {
    this.input.beginFrame();
    this.restartCooldown = Math.max(0, this.restartCooldown - dt);

    if (this.phase === "playing" && this.input.wasPressed("Escape")) {
      this.pauseRun();
    } else if (this.phase === "paused" && this.input.wasPressed("Escape")) {
      void this.resumeFromPause();
    }

    const movement = this.player.update(dt, this.input, this.settings, this.phase === "playing");
    const movementEvents = this.player.consumeMovementEvents();
    this.weapon.update(dt, movement);
    this.targets.update(dt);
    this.effects.update(dt);
    this.audio.update(dt, this.phase === "playing");

    if (movementEvents.footstepSurface) {
      this.audio.playFootstep(movementEvents.footstepSurface, movement.isSprinting ? 1.2 : 0.85);
    }

    if (movementEvents.jumpTriggered) {
      this.audio.playJump();
    }

    if (movementEvents.landingIntensity > 0) {
      this.audio.playLand(movementEvents.landingIntensity);
    }

    for (const cue of this.weapon.consumeAudioCues()) {
      if (cue === "shot") {
        this.audio.playShot();
      } else if (cue === "dry-fire") {
        this.audio.playDryFire();
      } else if (cue === "reload-out") {
        this.audio.playReloadOut();
      } else if (cue === "reload-in") {
        this.audio.playReloadIn();
      } else if (cue === "slide-rack") {
        this.audio.playSlideRack();
      } else if (cue === "press-check") {
        this.audio.playPressCheck();
      }
    }

    if (this.phase === "playing") {
      this.handleWeaponInput(movement.isSprinting);
      this.timer = Math.max(0, this.timer - dt);

      if (this.targets.remainingCount() === 0) {
        this.phase = "won";
        this.hud.setPhase("won", this.formatStats());
        this.input.exitPointerLock();
      } else if (this.timer <= 0) {
        this.phase = "lost";
        this.hud.setPhase("lost", this.formatStats());
        this.input.exitPointerLock();
      }
    } else if ((this.phase === "won" || this.phase === "lost") && this.input.wasPressed("KeyR") && this.restartCooldown <= 0) {
      void this.beginRun();
    }

    const ammo = this.weapon.getAmmo();
    this.hud.setAmmo(ammo.current, ammo.reserve);
    this.hud.setTimer(this.timer);
    this.hud.setObjective(this.targets.remainingCount(), this.targets.totalCount());
    this.hud.setStatus(this.weapon.getStatusMessage());
    this.input.endFrame();
  }

  private async beginRun(): Promise<void> {
    await this.audio.resume();
    this.phase = "playing";
    this.timer = GAME_CONFIG.courseTimeSeconds;
    this.stats = {
      shotsFired: 0,
      targetsHit: 0
    };
    this.restartCooldown = GAME_CONFIG.restartDelaySeconds;
    this.player.reset(this.town.playerSpawn);
    this.weapon.reset();
    this.targets.reset();
    this.hud.setPhase("playing");
    this.hud.setStatus("");
    this.input.requestPointerLock();
  }

  private async resumeFromPause(): Promise<void> {
    await this.audio.resume();
    this.phase = "playing";
    this.hud.setPhase("playing");
    this.input.requestPointerLock();
  }

  private pauseRun(): void {
    if (this.phase !== "playing") {
      return;
    }

    this.phase = "paused";
    this.hud.setPhase("paused", this.formatStats());
  }

  private handleWeaponInput(isSprinting: boolean): void {
    if (this.input.wasPressed("KeyR")) {
      this.weapon.tryReload();
      return;
    }

    if (this.input.wasPressed("KeyT")) {
      this.weapon.tryPressCheck();
      return;
    }

    if (!this.input.wasMousePressed(0)) {
      return;
    }

    const shot = this.weapon.tryFire(!isSprinting);

    if (shot.kind === "blocked") {
      return;
    }

    if (shot.kind === "dry-fire") {
      return;
    }

    this.stats.shotsFired += 1;
    this.player.addRecoil(PISTOL_CONFIG.recoilRotationKick, (Math.random() - 0.5) * PISTOL_CONFIG.recoilYawKick);

    const aim = this.player.getAimRay();
    const targetHit = this.targets.raycast(aim.origin, aim.direction, GAME_CONFIG.interactionDistance);
    const worldHit = this.town.collisionWorld.raycast(aim.origin, aim.direction, GAME_CONFIG.interactionDistance);

    if (targetHit && (!worldHit || targetHit.distance <= worldHit.distance)) {
      this.targets.hit(targetHit.target);
      this.effects.spawnImpact(targetHit.point, targetHit.normal, "metal");
      this.audio.playTargetImpact();
      this.audio.playTargetFall();
      this.hud.flashHitMarker();
      this.stats.targetsHit += 1;
    } else if (worldHit) {
      this.effects.spawnImpact(worldHit.point, worldHit.normal, worldHit.surface);
      this.audio.playImpact(worldHit.surface);
    }

    const side = new pc.Vec3();
    side.cross(aim.direction, pc.Vec3.UP).normalize();
    const ejectVelocity = side.mulScalar(1.6).add(pc.Vec3.UP.clone().mulScalar(1.2));

    this.effects.spawnCasing(this.weapon.getEjectionPosition(), ejectVelocity);
  }

  private formatStats(): string {
    const accuracy =
      this.stats.shotsFired === 0
        ? 0
        : Math.round((this.stats.targetsHit / this.stats.shotsFired) * 100);

    return `${this.stats.targetsHit} hits · ${this.stats.shotsFired} shots · ${accuracy}% accuracy`;
  }

  private loadSettings(): RuntimeSettings {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);

    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
      return {
        mouseSensitivity: clamp(parsed.mouseSensitivity ?? DEFAULT_SETTINGS.mouseSensitivity, 0.5, 2),
        masterVolume: clamp(parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume, 0, 1)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(): void {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
  }
}
