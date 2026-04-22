import * as pc from "playcanvas";

import { DEFAULT_SETTINGS, PLAYER_CONFIG, STORAGE_KEYS, WEAPON_CONFIG, type RuntimeSettings } from "@/core/config.ts";
import { InputManager } from "@/core/input.ts";
import { clamp } from "@/core/math.ts";
import { EnemyManager } from "@/enemies/enemy-manager.ts";
import { buildArena } from "@/level/arena-builder.ts";
import { PlayerController } from "@/player/player-controller.ts";
import { HudController, type GamePhase } from "@/ui/hud.ts";
import { RifleController } from "@/weapons/rifle-controller.ts";

interface RunStats {
  shotsFired: number;
  enemiesDropped: number;
}

export class GameController {
  private readonly app: pc.Application;
  private readonly input: InputManager;
  private readonly hud: HudController;
  private readonly arena: ReturnType<typeof buildArena>;
  private readonly player: PlayerController;
  private readonly weapon: RifleController;
  private readonly enemies: EnemyManager;
  private readonly settings: RuntimeSettings;
  private phase: GamePhase = "intro";
  private playerHealth = PLAYER_CONFIG.health;
  private stats: RunStats = {
    shotsFired: 0,
    enemiesDropped: 0
  };

  constructor(private readonly canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.settings = this.loadSettings();
    this.app = this.createApp();
    this.arena = buildArena(this.app);
    this.input = new InputManager(canvas);
    this.hud = new HudController(uiRoot, this.settings);
    this.player = new PlayerController(this.app, this.arena.collisionWorld, this.arena.materials);
    this.player.reset(this.arena.playerSpawn);
    this.weapon = new RifleController(this.player.weaponAnchor, this.arena.materials);
    this.enemies = new EnemyManager(this.app, this.arena.enemySpawns, this.arena.materials);
    this.enemies.reset();

    this.hud.bind({
      onStart: () => {
        this.beginRun();
      },
      onResume: () => {
        this.resumeRun();
      },
      onRestart: () => {
        this.beginRun();
      },
      onSensitivityChange: (value) => {
        this.settings.mouseSensitivity = value;
        this.persistSettings();
      }
    });

    this.hud.setPhase("intro");
    this.hud.setHealth(this.playerHealth);
    this.hud.setEnemies(this.enemies.remainingCount(), this.enemies.totalCount());
    this.hud.setAmmo(this.weapon.getAmmo().current, this.weapon.getAmmo().reserve);

    this.input.onPointerLockChange((locked) => {
      if (!locked && this.phase === "playing") {
        this.pauseRun();
      }
    });

    this.app.on("update", (rawDt: number) => this.update(Math.min(rawDt, 1 / 20)));
  }

  private createApp(): pc.Application {
    const app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(this.canvas),
      touch:
        "ontouchstart" in window || navigator.maxTouchPoints > 0
          ? new pc.TouchDevice(this.canvas)
          : undefined
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.start();
    window.addEventListener("resize", () => app.resizeCanvas());
    return app;
  }

  private update(dt: number): void {
    this.input.beginFrame();

    if (this.phase === "playing" && this.input.wasPressed("Escape")) {
      this.pauseRun();
    } else if (this.phase === "paused" && this.input.wasPressed("Escape")) {
      this.resumeRun();
    }

    const movement = this.player.update(dt, this.input, this.settings, this.phase === "playing");
    this.weapon.update(dt, movement);

    if (this.phase === "playing") {
      this.handleWeaponInput(movement.isSprinting);

      const enemyResult = this.enemies.update(dt, this.player.getTargetPoint(), this.arena.collisionWorld);
      this.playerHealth = Math.max(0, this.playerHealth - enemyResult.damageToPlayer);

      if (this.playerHealth <= 0) {
        this.phase = "lost";
        this.hud.setPhase("lost", this.formatStats());
        this.input.exitPointerLock();
      } else if (this.enemies.remainingCount() === 0) {
        this.phase = "won";
        this.hud.setPhase("won", this.formatStats());
        this.input.exitPointerLock();
      }
    } else if ((this.phase === "won" || this.phase === "lost") && this.input.wasPressed("KeyR")) {
      this.beginRun();
    }

    const ammo = this.weapon.getAmmo();
    this.hud.setHealth(this.playerHealth);
    this.hud.setAmmo(ammo.current, ammo.reserve);
    this.hud.setEnemies(this.enemies.remainingCount(), this.enemies.totalCount());
    this.hud.setStatus(this.weapon.getStatusMessage());
    this.input.endFrame();
  }

  private beginRun(): void {
    this.phase = "playing";
    this.playerHealth = PLAYER_CONFIG.health;
    this.stats = {
      shotsFired: 0,
      enemiesDropped: 0
    };
    this.player.reset(this.arena.playerSpawn);
    this.weapon.reset();
    this.enemies.reset();
    this.hud.setPhase("playing");
    this.hud.setStatus("");
    this.input.requestPointerLock();
  }

  private resumeRun(): void {
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

    if (!this.input.wasMousePressed(0)) {
      return;
    }

    const fireResult = this.weapon.tryFire(!isSprinting);

    if (fireResult !== "shot") {
      return;
    }

    this.stats.shotsFired += 1;

    const aim = this.player.getAimRay();
    const enemyHit = this.enemies.raycast(aim.origin, aim.direction, WEAPON_CONFIG.range);
    const worldHit = this.arena.collisionWorld.raycast(
      aim.origin,
      aim.direction,
      WEAPON_CONFIG.range,
      (collider) => collider.shootable ?? false
    );

    if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
      this.enemies.damageEnemy(enemyHit.enemy, WEAPON_CONFIG.damage);
      this.stats.enemiesDropped = this.enemies.totalCount() - this.enemies.remainingCount();
    }
  }

  private formatStats(): string {
    const accuracy =
      this.stats.shotsFired === 0
        ? 0
        : Math.round((this.stats.enemiesDropped / this.stats.shotsFired) * 100);

    return `${this.stats.enemiesDropped} down · ${this.stats.shotsFired} shots · ${accuracy}% clean`;
  }

  private loadSettings(): RuntimeSettings {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.settings);

      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
      return {
        mouseSensitivity: clamp(parsed.mouseSensitivity ?? DEFAULT_SETTINGS.mouseSensitivity, 0.5, 2)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(): void {
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
    } catch {
      // Ignore storage failures in restricted browsing contexts.
    }
  }
}
