import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { applyTextureSet, createEnvironmentTextureLibrary, TextureSet } from "../core/procedural-textures";
import { degrees, randRange, radians } from "../core/math";
import { CollisionWorld } from "./collision";
import { SkyDome } from "./sky";
import { Terrain } from "./terrain";

interface MaterialOptions {
  diffuse: [number, number, number];
  emissive?: [number, number, number];
  emissiveIntensity?: number;
  gloss?: number;
  metalness?: number;
  opacity?: number;
  cull?: number;
  blendType?: number;
  useLighting?: boolean;
  useFog?: boolean;
  depthWrite?: boolean;
  textures?: TextureSet;
}

export interface WorldScene {
  readonly root: pc.Entity;
  readonly terrain: Terrain;
  readonly playerSpawn: pc.Vec3;
  readonly enemySpawns: pc.Vec3[];
  readonly sky: SkyDome;
}

export class EnvironmentBuilder {
  private readonly app: pc.Application;
  private readonly root: pc.Entity;
  private readonly collision: CollisionWorld;

  constructor(app: pc.Application, root: pc.Entity, collision: CollisionWorld) {
    this.app = app;
    this.root = root;
    this.collision = collision;
  }

  build(): WorldScene {
    this.configureScene();

    const sky = new SkyDome(this.app, this.root);
    const worldRoot = new pc.Entity("world");
    this.root.addChild(worldRoot);

    const materials = this.createMaterialPalette();
    const terrain = new Terrain(this.app, worldRoot, materials.grass);
    this.createPath(worldRoot, terrain, materials.dirt);
    this.createRocks(worldRoot, terrain, materials.rock);
    this.createTrees(worldRoot, terrain, materials.wood, materials.leaf);
    this.createRuin(worldRoot, terrain, materials.stone, materials.trim);
    this.createFence(worldRoot, terrain, materials.wood, materials.trim);
    this.createWildflowers(worldRoot, terrain, materials.flowerA, materials.flowerB);
    this.createDistantCastle(
      worldRoot,
      terrain,
      materials.castleStone,
      materials.castleTrim,
      materials.castleGlow
    );

    const playerSpawnHeight = terrain.heightAt(
      GAME_CONFIG.world.playerSpawn.x,
      GAME_CONFIG.world.playerSpawn.z
    );
    const playerSpawn = new pc.Vec3(
      GAME_CONFIG.world.playerSpawn.x,
      playerSpawnHeight,
      GAME_CONFIG.world.playerSpawn.z
    );

    const enemySpawns = GAME_CONFIG.world.enemySpawns.map((spawn) => {
      const height = terrain.heightAt(spawn.x, spawn.z);
      return new pc.Vec3(spawn.x, height + 0.1, spawn.z);
    });

    return {
      root: worldRoot,
      terrain,
      playerSpawn,
      enemySpawns,
      sky
    };
  }

  private configureScene(): void {
    this.app.scene.ambientLight.set(0.46, 0.52, 0.42);
    this.app.scene.fog.type = pc.FOG_LINEAR;
    this.app.scene.fog.color.set(0.72, 0.84, 0.93);
    this.app.scene.fog.start = GAME_CONFIG.world.fogStart;
    this.app.scene.fog.end = GAME_CONFIG.world.fogEnd;

    const sun = new pc.Entity("sun");
    sun.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 0.96, 0.87),
      intensity: 1.75,
      castShadows: true,
      shadowDistance: 90,
      shadowBias: 0.22,
      normalOffsetBias: 0.05,
      shadowResolution: 2048
    });
    sun.setEulerAngles(44, 30, 0);
    this.root.addChild(sun);

    const skyFill = new pc.Entity("sky-fill");
    skyFill.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.52, 0.64, 0.78),
      intensity: 0.35
    });
    skyFill.setEulerAngles(330, 210, 0);
    this.root.addChild(skyFill);
  }

  private createMaterialPalette(): Record<string, pc.StandardMaterial> {
    const textures = createEnvironmentTextureLibrary(this.app.graphicsDevice);

    return {
      grass: this.createMaterial({
        diffuse: [0.26, 0.54, 0.22],
        emissive: [0.04, 0.06, 0.02],
        gloss: 0.28,
        metalness: 0.03,
        textures: textures.grass
      }),
      dirt: this.createMaterial({
        diffuse: [0.48, 0.34, 0.2],
        emissive: [0.05, 0.03, 0.01],
        gloss: 0.18,
        metalness: 0.02,
        textures: textures.dirt
      }),
      rock: this.createMaterial({
        diffuse: [0.46, 0.46, 0.44],
        emissive: [0.03, 0.03, 0.04],
        gloss: 0.22,
        metalness: 0.08,
        textures: textures.rock
      }),
      stone: this.createMaterial({
        diffuse: [0.58, 0.58, 0.55],
        emissive: [0.04, 0.04, 0.04],
        gloss: 0.3,
        metalness: 0.06,
        textures: textures.stone
      }),
      trim: this.createMaterial({
        diffuse: [0.3, 0.31, 0.33],
        emissive: [0.04, 0.05, 0.06],
        gloss: 0.54,
        metalness: 0.14,
        textures: textures.trim
      }),
      wood: this.createMaterial({
        diffuse: [0.35, 0.25, 0.16],
        emissive: [0.03, 0.02, 0.01],
        gloss: 0.22,
        metalness: 0.02,
        textures: textures.wood
      }),
      leaf: this.createMaterial({
        diffuse: [0.22, 0.44, 0.17],
        emissive: [0.03, 0.06, 0.02],
        gloss: 0.26,
        metalness: 0.01,
        textures: textures.leaf
      }),
      flowerA: this.createMaterial({
        diffuse: [0.94, 0.86, 0.38],
        emissive: [0.12, 0.11, 0.04],
        emissiveIntensity: 1.1,
        gloss: 0.4,
        metalness: 0.02,
        textures: textures.flowerA
      }),
      flowerB: this.createMaterial({
        diffuse: [0.76, 0.34, 0.42],
        emissive: [0.1, 0.03, 0.04],
        emissiveIntensity: 0.9,
        gloss: 0.4,
        metalness: 0.02,
        textures: textures.flowerB
      }),
      castleStone: this.createMaterial({
        diffuse: [0.16, 0.17, 0.22],
        emissive: [0.03, 0.03, 0.05],
        emissiveIntensity: 1.05,
        gloss: 0.24,
        metalness: 0.04,
        textures: textures.stone
      }),
      castleTrim: this.createMaterial({
        diffuse: [0.08, 0.09, 0.13],
        emissive: [0.03, 0.04, 0.07],
        emissiveIntensity: 1.15,
        gloss: 0.32,
        metalness: 0.08,
        textures: textures.trim
      }),
      castleGlow: this.createMaterial({
        diffuse: [0.2, 0.24, 0.34],
        emissive: [0.18, 0.28, 0.42],
        emissiveIntensity: 1.7,
        gloss: 0.38,
        metalness: 0.12,
        textures: textures.trim
      })
    };
  }

  private createPath(root: pc.Entity, terrain: Terrain, material: pc.StandardMaterial): void {
    for (let index = 0; index < terrain.pathNodes.length - 1; index += 1) {
      const current = terrain.pathNodes[index];
      const next = terrain.pathNodes[index + 1];
      const dx = next.x - current.x;
      const dz = next.z - current.z;
      const length = Math.hypot(dx, dz);
      const width = Math.max(current.width, next.width);
      const centerX = (current.x + next.x) * 0.5;
      const centerZ = (current.z + next.z) * 0.5;
      const centerY = terrain.heightAt(centerX, centerZ) + 0.05;
      const yaw = degrees(Math.atan2(dx, dz));

      const segment = this.addPrimitive(
        root,
        `path-${index}`,
        "box",
        material,
        new pc.Vec3(centerX, centerY, centerZ),
        new pc.Vec3(width, 0.12, length + 1.2),
        new pc.Vec3(0, yaw, 0)
      );

      segment.render!.castShadows = false;
    }
  }

  private createRocks(root: pc.Entity, terrain: Terrain, material: pc.StandardMaterial): void {
    const rocks = [
      { x: -20, z: 6, scale: [1.7, 1.1, 1.4] },
      { x: -16, z: 16, scale: [1.2, 0.9, 1.1] },
      { x: -10, z: -8, scale: [2.1, 1.4, 1.7] },
      { x: -3, z: 14, scale: [1.4, 0.8, 1.2] },
      { x: 4, z: 18, scale: [1.8, 1.1, 1.5] },
      { x: 9, z: -4, scale: [1.5, 0.9, 1.2] },
      { x: 15, z: -10, scale: [2.2, 1.3, 1.8] },
      { x: 20, z: 14, scale: [1.3, 0.9, 1.1] }
    ];

    for (const [index, rock] of rocks.entries()) {
      const y = terrain.heightAt(rock.x, rock.z);
      const entity = this.addPrimitive(
        root,
        `rock-${index}`,
        "sphere",
        material,
        new pc.Vec3(rock.x, y + rock.scale[1] * 0.34, rock.z),
        new pc.Vec3(rock.scale[0], rock.scale[1], rock.scale[2]),
        new pc.Vec3(randRange(-14, 14), randRange(0, 360), randRange(-10, 10))
      );

      this.addPrimitive(
        entity,
        `rock-cap-${index}`,
        "box",
        material,
        new pc.Vec3(0.18, 0.18, -0.1),
        new pc.Vec3(0.44, 0.26, 0.3),
        new pc.Vec3(12, 26, -8)
      );

      const radiusX = rock.scale[0] * 0.48;
      const radiusZ = rock.scale[2] * 0.48;
      this.collision.addAabb(
        rock.x - radiusX,
        y - 0.2,
        rock.z - radiusZ,
        rock.x + radiusX,
        y + rock.scale[1] * 0.72,
        rock.z + radiusZ
      );
    }
  }

  private createTrees(
    root: pc.Entity,
    terrain: Terrain,
    trunkMaterial: pc.StandardMaterial,
    leafMaterial: pc.StandardMaterial
  ): void {
    const trees = [
      { x: -26, z: -4, height: 3.2, canopy: 2.2 },
      { x: -24, z: 13, height: 3.6, canopy: 2.4 },
      { x: -8, z: 24, height: 2.8, canopy: 1.9 },
      { x: 17, z: 21, height: 3.3, canopy: 2.2 },
      { x: 24, z: 5, height: 3.5, canopy: 2.4 },
      { x: 26, z: -11, height: 3.1, canopy: 2.1 }
    ];

    for (const [index, tree] of trees.entries()) {
      const y = terrain.heightAt(tree.x, tree.z);
      const trunk = this.addPrimitive(
        root,
        `tree-trunk-${index}`,
        "cylinder",
        trunkMaterial,
        new pc.Vec3(tree.x, y + tree.height * 0.5, tree.z),
        new pc.Vec3(0.45, tree.height, 0.45)
      );

      this.addPrimitive(
        trunk,
        `tree-canopy-main-${index}`,
        "sphere",
        leafMaterial,
        new pc.Vec3(0, tree.height * 0.52, 0),
        new pc.Vec3(tree.canopy, tree.canopy * 0.92, tree.canopy)
      );

      this.addPrimitive(
        trunk,
        `tree-canopy-top-${index}`,
        "cone",
        leafMaterial,
        new pc.Vec3(0, tree.height * 0.92, 0),
        new pc.Vec3(tree.canopy * 0.9, tree.canopy * 1.15, tree.canopy * 0.9)
      );

      this.collision.addAabb(
        tree.x - 0.38,
        y - 0.1,
        tree.z - 0.38,
        tree.x + 0.38,
        y + tree.height,
        tree.z + 0.38
      );
    }
  }

  private createRuin(
    root: pc.Entity,
    terrain: Terrain,
    stoneMaterial: pc.StandardMaterial,
    trimMaterial: pc.StandardMaterial
  ): void {
    const center = new pc.Vec3(6, terrain.heightAt(6, -7), -7);
    const ruin = new pc.Entity("ruin");
    ruin.setLocalPosition(center);
    root.addChild(ruin);

    const wallDefinitions = [
      { pos: [0, 1.2, -2.8], scale: [7.2, 2.4, 0.65] },
      { pos: [-3.25, 1.2, 0.2], scale: [0.65, 2.4, 5.1] },
      { pos: [3.2, 0.9, -0.4], scale: [0.65, 1.8, 4.2] },
      { pos: [0.8, 0.55, 2.55], scale: [3.6, 1.1, 0.7] }
    ];

    for (const [index, wall] of wallDefinitions.entries()) {
      this.addPrimitive(
        ruin,
        `ruin-wall-${index}`,
        "box",
        stoneMaterial,
        new pc.Vec3(wall.pos[0], wall.pos[1], wall.pos[2]),
        new pc.Vec3(wall.scale[0], wall.scale[1], wall.scale[2])
      );

      this.collision.addAabb(
        center.x + wall.pos[0] - wall.scale[0] * 0.5,
        center.y,
        center.z + wall.pos[2] - wall.scale[2] * 0.5,
        center.x + wall.pos[0] + wall.scale[0] * 0.5,
        center.y + wall.scale[1],
        center.z + wall.pos[2] + wall.scale[2] * 0.5
      );
    }

    const archLeft = this.addPrimitive(
      ruin,
      "arch-left",
      "box",
      trimMaterial,
      new pc.Vec3(-1.35, 1.2, -0.5),
      new pc.Vec3(0.55, 2.4, 0.55)
    );

    const archRight = this.addPrimitive(
      ruin,
      "arch-right",
      "box",
      trimMaterial,
      new pc.Vec3(1.35, 1.2, -0.5),
      new pc.Vec3(0.55, 2.4, 0.55)
    );

    this.addPrimitive(
      archLeft,
      "broken-cap",
      "box",
      trimMaterial,
      new pc.Vec3(2.45, 0.95, 0),
      new pc.Vec3(1.9, 0.4, 0.55),
      new pc.Vec3(0, 0, -5)
    );

    this.addPrimitive(
      ruin,
      "altar",
      "box",
      stoneMaterial,
      new pc.Vec3(0.3, 0.38, 0.4),
      new pc.Vec3(1.8, 0.76, 1.2)
    );
  }

  private createFence(
    root: pc.Entity,
    terrain: Terrain,
    woodMaterial: pc.StandardMaterial,
    trimMaterial: pc.StandardMaterial
  ): void {
    const startX = 15;
    const startZ = 10;
    const segments = 5;

    for (let index = 0; index < segments; index += 1) {
      const x = startX + index * 2.1;
      const z = startZ + index * 1.2;
      const y = terrain.heightAt(x, z);
      const post = this.addPrimitive(
        root,
        `fence-post-${index}`,
        "box",
        woodMaterial,
        new pc.Vec3(x, y + 0.9, z),
        new pc.Vec3(0.18, 1.8, 0.18),
        new pc.Vec3(0, 10, 0)
      );

      if (index < segments - 1) {
        const nextX = startX + (index + 1) * 2.1;
        const nextZ = startZ + (index + 1) * 1.2;
        const centerX = (x + nextX) * 0.5;
        const centerZ = (z + nextZ) * 0.5;
        const centerY = terrain.heightAt(centerX, centerZ) + 1.1;
        const yaw = degrees(Math.atan2(nextX - x, nextZ - z));
        const distance = Math.hypot(nextX - x, nextZ - z);

        this.addPrimitive(
          root,
          `fence-rail-a-${index}`,
          "box",
          trimMaterial,
          new pc.Vec3(centerX, centerY, centerZ),
          new pc.Vec3(0.12, 0.12, distance + 0.18),
          new pc.Vec3(0, yaw, 0)
        );

        this.addPrimitive(
          root,
          `fence-rail-b-${index}`,
          "box",
          trimMaterial,
          new pc.Vec3(centerX, centerY - 0.42, centerZ),
          new pc.Vec3(0.12, 0.12, distance + 0.18),
          new pc.Vec3(0, yaw, 0)
        );
      }

      if (index === 2) {
        this.collision.addAabb(x - 0.22, y - 0.1, z - 0.22, x + 0.22, y + 1.8, z + 0.22);
      }

      post.render!.castShadows = true;
    }
  }

  private createWildflowers(
    root: pc.Entity,
    terrain: Terrain,
    materialA: pc.StandardMaterial,
    materialB: pc.StandardMaterial
  ): void {
    const anchors = [
      [-18, 10],
      [-10, 18],
      [-2, 11],
      [8, 8],
      [18, -4],
      [23, 18]
    ];

    for (const [index, [x, z]] of anchors.entries()) {
      const cluster = new pc.Entity(`flowers-${index}`);
      cluster.setLocalPosition(x, terrain.heightAt(x, z), z);
      root.addChild(cluster);

      for (let petal = 0; petal < 6; petal += 1) {
        const angle = (Math.PI * 2 * petal) / 6;
        const radius = 0.18 + petal * 0.015;
        const flowerMaterial = petal % 2 === 0 ? materialA : materialB;
        this.addPrimitive(
          cluster,
          `petal-${petal}`,
          "sphere",
          flowerMaterial,
          new pc.Vec3(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius),
          new pc.Vec3(0.08, 0.04, 0.08)
        );
      }

      this.addPrimitive(
        cluster,
        "stem",
        "cylinder",
        materialB,
        new pc.Vec3(0, 0.12, 0),
        new pc.Vec3(0.03, 0.24, 0.03)
      ).render!.castShadows = false;
    }
  }

  private createDistantCastle(
    root: pc.Entity,
    terrain: Terrain,
    castleStone: pc.StandardMaterial,
    castleTrim: pc.StandardMaterial,
    castleGlow: pc.StandardMaterial
  ): void {
    const castleX = GAME_CONFIG.world.distantCastle.x;
    const castleZ = GAME_CONFIG.world.distantCastle.z;
    const baseY = terrain.heightAt(castleX, castleZ) + 1.4;
    const castle = new pc.Entity("distant-castle");
    castle.setLocalPosition(castleX, baseY, castleZ);
    castle.setLocalEulerAngles(0, GAME_CONFIG.world.distantCastle.rotationY, 0);
    root.addChild(castle);

    this.addPrimitive(
      castle,
      "castle-mesa",
      "cylinder",
      castleStone,
      new pc.Vec3(0, 9.5, 0),
      new pc.Vec3(18, 19, 16)
    );
    this.addPrimitive(
      castle,
      "castle-ridge-front",
      "sphere",
      castleStone,
      new pc.Vec3(0, 4.4, 5.4),
      new pc.Vec3(19, 8.6, 12.5)
    );
    this.addPrimitive(
      castle,
      "castle-ridge-back",
      "sphere",
      castleStone,
      new pc.Vec3(-1.5, 6.2, -5.8),
      new pc.Vec3(15, 9.5, 12.5)
    );

    this.addPrimitive(
      castle,
      "castle-keep",
      "box",
      castleStone,
      new pc.Vec3(0, 26, -1),
      new pc.Vec3(9.5, 26, 11.5)
    );
    this.addPrimitive(
      castle,
      "castle-keep-top",
      "box",
      castleTrim,
      new pc.Vec3(0, 40.5, -1),
      new pc.Vec3(11.5, 3.2, 13.5)
    );
    this.addPrimitive(
      castle,
      "castle-gatehouse",
      "box",
      castleTrim,
      new pc.Vec3(0, 16.2, 10.4),
      new pc.Vec3(10.5, 9.5, 4.2)
    );
    this.addPrimitive(
      castle,
      "castle-wall-left",
      "box",
      castleStone,
      new pc.Vec3(-11.5, 16, 4),
      new pc.Vec3(3.2, 8.8, 15.5)
    );
    this.addPrimitive(
      castle,
      "castle-wall-right",
      "box",
      castleStone,
      new pc.Vec3(11.5, 16.4, 2.2),
      new pc.Vec3(3.2, 9.2, 15.5)
    );
    this.addPrimitive(
      castle,
      "castle-back-wall",
      "box",
      castleStone,
      new pc.Vec3(0, 15.5, -11.2),
      new pc.Vec3(20.5, 8.2, 3.1)
    );

    const towerAnchors = [
      { x: -10.8, z: -9.2, height: 28, radius: 4.4 },
      { x: 10.8, z: -8.8, height: 30, radius: 4.6 },
      { x: -13.8, z: 10.4, height: 25, radius: 3.8 },
      { x: 13.8, z: 9.8, height: 24, radius: 3.8 }
    ];

    for (const [index, tower] of towerAnchors.entries()) {
      this.addPrimitive(
        castle,
        `castle-tower-${index}`,
        "cylinder",
        castleStone,
        new pc.Vec3(tower.x, tower.height * 0.5 + 9, tower.z),
        new pc.Vec3(tower.radius, tower.height, tower.radius)
      );
      this.addPrimitive(
        castle,
        `castle-spire-${index}`,
        "cone",
        castleTrim,
        new pc.Vec3(tower.x, tower.height + 18, tower.z),
        new pc.Vec3(tower.radius * 0.9, 14, tower.radius * 0.9)
      );
    }

    const windowRows = [
      { y: 20, z: 5.1 },
      { y: 27, z: 5.2 },
      { y: 34, z: 5.3 }
    ];

    for (const [rowIndex, row] of windowRows.entries()) {
      for (const offsetX of [-2.8, 0, 2.8]) {
        this.addPrimitive(
          castle,
          `castle-window-${rowIndex}-${offsetX}`,
          "box",
          castleGlow,
          new pc.Vec3(offsetX, row.y, row.z),
          new pc.Vec3(0.7, 1.8, 0.2)
        ).render!.castShadows = false;
      }
    }

    this.addPrimitive(
      castle,
      "castle-obelisk",
      "cone",
      castleGlow,
      new pc.Vec3(0, 49.5, -0.8),
      new pc.Vec3(2.2, 10, 2.2)
    ).render!.castShadows = false;
  }

  private addPrimitive(
    parent: pc.Entity,
    name: string,
    type: "box" | "sphere" | "cylinder" | "cone",
    material: pc.Material,
    position: pc.Vec3,
    scale: pc.Vec3,
    rotation?: pc.Vec3
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

    if (rotation) {
      entity.setLocalEulerAngles(rotation);
    }

    parent.addChild(entity);
    return entity;
  }

  private createMaterial(options: MaterialOptions): pc.StandardMaterial {
    const material = new pc.StandardMaterial();
    material.diffuse.set(...options.diffuse);
    material.useMetalness = true;
    material.metalness = options.metalness ?? 0.05;
    material.gloss = options.gloss ?? 0.34;
    material.opacity = options.opacity ?? 1;
    material.opacityFadesSpecular = true;
    material.useLighting = options.useLighting ?? true;
    material.useFog = options.useFog ?? true;
    material.depthWrite = options.depthWrite ?? true;

    if (options.emissive) {
      material.emissive.set(...options.emissive);
      material.emissiveIntensity = options.emissiveIntensity ?? 1;
    }

    applyTextureSet(material, options.textures);

    if (options.opacity !== undefined && options.opacity < 1) {
      material.blendType = options.blendType ?? pc.BLEND_NORMAL;
    } else if (options.blendType !== undefined) {
      material.blendType = options.blendType;
    }

    if (options.cull !== undefined) {
      material.cull = options.cull;
    }

    material.update();
    return material;
  }
}
