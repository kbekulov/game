import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import {
  applyTextureSet,
  createEnvironmentTextureLibrary,
  TextureSet
} from "../core/procedural-textures";
import { randRange } from "../core/math";
import { CollisionWorld } from "./collision";
import { ElevatorSystem } from "./elevator";
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

export interface SkyController {
  update(dt: number, focus: pc.Vec3): void;
}

export interface WorldScene {
  readonly root: pc.Entity;
  readonly terrain: Terrain;
  readonly playerSpawn: pc.Vec3;
  readonly enemySpawns: pc.Vec3[];
  readonly sky: SkyController;
  readonly elevator: ElevatorSystem;
}

class NullSkyController implements SkyController {
  update(): void {}
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

    const worldRoot = new pc.Entity("world");
    this.root.addChild(worldRoot);

    const sky = new NullSkyController();
    const terrain = new Terrain();
    const materials = this.createMaterialPalette();
    const tower = new pc.Entity("office-tower");
    worldRoot.addChild(tower);

    this.createBuildingShell(tower, terrain, materials);
    this.createFloorLayout(tower, terrain, materials);
    this.createRoof(tower, terrain, materials);

    const elevator = new ElevatorSystem(tower, terrain, {
      frame: materials.elevatorFloor,
      trim: materials.trim,
      light: materials.lightPanel
    });

    return {
      root: worldRoot,
      terrain,
      playerSpawn: terrain.getPlayerSpawn(),
      enemySpawns: terrain.getEnemySpawns(),
      sky,
      elevator
    };
  }

  private configureScene(): void {
    this.app.scene.ambientLight.set(0.3, 0.32, 0.36);
    this.app.scene.fog.type = pc.FOG_NONE;

    const moonFill = new pc.Entity("window-fill");
    moonFill.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.76, 0.83, 0.96),
      intensity: 0.55,
      castShadows: true,
      shadowDistance: 48,
      shadowBias: 0.26,
      normalOffsetBias: 0.05,
      shadowResolution: 2048
    });
    moonFill.setEulerAngles(54, 38, 0);
    this.root.addChild(moonFill);

    const warmBounce = new pc.Entity("warm-bounce");
    warmBounce.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.92, 0.84, 0.72),
      intensity: 0.18
    });
    warmBounce.setEulerAngles(325, 205, 0);
    this.root.addChild(warmBounce);
  }

  private createMaterialPalette(): Record<string, pc.StandardMaterial> {
    const textures = createEnvironmentTextureLibrary(this.app.graphicsDevice);

    return {
      carpet: this.createMaterial({
        diffuse: [0.11, 0.14, 0.18],
        emissive: [0.02, 0.03, 0.04],
        gloss: 0.18,
        metalness: 0.02,
        textures: textures.trim
      }),
      wall: this.createMaterial({
        diffuse: [0.74, 0.76, 0.8],
        emissive: [0.03, 0.03, 0.04],
        gloss: 0.22,
        metalness: 0.02,
        textures: textures.stone
      }),
      ceiling: this.createMaterial({
        diffuse: [0.84, 0.86, 0.88],
        emissive: [0.02, 0.02, 0.02],
        gloss: 0.16,
        metalness: 0.02,
        textures: textures.stone
      }),
      trim: this.createMaterial({
        diffuse: [0.22, 0.26, 0.32],
        emissive: [0.03, 0.04, 0.06],
        gloss: 0.52,
        metalness: 0.16,
        textures: textures.trim
      }),
      glass: this.createMaterial({
        diffuse: [0.36, 0.5, 0.64],
        emissive: [0.08, 0.12, 0.16],
        emissiveIntensity: 1.35,
        gloss: 0.82,
        metalness: 0.08,
        opacity: 0.34,
        blendType: pc.BLEND_NORMAL,
        depthWrite: false,
        useFog: false,
        textures: textures.trim
      }),
      concrete: this.createMaterial({
        diffuse: [0.34, 0.36, 0.4],
        emissive: [0.03, 0.03, 0.04],
        gloss: 0.24,
        metalness: 0.04,
        textures: textures.rock
      }),
      wood: this.createMaterial({
        diffuse: [0.38, 0.28, 0.18],
        emissive: [0.03, 0.02, 0.01],
        gloss: 0.26,
        metalness: 0.03,
        textures: textures.wood
      }),
      accent: this.createMaterial({
        diffuse: [0.18, 0.34, 0.54],
        emissive: [0.05, 0.12, 0.18],
        emissiveIntensity: 1.15,
        gloss: 0.38,
        metalness: 0.05,
        textures: textures.trim
      }),
      foliage: this.createMaterial({
        diffuse: [0.22, 0.44, 0.27],
        emissive: [0.03, 0.05, 0.03],
        gloss: 0.28,
        metalness: 0.02,
        textures: textures.leaf
      }),
      lightPanel: this.createMaterial({
        diffuse: [0.92, 0.94, 0.98],
        emissive: [0.84, 0.9, 1],
        emissiveIntensity: 2.3,
        gloss: 0.48,
        metalness: 0.04,
        useFog: false,
        textures: textures.flowerA
      }),
      elevatorFloor: this.createMaterial({
        diffuse: [0.18, 0.2, 0.24],
        emissive: [0.03, 0.04, 0.06],
        gloss: 0.36,
        metalness: 0.12,
        textures: textures.trim
      })
    };
  }

  private createBuildingShell(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>
  ): void {
    const totalHeight =
      terrain.getFloorY(terrain.floorCount - 1) + terrain.floorHeight + 1;
    const halfWidth = terrain.halfWidth;
    const halfDepth = terrain.halfDepth;
    const wallThickness = GAME_CONFIG.world.building.wallThickness;

    this.addPrimitive(
      root,
      "foundation",
      "box",
      materials.concrete,
      new pc.Vec3(0, -0.55, 0),
      new pc.Vec3(halfWidth * 2 + 5, 1.1, halfDepth * 2 + 5)
    );

    this.addWindowFacade(root, "facade-north", materials, new pc.Vec3(0, totalHeight * 0.5, -halfDepth), new pc.Vec3(halfWidth * 2, totalHeight, wallThickness), "north");
    this.addWindowFacade(root, "facade-south", materials, new pc.Vec3(0, totalHeight * 0.5, halfDepth), new pc.Vec3(halfWidth * 2, totalHeight, wallThickness), "south");
    this.addWindowFacade(root, "facade-east", materials, new pc.Vec3(halfWidth, totalHeight * 0.5, 0), new pc.Vec3(wallThickness, totalHeight, halfDepth * 2), "east");
    this.addWindowFacade(root, "facade-west", materials, new pc.Vec3(-halfWidth, totalHeight * 0.5, 0), new pc.Vec3(wallThickness, totalHeight, halfDepth * 2), "west");

    this.collision.addAabb(-halfWidth, 0, -halfDepth, halfWidth, totalHeight, -halfDepth + wallThickness);
    this.collision.addAabb(-halfWidth, 0, halfDepth - wallThickness, halfWidth, totalHeight, halfDepth);
    this.collision.addAabb(halfWidth - wallThickness, 0, -halfDepth, halfWidth, totalHeight, halfDepth);
    this.collision.addAabb(-halfWidth, 0, -halfDepth, -halfWidth + wallThickness, totalHeight, halfDepth);

    const shaftWallHeight = totalHeight;
    const shaft = terrain.shaftHalfSize;

    this.addPrimitive(
      root,
      "shaft-north",
      "box",
      materials.trim,
      new pc.Vec3(0, shaftWallHeight * 0.5, -shaft),
      new pc.Vec3(shaft * 2, shaftWallHeight, wallThickness)
    );
    this.addPrimitive(
      root,
      "shaft-east",
      "box",
      materials.trim,
      new pc.Vec3(shaft, shaftWallHeight * 0.5, 0),
      new pc.Vec3(wallThickness, shaftWallHeight, shaft * 2)
    );
    this.addPrimitive(
      root,
      "shaft-west",
      "box",
      materials.trim,
      new pc.Vec3(-shaft, shaftWallHeight * 0.5, 0),
      new pc.Vec3(wallThickness, shaftWallHeight, shaft * 2)
    );

    this.collision.addAabb(-shaft, 0, -shaft, shaft, shaftWallHeight, -shaft + wallThickness);
    this.collision.addAabb(shaft - wallThickness, 0, -shaft, shaft, shaftWallHeight, shaft);
    this.collision.addAabb(-shaft, 0, -shaft, -shaft + wallThickness, shaftWallHeight, shaft);
  }

  private createFloorLayout(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>
  ): void {
    for (let floorIndex = 0; floorIndex < terrain.floorCount; floorIndex += 1) {
      const levelRoot = new pc.Entity(`floor-${floorIndex + 1}`);
      root.addChild(levelRoot);
      const y = terrain.getFloorY(floorIndex);

      this.createFloorRing(levelRoot, terrain, materials, y);
      this.createElevatorPortal(levelRoot, terrain, materials, y, floorIndex);
      this.createColumns(levelRoot, terrain, materials, y);
      this.createMeetingRooms(levelRoot, terrain, materials, y, floorIndex);
      this.createDeskClusters(levelRoot, terrain, materials, y, floorIndex);
      this.createPlanters(levelRoot, terrain, materials, y);
      this.createCeilingLights(levelRoot, terrain, materials, y);
    }
  }

  private createFloorRing(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number
  ): void {
    const slabThickness = GAME_CONFIG.world.building.slabThickness;
    const innerHalfWidth = terrain.halfWidth - GAME_CONFIG.world.building.wallThickness;
    const innerHalfDepth = terrain.halfDepth - GAME_CONFIG.world.building.wallThickness;
    const shaft = terrain.shaftHalfSize;
    const slabY = floorY - slabThickness * 0.5;
    const ceilingY = floorY + terrain.floorHeight - slabThickness * 0.5;

    const northDepth = innerHalfDepth - shaft;
    const southDepth = innerHalfDepth - shaft;
    const sideWidth = innerHalfWidth - shaft;

    const slabSegments = [
      new pc.Vec3(0, slabY, -(innerHalfDepth + shaft) * 0.5),
      new pc.Vec3(0, slabY, (innerHalfDepth + shaft) * 0.5),
      new pc.Vec3(-(innerHalfWidth + shaft) * 0.5, slabY, 0),
      new pc.Vec3((innerHalfWidth + shaft) * 0.5, slabY, 0)
    ];
    const slabScales = [
      new pc.Vec3(innerHalfWidth * 2, slabThickness, northDepth),
      new pc.Vec3(innerHalfWidth * 2, slabThickness, southDepth),
      new pc.Vec3(sideWidth, slabThickness, shaft * 2),
      new pc.Vec3(sideWidth, slabThickness, shaft * 2)
    ];

    for (const [index, segment] of slabSegments.entries()) {
      this.addPrimitive(root, `slab-${index}`, "box", materials.carpet, segment, slabScales[index]);
      this.addPrimitive(
        root,
        `ceiling-${index}`,
        "box",
        materials.ceiling,
        new pc.Vec3(segment.x, ceilingY, segment.z),
        slabScales[index]
      );

      this.collision.addAabb(
        segment.x - slabScales[index].x * 0.5,
        segment.y - slabScales[index].y * 0.5,
        segment.z - slabScales[index].z * 0.5,
        segment.x + slabScales[index].x * 0.5,
        segment.y + slabScales[index].y * 0.5,
        segment.z + slabScales[index].z * 0.5
      );
    }
  }

  private createElevatorPortal(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number,
    floorIndex: number
  ): void {
    const wallThickness = GAME_CONFIG.world.building.wallThickness;
    const shaft = terrain.shaftHalfSize;
    const portalHeight = terrain.floorHeight - 0.64;
    const portalY = floorY + portalHeight * 0.5;
    const headerY = floorY + portalHeight - 0.28;
    const doorWidth = GAME_CONFIG.world.building.elevatorHalfSize * 2 + 0.55;
    const jambWidth = shaft - doorWidth * 0.5;

    this.addPrimitive(
      root,
      `portal-left-${floorIndex}`,
      "box",
      materials.trim,
      new pc.Vec3(-(doorWidth * 0.5 + jambWidth * 0.5), portalY, shaft),
      new pc.Vec3(jambWidth, portalHeight, wallThickness)
    );
    this.addPrimitive(
      root,
      `portal-right-${floorIndex}`,
      "box",
      materials.trim,
      new pc.Vec3(doorWidth * 0.5 + jambWidth * 0.5, portalY, shaft),
      new pc.Vec3(jambWidth, portalHeight, wallThickness)
    );
    this.addPrimitive(
      root,
      `portal-header-${floorIndex}`,
      "box",
      materials.trim,
      new pc.Vec3(0, headerY, shaft),
      new pc.Vec3(doorWidth, 0.56, wallThickness)
    );
    this.addPrimitive(
      root,
      `portal-indicator-${floorIndex}`,
      "box",
      materials.lightPanel,
      new pc.Vec3(0, floorY + terrain.floorHeight - 0.55, shaft - 0.08),
      new pc.Vec3(0.9, 0.14, 0.08)
    ).render!.castShadows = false;

    this.collision.addAabb(-shaft, floorY, shaft - wallThickness, -doorWidth * 0.5, floorY + portalHeight, shaft);
    this.collision.addAabb(doorWidth * 0.5, floorY, shaft - wallThickness, shaft, floorY + portalHeight, shaft);
    this.collision.addAabb(-doorWidth * 0.5, floorY + portalHeight - 0.56, shaft - wallThickness, doorWidth * 0.5, floorY + portalHeight, shaft);
  }

  private createColumns(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number
  ): void {
    const columnPositions = [
      new pc.Vec3(-8.6, floorY + 2, -6.5),
      new pc.Vec3(8.6, floorY + 2, -6.5),
      new pc.Vec3(-8.6, floorY + 2, 6.5),
      new pc.Vec3(8.6, floorY + 2, 6.5)
    ];

    for (const [index, position] of columnPositions.entries()) {
      this.addPrimitive(root, `column-${index}`, "box", materials.wall, position, new pc.Vec3(0.72, 4, 0.72));
      this.collision.addAabb(
        position.x - 0.36,
        floorY,
        position.z - 0.36,
        position.x + 0.36,
        floorY + 4,
        position.z + 0.36
      );
    }
  }

  private createMeetingRooms(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number,
    floorIndex: number
  ): void {
    const roomCenters = [
      new pc.Vec3(-10.2, floorY, -11.1),
      new pc.Vec3(10.2, floorY, -11.1)
    ];
    const roomWidth = 9.4;
    const roomDepth = 6.5;
    const wallHeight = 2.8;

    for (const [index, center] of roomCenters.entries()) {
      this.addPrimitive(
        root,
        `meeting-back-${floorIndex}-${index}`,
        "box",
        materials.glass,
        new pc.Vec3(center.x, center.y + wallHeight * 0.5, center.z - roomDepth * 0.5),
        new pc.Vec3(roomWidth, wallHeight, 0.12)
      );
      this.addPrimitive(
        root,
        `meeting-left-${floorIndex}-${index}`,
        "box",
        materials.glass,
        new pc.Vec3(center.x - roomWidth * 0.5, center.y + wallHeight * 0.5, center.z),
        new pc.Vec3(0.12, wallHeight, roomDepth)
      );
      this.addPrimitive(
        root,
        `meeting-right-${floorIndex}-${index}`,
        "box",
        materials.glass,
        new pc.Vec3(center.x + roomWidth * 0.5, center.y + wallHeight * 0.5, center.z),
        new pc.Vec3(0.12, wallHeight, roomDepth)
      );

      this.collision.addAabb(center.x - roomWidth * 0.5, center.y, center.z - roomDepth * 0.5 - 0.06, center.x + roomWidth * 0.5, center.y + wallHeight, center.z - roomDepth * 0.5 + 0.06);
      this.collision.addAabb(center.x - roomWidth * 0.5 - 0.06, center.y, center.z - roomDepth * 0.5, center.x - roomWidth * 0.5 + 0.06, center.y + wallHeight, center.z + roomDepth * 0.5);
      this.collision.addAabb(center.x + roomWidth * 0.5 - 0.06, center.y, center.z - roomDepth * 0.5, center.x + roomWidth * 0.5 + 0.06, center.y + wallHeight, center.z + roomDepth * 0.5);

      this.addPrimitive(
        root,
        `meeting-table-${floorIndex}-${index}`,
        "box",
        materials.wood,
        new pc.Vec3(center.x, center.y + 0.72, center.z + 0.2),
        new pc.Vec3(4.4, 0.14, 1.8)
      );
    }
  }

  private createDeskClusters(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number,
    floorIndex: number
  ): void {
    const clusterAnchors = [
      new pc.Vec3(-9.2, floorY, 7.2),
      new pc.Vec3(9.2, floorY, 7.2),
      new pc.Vec3(-9.2, floorY, 0.4),
      new pc.Vec3(9.2, floorY, 0.4)
    ];

    for (const [clusterIndex, anchor] of clusterAnchors.entries()) {
      for (let deskIndex = 0; deskIndex < 3; deskIndex += 1) {
        const offsetZ = deskIndex * 2.6 - 2.6;
        const top = this.addPrimitive(
          root,
          `desk-top-${floorIndex}-${clusterIndex}-${deskIndex}`,
          "box",
          materials.wood,
          new pc.Vec3(anchor.x, floorY + 0.82, anchor.z + offsetZ),
          new pc.Vec3(2.2, 0.08, 1.1)
        );

        this.addPrimitive(
          top,
          `monitor-${floorIndex}-${clusterIndex}-${deskIndex}`,
          "box",
          materials.accent,
          new pc.Vec3(0, 0.54, -0.18),
          new pc.Vec3(0.74, 0.48, 0.08)
        );
        this.addPrimitive(
          root,
          `desk-block-${floorIndex}-${clusterIndex}-${deskIndex}`,
          "box",
          materials.trim,
          new pc.Vec3(anchor.x - 0.74, floorY + 0.42, anchor.z + offsetZ + 0.16),
          new pc.Vec3(0.42, 0.82, 0.52)
        );

        if (deskIndex === 1) {
          this.collision.addAabb(
            anchor.x - 1.1,
            floorY,
            anchor.z + offsetZ - 0.55,
            anchor.x + 1.1,
            floorY + 0.92,
            anchor.z + offsetZ + 0.55
          );
        }
      }
    }
  }

  private createPlanters(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number
  ): void {
    const planterSpots = [
      new pc.Vec3(-14.2, floorY, 12.4),
      new pc.Vec3(14.2, floorY, 12.4),
      new pc.Vec3(-14.2, floorY, -13.2),
      new pc.Vec3(14.2, floorY, -13.2)
    ];

    for (const [index, spot] of planterSpots.entries()) {
      const pot = this.addPrimitive(
        root,
        `planter-pot-${index}`,
        "box",
        materials.concrete,
        new pc.Vec3(spot.x, spot.y + 0.36, spot.z),
        new pc.Vec3(1, 0.72, 1)
      );
      this.addPrimitive(
        pot,
        `planter-leaf-a-${index}`,
        "cone",
        materials.foliage,
        new pc.Vec3(0, 1.26, 0),
        new pc.Vec3(0.96, 1.9, 0.96)
      );
      this.addPrimitive(
        pot,
        `planter-leaf-b-${index}`,
        "sphere",
        materials.foliage,
        new pc.Vec3(0, 1.9, 0),
        new pc.Vec3(1.2, 1.08, 1.2),
        new pc.Vec3(randRange(-10, 10), randRange(0, 360), randRange(-10, 10))
      );
    }
  }

  private createCeilingLights(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>,
    floorY: number
  ): void {
    const ceilingY = floorY + terrain.floorHeight - 0.18;
    const lightPositions = [
      new pc.Vec3(-9, ceilingY, -5.5),
      new pc.Vec3(9, ceilingY, -5.5),
      new pc.Vec3(-9, ceilingY, 5.5),
      new pc.Vec3(9, ceilingY, 5.5),
      new pc.Vec3(0, ceilingY, 10.2)
    ];

    for (const [index, position] of lightPositions.entries()) {
      this.addPrimitive(
        root,
        `ceiling-light-${index}`,
        "box",
        materials.lightPanel,
        position,
        new pc.Vec3(3.2, 0.08, 1.2)
      ).render!.castShadows = false;
    }
  }

  private createRoof(
    root: pc.Entity,
    terrain: Terrain,
    materials: Record<string, pc.StandardMaterial>
  ): void {
    const roofY = terrain.getFloorY(terrain.floorCount - 1) + terrain.floorHeight;
    const slabThickness = GAME_CONFIG.world.building.slabThickness;

    this.addPrimitive(
      root,
      "roof-main",
      "box",
      materials.concrete,
      new pc.Vec3(0, roofY + slabThickness * 0.5, 0),
      new pc.Vec3(terrain.halfWidth * 2 + 0.8, slabThickness, terrain.halfDepth * 2 + 0.8)
    );
    this.collision.addAabb(
      -(terrain.halfWidth + 0.4),
      roofY,
      -(terrain.halfDepth + 0.4),
      terrain.halfWidth + 0.4,
      roofY + slabThickness,
      terrain.halfDepth + 0.4
    );
    this.addPrimitive(
      root,
      "roof-parapet-north",
      "box",
      materials.trim,
      new pc.Vec3(0, roofY + 0.9, -terrain.halfDepth + 0.15),
      new pc.Vec3(terrain.halfWidth * 2, 1.8, 0.3)
    );
    this.addPrimitive(
      root,
      "roof-parapet-south",
      "box",
      materials.trim,
      new pc.Vec3(0, roofY + 0.9, terrain.halfDepth - 0.15),
      new pc.Vec3(terrain.halfWidth * 2, 1.8, 0.3)
    );
    this.addPrimitive(
      root,
      "roof-parapet-east",
      "box",
      materials.trim,
      new pc.Vec3(terrain.halfWidth - 0.15, roofY + 0.9, 0),
      new pc.Vec3(0.3, 1.8, terrain.halfDepth * 2)
    );
    this.addPrimitive(
      root,
      "roof-parapet-west",
      "box",
      materials.trim,
      new pc.Vec3(-terrain.halfWidth + 0.15, roofY + 0.9, 0),
      new pc.Vec3(0.3, 1.8, terrain.halfDepth * 2)
    );
  }

  private addWindowFacade(
    parent: pc.Entity,
    name: string,
    materials: Record<string, pc.StandardMaterial>,
    position: pc.Vec3,
    scale: pc.Vec3,
    axis: "north" | "south" | "east" | "west"
  ): void {
    const facade = new pc.Entity(name);
    facade.setLocalPosition(position);
    parent.addChild(facade);

    const totalHeight = scale.y;
    this.addPrimitive(
      facade,
      `${name}-spine`,
      "box",
      materials.trim,
      new pc.Vec3(0, 0, 0),
      scale
    );

    for (let floorIndex = 0; floorIndex < GAME_CONFIG.world.building.floorCount; floorIndex += 1) {
      const floorBase = floorIndex * GAME_CONFIG.world.building.floorHeight;
      const sillHeight = 0.9;
      const windowHeight = 1.85;
      const headerHeight = 1.2;
      const axisScaleA = axis === "north" || axis === "south" ? scale.x - 1.2 : scale.z - 1.2;
      const panelDepth = axis === "north" || axis === "south" ? scale.z * 0.54 : scale.x * 0.54;

      this.addFacadeStrip(
        facade,
        `${name}-sill-${floorIndex}`,
        materials.wall,
        axis,
        floorBase + sillHeight * 0.5,
        axisScaleA,
        sillHeight,
        panelDepth
      );
      this.addFacadeStrip(
        facade,
        `${name}-glass-${floorIndex}`,
        materials.glass,
        axis,
        floorBase + sillHeight + windowHeight * 0.5,
        axisScaleA - 2,
        windowHeight,
        panelDepth * 0.72
      );
      this.addFacadeStrip(
        facade,
        `${name}-header-${floorIndex}`,
        materials.wall,
        axis,
        floorBase + sillHeight + windowHeight + headerHeight * 0.5,
        axisScaleA,
        headerHeight,
        panelDepth
      );
    }

    this.addPrimitive(
      facade,
      `${name}-cap`,
      "box",
      materials.trim,
      new pc.Vec3(0, totalHeight * 0.5 - 0.18, 0),
      new pc.Vec3(scale.x, 0.36, scale.z)
    );
  }

  private addFacadeStrip(
    parent: pc.Entity,
    name: string,
    material: pc.Material,
    axis: "north" | "south" | "east" | "west",
    y: number,
    length: number,
    height: number,
    depth: number
  ): void {
    const isNorthSouth = axis === "north" || axis === "south";
    this.addPrimitive(
      parent,
      name,
      "box",
      material,
      new pc.Vec3(0, y - parent.getLocalPosition().y, 0),
      new pc.Vec3(isNorthSouth ? length : depth, height, isNorthSouth ? depth : length)
    );
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
