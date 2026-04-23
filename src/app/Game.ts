import * as pc from "playcanvas";

import { GAME_CONFIG } from "./config";
import { AudioManager } from "../engine/audio";
import { InputManager } from "../engine/input";
import { CollisionWorld } from "../world/collision";
import { EnvironmentBuilder, WorldScene } from "../world/environment";
import { PlayerController } from "../player/controller";
import { PistolWeapon } from "../player/weapon";
import { EnemyDrone } from "../gameplay/enemy";
import { WorldPickup } from "../gameplay/pickup";
import { Hud } from "../ui/hud";
import { damp, randRange } from "../core/math";

type GameState = "intro" | "playing" | "lose";

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
  private readonly activeEnemies: EnemyDrone[] = [];
  private readonly pickups: WorldPickup[] = [];
  private readonly effectsRoot: pc.Entity;
  private readonly beamEffects: BeamEffect[] = [];
  private readonly playerBeamMaterial: pc.StandardMaterial;
  private readonly enemyBeamMaterial: pc.StandardMaterial;

  private state: GameState = "intro";
  private reticleKick = 0;
  private waveNumber = 0;
  private nextWaveTimer = 0;

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
    this.weapon = new PistolWeapon(this.app.graphicsDevice, this.player.weaponMount);
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
    this.world.sky.update(dt, this.player.getEyePosition());

    if (this.state === "intro") {
      this.input.endFrame();
      return;
    }

    if (this.state === "lose") {
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
    const weaponAudioCues = this.weapon.consumeAudioCues();

    if (shot) {
      this.audio.playGunshot();
      this.player.addRecoil(
        GAME_CONFIG.weapon.recoilPitch,
        (Math.random() - 0.5) * GAME_CONFIG.weapon.recoilYaw
      );
      this.reticleKick = Math.min(1, this.reticleKick + 0.85);
      this.handlePlayerShot(shot.origin, shot.direction, shot.maxDistance);
    }

    for (const cue of weaponAudioCues) {
      if (cue === "reload") {
        this.audio.playReload("reload");
      } else if (cue === "empty-reload") {
        this.audio.playReload("empty");
      } else if (cue === "dry-fire") {
        this.audio.playDryFire();
      }
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

    for (const enemy of this.activeEnemies) {
      const enemyShot = enemy.update(dt, playerEye, this.world.terrain, this.collision);

      if (enemyShot) {
        this.handleEnemyShot(enemyShot.origin, enemyShot.target, enemyShot.damage);
      }
    }

    this.updatePickups(dt);

    if (!this.player.isAlive()) {
      this.state = "lose";
      this.hud.showResult(
        true,
        "Mission Failed",
        `Wave ${Math.max(1, this.waveNumber)} broke through your position.`,
        "Press restart or tap R to drop back into the meadow."
      );
      this.input.endFrame();
      return;
    }

    this.updateWaveDirector(dt);
    this.updateHud(playerFrame.movementState, playerFrame.aiming);
    this.input.endFrame();
  };

  private resetMission(): void {
    this.prepareFreshRun();
    this.state = "intro";
  }

  private startPlaying(): void {
    this.state = "playing";
    this.resetPlayableState();
    this.canvas.focus();
    this.input.requestPointerLock();
    this.hud.showIntro(false);
    this.hud.showResult(false);
  }

  private resetPlayableState(): void {
    this.prepareFreshRun();
    this.hud.setObjective(this.getWaveObjective());
    this.updateHud("idle", false);
  }

  private prepareFreshRun(): void {
    this.player.reset(this.world.playerSpawn);
    this.weapon.reset();
    this.waveNumber = 0;
    this.nextWaveTimer = 0;
    this.reticleKick = 0;
    this.activeEnemies.splice(0, this.activeEnemies.length);
    this.enemies.forEach((enemy) => enemy.setDormant());
    this.clearPickups();
    this.clearBeams();
    this.spawnNextWave();
  }

  private spawnNextWave(): void {
    this.waveNumber += 1;
    this.nextWaveTimer = 0;

    const waveSize = Math.min(
      GAME_CONFIG.waves.startCount + (this.waveNumber - 1) * GAME_CONFIG.waves.countGrowth,
      GAME_CONFIG.waves.maxCount
    );
    const playerPosition = this.player.getPosition();

    this.ensureEnemyPool(waveSize);
    this.activeEnemies.splice(0, this.activeEnemies.length, ...this.enemies.slice(0, waveSize));

    this.activeEnemies.forEach((enemy, index) => {
      enemy.reset(this.selectWaveSpawn(index, playerPosition));
    });

    for (let index = waveSize; index < this.enemies.length; index += 1) {
      this.enemies[index].setDormant();
    }

    this.hud.setObjective(this.getWaveObjective());
  }

  private ensureEnemyPool(size: number): void {
    while (this.enemies.length < size) {
      const baseSpawn = this.world.enemySpawns[this.enemies.length % this.world.enemySpawns.length];
      this.enemies.push(new EnemyDrone(this.app, this.world.root, baseSpawn));
    }
  }

  private selectWaveSpawn(index: number, playerPosition: pc.Vec3): pc.Vec3 {
    const minDistance = GAME_CONFIG.waves.minPlayerDistance;
    let bestCandidate = this.world.enemySpawns[index % this.world.enemySpawns.length].clone();
    let bestDistance = -Infinity;

    for (let attempt = 0; attempt < this.world.enemySpawns.length * 4; attempt += 1) {
      const baseSpawn = this.world.enemySpawns[(index + attempt) % this.world.enemySpawns.length];
      const angle = randRange(0, Math.PI * 2);
      const radius = Math.sqrt(Math.random()) * GAME_CONFIG.waves.spawnOffsetRadius;
      const x = baseSpawn.x + Math.cos(angle) * radius;
      const z = baseSpawn.z + Math.sin(angle) * radius;
      const candidate = new pc.Vec3(x, this.world.terrain.heightAt(x, z) + 0.1, z);
      const distance = candidate.distance(playerPosition);

      if (distance >= minDistance) {
        return candidate;
      }

      if (distance > bestDistance) {
        bestDistance = distance;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private updateWaveDirector(dt: number): void {
    const aliveTargets = this.activeEnemies.filter((enemy) => enemy.isAlive()).length;

    if (aliveTargets > 0 || this.activeEnemies.length === 0) {
      this.nextWaveTimer = 0;
      return;
    }

    if (this.nextWaveTimer <= 0) {
      this.nextWaveTimer = GAME_CONFIG.waves.intermission;
      this.hud.setObjective(
        `Wave ${this.waveNumber} cleared. Sweep the drops and brace for the next push.`
      );
    }

    this.nextWaveTimer = Math.max(0, this.nextWaveTimer - dt);

    if (this.nextWaveTimer <= 0.001) {
      this.spawnNextWave();
    }
  }

  private handlePlayerShot(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): void {
    let closestEnemy: EnemyDrone | null = null;
    let closestDistance = maxDistance;

    for (const enemy of this.activeEnemies) {
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
      const destroyed = closestEnemy.applyDamage();
      this.audio.playHitConfirm();
      this.spawnBeam(origin, hitPoint, this.playerBeamMaterial, 0.08, 0.04);

      if (destroyed) {
        this.trySpawnPickup(closestEnemy.getPosition());
      }

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

  private trySpawnPickup(position: pc.Vec3): void {
    if (Math.random() > GAME_CONFIG.pickups.dropChance) {
      return;
    }

    const type = Math.random() < GAME_CONFIG.pickups.healthChance ? "health" : "ammo";
    const groundedPosition = new pc.Vec3(
      position.x,
      this.world.terrain.heightAt(position.x, position.z) + 0.08,
      position.z
    );

    this.pickups.push(new WorldPickup(this.world.root, type, groundedPosition));
  }

  private updatePickups(dt: number): void {
    const playerPosition = this.player.getPosition();

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (pickup.update(dt)) {
        this.pickups.splice(index, 1);
        continue;
      }

      if (!pickup.canCollect(playerPosition)) {
        continue;
      }

      const collected = pickup.type === "ammo"
        ? this.weapon.addReserveAmmo(GAME_CONFIG.pickups.ammoAmount) > 0
        : this.player.heal(GAME_CONFIG.pickups.healthAmount) > 0;

      if (!collected) {
        continue;
      }

      pickup.destroy();
      this.pickups.splice(index, 1);
    }
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

  private updateHud(movementState: string, aiming: boolean): void {
    const aliveTargets = this.activeEnemies.filter((enemy) => enemy.isAlive()).length;
    const weaponState = this.weapon.getActionLabel();
    const betweenWaves = this.nextWaveTimer > 0 && aliveTargets === 0;
    const statusText = betweenWaves
      ? "Resupply window"
      : aiming && weaponState === "Ready"
        ? "Focused aim"
        : movementState === "idle"
          ? weaponState
          : movementState;

    this.hud.setHealth(this.player.getHealth());
    this.hud.setTargets(aliveTargets, this.activeEnemies.length);
    this.hud.setAmmo(
      this.weapon.getAmmo(),
      this.weapon.getReserveAmmo(),
      betweenWaves
        ? `Wave ${this.waveNumber + 1} inbound`
        : aiming && weaponState === "Ready"
          ? "Focused aim active"
          : weaponState
    );
    this.hud.setState(statusText);
  }

  private getWaveObjective(): string {
    return `Wave ${this.waveNumber}: ${GAME_CONFIG.world.objectiveText}`;
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

  private clearBeams(): void {
    this.beamEffects.splice(0).forEach((effect) => effect.entity.destroy());
  }

  private clearPickups(): void {
    this.pickups.splice(0).forEach((pickup) => pickup.destroy());
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
