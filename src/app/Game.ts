import * as pc from "playcanvas";

import { GAME_CONFIG } from "./config";
import { AudioManager } from "../engine/audio";
import { InputManager } from "../engine/input";
import { CollisionWorld } from "../world/collision";
import { EnvironmentBuilder, WorldScene } from "../world/environment";
import { PlayerController } from "../player/controller";
import { PistolWeapon } from "../player/weapon";
import { EnemyDrone } from "../gameplay/enemy";
import { Hud } from "../ui/hud";
import { damp } from "../core/math";

type GameState = "intro" | "playing" | "win" | "lose";

interface BeamEffect {
  readonly entity: pc.Entity;
  readonly material: pc.StandardMaterial;
  life: number;
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly app: pc.Application;
  private readonly input: InputManager;
  private readonly hud: Hud;
  private readonly audio: AudioManager;
  private readonly collision = new CollisionWorld();
  private readonly world: WorldScene;
  private readonly player: PlayerController;
  private readonly weapon: PistolWeapon;
  private readonly enemies: EnemyDrone[] = [];
  private readonly effectsRoot: pc.Entity;
  private readonly beamEffects: BeamEffect[] = [];
  private readonly playerBeamMaterial: pc.StandardMaterial;
  private readonly enemyBeamMaterial: pc.StandardMaterial;

  private state: GameState = "intro";
  private reticleKick = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.app = new pc.Application(this.canvas, {
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      }
    });
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.start();

    this.input = new InputManager(this.canvas);
    this.hud = new Hud();
    this.audio = new AudioManager();

    this.world = new EnvironmentBuilder(this.app, this.app.root, this.collision).build();
    this.player = new PlayerController(this.app.root);
    this.weapon = new PistolWeapon(this.player.weaponMount);
    this.effectsRoot = new pc.Entity("effects");
    this.app.root.addChild(this.effectsRoot);

    this.playerBeamMaterial = this.createBeamMaterial([1, 0.88, 0.52], [1, 0.82, 0.38]);
    this.enemyBeamMaterial = this.createBeamMaterial([1, 0.4, 0.26], [1, 0.26, 0.16]);

    for (const spawn of this.world.enemySpawns) {
      this.enemies.push(new EnemyDrone(this.app, this.world.root, spawn));
    }

    this.resetMission();
    this.hud.showIntro(true);
    this.hud.showResult(false);
    this.hud.onEngage(() => {
      this.hud.showIntro(false);
      void this.audio.unlock();
      this.startPlaying();
    });
    this.hud.onRestart(() => {
      this.startPlaying();
    });

    this.canvas.addEventListener("click", this.onCanvasClick);
    this.app.on("update", this.update, this);
  }

  private readonly update = (dt: number): void => {
    this.reticleKick = damp(this.reticleKick, 0, 16, dt);
    this.hud.setReticleKick(this.reticleKick);
    this.audio.update(dt);
    this.updateBeams(dt);

    if (this.state === "intro") {
      this.input.endFrame();
      return;
    }

    if (this.state === "win" || this.state === "lose") {
      if (this.input.wasActionPressed("restart")) {
        this.startPlaying();
      }

      this.input.endFrame();
      return;
    }

    if (!this.input.isPointerLocked()) {
      this.hud.setState("Click viewport to resume");
      this.hud.setAmmo(this.weapon.getAmmo(), this.weapon.getReserveAmmo(), "Cursor released");
      this.input.endFrame();
      return;
    }

    const playerFrame = this.player.update(dt, this.input, this.world.terrain, this.collision);
    const shot = this.weapon.update(
      dt,
      this.input,
      playerFrame,
      this.player.getEyePosition(),
      this.player.getViewDirection()
    );

    if (shot) {
      this.audio.playGunshot();
      this.player.addRecoil(
        GAME_CONFIG.weapon.recoilPitch,
        (Math.random() - 0.5) * GAME_CONFIG.weapon.recoilYaw
      );
      this.reticleKick = Math.min(1, this.reticleKick + 0.85);
      this.handlePlayerShot(shot.origin, shot.direction, shot.maxDistance);
    } else if (this.weapon.getActionLabel() === "Dry fire") {
      this.audio.playDryFire();
    }

    const footsteps = this.player.consumeFootsteps();

    for (let step = 0; step < footsteps; step += 1) {
      this.audio.playFootstep(playerFrame.movementState === "sprint");
    }

    const landings = this.player.consumeLandings();

    if (landings.length > 0) {
      this.audio.playFootstep(false);
    }

    const playerEye = this.player.getEyePosition();

    for (const enemy of this.enemies) {
      const enemyShot = enemy.update(dt, playerEye, this.world.terrain, this.collision);

      if (enemyShot) {
        this.handleEnemyShot(enemyShot.origin, enemyShot.target, enemyShot.damage);
      }
    }

    this.updateHud(playerFrame.movementState);

    if (!this.player.isAlive()) {
      this.state = "lose";
      this.hud.showResult(
        true,
        "Mission Failed",
        "You were dropped in the meadow.",
        "Press restart or tap R to run the slice again."
      );
    } else if (this.enemies.every((enemy) => !enemy.isAlive())) {
      this.state = "win";
      this.hud.showResult(
        true,
        "Mission Clear",
        "The meadow is secure.",
        "Press restart or tap R to reset the vertical slice."
      );
    }

    this.input.endFrame();
  };

  private resetMission(): void {
    this.player.reset(this.world.playerSpawn);
    this.weapon.reset();

    this.enemies.forEach((enemy, index) => {
      enemy.reset(this.world.enemySpawns[index]);
    });

    this.beamEffects.splice(0).forEach((effect) => effect.entity.destroy());
    this.state = "intro";
    this.reticleKick = 0;
    this.updateHud("idle");
  }

  private startPlaying(): void {
    this.state = "playing";
    this.resetPlayableState();
    this.input.requestPointerLock();
    this.hud.showIntro(false);
    this.hud.showResult(false);
  }

  private resetPlayableState(): void {
    this.player.reset(this.world.playerSpawn);
    this.weapon.reset();
    this.enemies.forEach((enemy, index) => {
      enemy.reset(this.world.enemySpawns[index]);
    });
    this.beamEffects.splice(0).forEach((effect) => effect.entity.destroy());
    this.hud.setObjective(GAME_CONFIG.world.objectiveText);
    this.updateHud("idle");
  }

  private handlePlayerShot(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): void {
    let closestEnemy: EnemyDrone | null = null;
    let closestDistance = maxDistance;

    for (const enemy of this.enemies) {
      const hitDistance = enemy.raycast(origin, direction, maxDistance);

      if (hitDistance === null || hitDistance >= closestDistance) {
        continue;
      }

      const hitPoint = origin.clone().add(direction.clone().mulScalar(hitDistance));

      if (
        this.collision.isLineBlocked(
          origin,
          hitPoint,
          this.world.terrain.heightAt.bind(this.world.terrain)
        )
      ) {
        continue;
      }

      closestEnemy = enemy;
      closestDistance = hitDistance;
    }

    if (closestEnemy) {
      const hitPoint = origin.clone().add(direction.clone().mulScalar(closestDistance));
      closestEnemy.applyDamage();
      this.audio.playHitConfirm();
      this.spawnBeam(origin, hitPoint, this.playerBeamMaterial, 0.08, 0.04);
      return;
    }

    const worldImpact = this.collision.raycastWorld(
      origin,
      direction,
      maxDistance,
      this.world.terrain.heightAt.bind(this.world.terrain)
    );
    this.spawnBeam(origin, worldImpact, this.playerBeamMaterial, 0.07, 0.03);
  }

  private handleEnemyShot(origin: pc.Vec3, target: pc.Vec3, damage: number): void {
    const direction = target.clone().sub(origin).normalize();
    const endPoint = this.collision.raycastWorld(
      origin,
      direction,
      origin.distance(target),
      this.world.terrain.heightAt.bind(this.world.terrain)
    );
    const reachedPlayer = endPoint.distance(target) < 0.45;

    this.audio.playEnemyShot();
    this.spawnBeam(origin, endPoint, this.enemyBeamMaterial, 0.11, 0.03);

    if (reachedPlayer) {
      this.player.applyDamage(damage);
      this.audio.playDamage();
      this.hud.flashDamage();
    }
  }

  private updateHud(movementState: string): void {
    const aliveTargets = this.enemies.filter((enemy) => enemy.isAlive()).length;
    this.hud.setHealth(this.player.getHealth());
    this.hud.setTargets(aliveTargets, this.enemies.length);
    this.hud.setAmmo(
      this.weapon.getAmmo(),
      this.weapon.getReserveAmmo(),
      this.weapon.getActionLabel()
    );
    this.hud.setState(movementState === "idle" ? this.weapon.getActionLabel() : movementState);
  }

  private spawnBeam(
    start: pc.Vec3,
    end: pc.Vec3,
    material: pc.StandardMaterial,
    life: number,
    thickness: number
  ): void {
    const beam = new pc.Entity("beam");
    beam.addComponent("render", {
      type: "box",
      castShadows: false,
      receiveShadows: false
    });
    beam.render!.material = material;

    const direction = end.clone().sub(start);
    const length = direction.length();
    const midpoint = start.clone().add(end).mulScalar(0.5);

    beam.setPosition(midpoint);
    beam.lookAt(end);
    beam.setLocalScale(thickness, thickness, Math.max(0.08, length));
    this.effectsRoot.addChild(beam);

    this.beamEffects.push({
      entity: beam,
      material,
      life
    });
  }

  private updateBeams(dt: number): void {
    for (let index = this.beamEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.beamEffects[index];
      effect.life -= dt;

      if (effect.life <= 0) {
        effect.entity.destroy();
        this.beamEffects.splice(index, 1);
      }
    }
  }

  private createBeamMaterial(
    diffuse: [number, number, number],
    emissive: [number, number, number]
  ): pc.StandardMaterial {
    const material = new pc.StandardMaterial();
    material.diffuse.set(...diffuse);
    material.emissive.set(...emissive);
    material.emissiveIntensity = 2.6;
    material.useMetalness = true;
    material.metalness = 0.04;
    material.gloss = 0.92;
    material.update();
    return material;
  }

  private readonly onCanvasClick = (): void => {
    if (this.state === "playing" && !this.input.isPointerLocked()) {
      this.input.requestPointerLock();
    }
  };
}
