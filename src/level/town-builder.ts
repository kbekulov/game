import * as pc from "playcanvas";

import type { PlayerSpawn } from "@/core/config.ts";
import { createPrimitive, createPivot, setEntityMaterial } from "@/core/primitives.ts";
import { CollisionWorld } from "@/level/collision-world.ts";
import { type TownMaterials, createTownMaterials } from "@/level/materials.ts";

export interface TargetSpawn {
  position: pc.Vec3;
  yaw: number;
  label: string;
}

export interface TownBuildResult {
  collisionWorld: CollisionWorld;
  materials: TownMaterials;
  playerSpawn: PlayerSpawn;
  targetSpawns: TargetSpawn[];
}

const addSolid = (
  worldRoot: pc.Entity,
  collisionWorld: CollisionWorld,
  materials: TownMaterials,
  {
    name,
    position,
    scale,
    material,
    surface,
    castShadows = true,
    receiveShadows = true,
    rotation = [0, 0, 0] as [number, number, number]
  }: {
    name: string;
    position: [number, number, number];
    scale: [number, number, number];
    material: pc.Material;
    surface: "stone" | "wood" | "metal" | "plaster" | "tile" | "water";
    castShadows?: boolean;
    receiveShadows?: boolean;
    rotation?: [number, number, number];
  }
): pc.Entity => {
  const entity = createPrimitive({
    name,
    type: "box",
    parent: worldRoot,
    position,
    scale,
    rotation,
    material,
    castShadows,
    receiveShadows
  });

  collisionWorld.addBox(
    new pc.Vec3(position[0], position[1], position[2]),
    new pc.Vec3(scale[0], scale[1], scale[2]),
    {
      name,
      surface
    }
  );

  return entity;
};

const addWindow = (
  parent: pc.Entity,
  materials: TownMaterials,
  {
    name,
    position,
    rotation,
    scale = [1.2, 1.4, 0.1] as [number, number, number],
    shutterColor = materials.shutterWood
  }: {
    name: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale?: [number, number, number];
    shutterColor?: pc.Material;
  }
): void => {
  createPrimitive({
    name: `${name}-frame`,
    type: "box",
    parent,
    position,
    rotation,
    scale,
    material: materials.trimStone
  });

  createPrimitive({
    name: `${name}-glass`,
    type: "box",
    parent,
    position: [position[0], position[1], position[2] + (rotation[1] === 0 || rotation[1] === 180 ? 0.04 : 0)],
    rotation,
    scale: [scale[0] * 0.68, scale[1] * 0.74, scale[2] * 0.4],
    material: materials.windowGlow,
    castShadows: false,
    receiveShadows: false
  });

  createPrimitive({
    name: `${name}-left-shutter`,
    type: "box",
    parent,
    position: [position[0] - scale[0] * 0.42, position[1], position[2]],
    rotation,
    scale: [scale[0] * 0.32, scale[1] * 0.84, scale[2] * 0.5],
    material: shutterColor
  });

  createPrimitive({
    name: `${name}-right-shutter`,
    type: "box",
    parent,
    position: [position[0] + scale[0] * 0.42, position[1], position[2]],
    rotation,
    scale: [scale[0] * 0.32, scale[1] * 0.84, scale[2] * 0.5],
    material: shutterColor
  });
};

const addBalcony = (
  parent: pc.Entity,
  materials: TownMaterials,
  {
    name,
    position,
    width
  }: {
    name: string;
    position: [number, number, number];
    width: number;
  }
): void => {
  createPrimitive({
    name: `${name}-floor`,
    type: "box",
    parent,
    position,
    scale: [width, 0.18, 1.3],
    material: materials.darkWood
  });

  for (const x of [-width * 0.42, 0, width * 0.42]) {
    createPrimitive({
      name: `${name}-rail-${x}`,
      type: "box",
      parent,
      position: [position[0] + x, position[1] + 0.55, position[2] - 0.48],
      scale: [0.08, 1.1, 0.08],
      material: materials.iron
    });
  }

  createPrimitive({
    name: `${name}-rail-top`,
    type: "box",
    parent,
    position: [position[0], position[1] + 1.05, position[2] - 0.48],
    scale: [width, 0.08, 0.08],
    material: materials.iron
  });
};

const addLamp = (
  parent: pc.Entity,
  materials: TownMaterials,
  position: [number, number, number]
): void => {
  const root = createPivot(parent, `lamp-${position.join("-")}`, position);

  createPrimitive({
    name: "lamp-post",
    type: "box",
    parent: root,
    position: [0, 1.8, 0],
    scale: [0.12, 3.6, 0.12],
    material: materials.iron
  });

  createPrimitive({
    name: "lamp-arm",
    type: "box",
    parent: root,
    position: [0.34, 3.3, 0],
    rotation: [0, 0, 18],
    scale: [0.62, 0.08, 0.08],
    material: materials.iron
  });

  createPrimitive({
    name: "lamp-glow",
    type: "sphere",
    parent: root,
    position: [0.62, 3.04, 0],
    scale: [0.18, 0.18, 0.18],
    material: materials.lampGlow,
    castShadows: false,
    receiveShadows: false
  });

  const light = new pc.Entity("lamp-light");
  light.addComponent("light", {
    type: "omni",
    color: new pc.Color(1, 0.76, 0.42),
    intensity: 0.65,
    range: 9
  });
  root.addChild(light);
  light.setLocalPosition(0.62, 3.04, 0);
};

const addArchway = (
  root: pc.Entity,
  collisionWorld: CollisionWorld,
  materials: TownMaterials,
  {
    name,
    position,
    width,
    height,
    depth,
    axis
  }: {
    name: string;
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    axis: "x" | "z";
  }
): void => {
  const localRoot = createPivot(root, name, position);
  const horizontalScale = axis === "x" ? [0.8, height, depth] : [depth, height, 0.8];
  const topScale = axis === "x" ? [width, 0.9, depth] : [depth, 0.9, width];
  const offset = width * 0.5 + 0.4;

  const left = axis === "x" ? [-offset, height * 0.5, 0] : [0, height * 0.5, -offset];
  const right = axis === "x" ? [offset, height * 0.5, 0] : [0, height * 0.5, offset];

  createPrimitive({
    name: `${name}-left`,
    type: "box",
    parent: localRoot,
    position: left as [number, number, number],
    scale: horizontalScale as [number, number, number],
    material: materials.trimStone
  });
  createPrimitive({
    name: `${name}-right`,
    type: "box",
    parent: localRoot,
    position: right as [number, number, number],
    scale: horizontalScale as [number, number, number],
    material: materials.trimStone
  });
  createPrimitive({
    name: `${name}-top`,
    type: "box",
    parent: localRoot,
    position: [0, height + 0.45, 0],
    scale: topScale as [number, number, number],
    material: materials.trimStone
  });

  collisionWorld.addBox(
    new pc.Vec3(position[0] + left[0], position[1] + left[1], position[2] + left[2]),
    new pc.Vec3(horizontalScale[0], horizontalScale[1], horizontalScale[2]),
    { name: `${name}-left`, surface: "stone" }
  );
  collisionWorld.addBox(
    new pc.Vec3(position[0] + right[0], position[1] + right[1], position[2] + right[2]),
    new pc.Vec3(horizontalScale[0], horizontalScale[1], horizontalScale[2]),
    { name: `${name}-right`, surface: "stone" }
  );
  collisionWorld.addBox(
    new pc.Vec3(position[0], position[1] + height + 0.45, position[2]),
    new pc.Vec3(topScale[0], topScale[1], topScale[2]),
    { name: `${name}-top`, surface: "stone" }
  );
};

const addStairs = (
  root: pc.Entity,
  collisionWorld: CollisionWorld,
  material: pc.Material,
  {
    name,
    start,
    stepCount,
    stepSize,
    axis
  }: {
    name: string;
    start: [number, number, number];
    stepCount: number;
    stepSize: [number, number, number];
    axis: "x+" | "x-" | "z+" | "z-";
  }
): void => {
  const direction = axis === "x+" || axis === "z+" ? 1 : -1;

  for (let index = 0; index < stepCount; index += 1) {
    const rise = stepSize[1] * (index + 1);
    const offset = stepSize[axis.startsWith("x") ? 0 : 2] * index * direction;
    const centerX =
      axis.startsWith("x") ? start[0] + offset : start[0];
    const centerZ =
      axis.startsWith("z") ? start[2] + offset : start[2];

    addSolid(root, collisionWorld, {} as TownMaterials, {
      name: `${name}-step-${index + 1}`,
      position: [centerX, start[1] + rise * 0.5, centerZ],
      scale: [stepSize[0], rise, stepSize[2]],
      material,
      surface: "stone"
    });
  }
};

const addBuildingShell = (
  root: pc.Entity,
  collisionWorld: CollisionWorld,
  materials: TownMaterials,
  {
    name,
    position,
    scale,
    wallMaterial,
    roofHeight = 1.6,
    hasSouthBalcony = false,
    hasEastBalcony = false,
    windowRows = 2
  }: {
    name: string;
    position: [number, number, number];
    scale: [number, number, number];
    wallMaterial: pc.Material;
    roofHeight?: number;
    hasSouthBalcony?: boolean;
    hasEastBalcony?: boolean;
    windowRows?: number;
  }
): void => {
  const building = addSolid(root, collisionWorld, materials, {
    name,
    position,
    scale,
    material: wallMaterial,
    surface: "plaster"
  });

  createPrimitive({
    name: `${name}-roof`,
    type: "box",
    parent: root,
    position: [position[0], position[1] + scale[1] * 0.5 + roofHeight * 0.5, position[2]],
    scale: [scale[0] + 0.8, roofHeight, scale[2] + 0.8],
    material: materials.roofTile
  });

  const local = createPivot(root, `${name}-facade-root`, position);
  const frontZ = scale[2] * 0.5 + 0.06;
  const sideX = scale[0] * 0.5 + 0.06;
  const rowCount = Math.max(1, windowRows);
  const columnCount = Math.max(2, Math.floor(scale[0] / 3.8));

  for (let row = 0; row < rowCount; row += 1) {
    const y = -scale[1] * 0.16 + row * 2.5;

    for (let column = 0; column < columnCount; column += 1) {
      const x =
        -scale[0] * 0.32 +
        (column / Math.max(1, columnCount - 1)) * (scale[0] * 0.64);

      addWindow(local, materials, {
        name: `${name}-south-${row}-${column}`,
        position: [x, y, frontZ],
        rotation: [0, 0, 0],
        shutterColor: row % 2 === 0 ? materials.shutterWood : materials.darkWood
      });
    }
  }

  if (hasSouthBalcony) {
    addBalcony(local, materials, {
      name: `${name}-south-balcony`,
      position: [0, 0.6, frontZ + 0.62],
      width: Math.min(scale[0] * 0.62, 4.6)
    });
  }

  if (hasEastBalcony) {
    addBalcony(local, materials, {
      name: `${name}-east-balcony`,
      position: [sideX + 0.62, 0.72, 0],
      width: Math.min(scale[2] * 0.52, 4.2)
    });
  }

  createPrimitive({
    name: `${name}-door`,
    type: "box",
    parent: building,
    position: [0, -scale[1] * 0.32, scale[2] * 0.5 + 0.08],
    scale: [1.38, 2.2, 0.16],
    material: materials.darkWood
  });
};

const addFountain = (
  root: pc.Entity,
  collisionWorld: CollisionWorld,
  materials: TownMaterials,
  position: [number, number, number]
): void => {
  const fountainRoot = createPivot(root, "fountain", position);
  createPrimitive({
    name: "fountain-basin",
    type: "cylinder",
    parent: fountainRoot,
    position: [0, 0.42, 0],
    scale: [2.4, 0.42, 2.4],
    material: materials.fountainStone
  });
  createPrimitive({
    name: "fountain-water",
    type: "cylinder",
    parent: fountainRoot,
    position: [0, 0.58, 0],
    scale: [1.92, 0.08, 1.92],
    material: materials.fountainWater,
    castShadows: false
  });
  createPrimitive({
    name: "fountain-column",
    type: "cylinder",
    parent: fountainRoot,
    position: [0, 1.14, 0],
    scale: [0.34, 1.16, 0.34],
    material: materials.fountainStone
  });
  createPrimitive({
    name: "fountain-top",
    type: "sphere",
    parent: fountainRoot,
    position: [0, 2.22, 0],
    scale: [0.42, 0.42, 0.42],
    material: materials.fountainStone
  });

  collisionWorld.addBox(new pc.Vec3(position[0], 0.42, position[2]), new pc.Vec3(3.5, 0.84, 3.5), {
    name: "fountain-basin",
    surface: "stone"
  });
};

const addCoverCluster = (
  root: pc.Entity,
  collisionWorld: CollisionWorld,
  materials: TownMaterials,
  position: [number, number, number]
): void => {
  addSolid(root, collisionWorld, materials, {
    name: `crate-a-${position.join("-")}`,
    position: [position[0], position[1] + 0.55, position[2]],
    scale: [1.1, 1.1, 1.1],
    material: materials.darkWood,
    surface: "wood"
  });
  addSolid(root, collisionWorld, materials, {
    name: `crate-b-${position.join("-")}`,
    position: [position[0] + 0.86, position[1] + 0.48, position[2] - 0.62],
    scale: [0.96, 0.96, 0.96],
    material: materials.darkWood,
    surface: "wood"
  });
  const barrel = createPrimitive({
    name: `barrel-${position.join("-")}`,
    type: "cylinder",
    parent: root,
    position: [position[0] - 0.92, position[1] + 0.58, position[2] + 0.24],
    scale: [0.48, 0.58, 0.48],
    material: materials.darkWood
  });
  collisionWorld.addBox(
    new pc.Vec3(position[0] - 0.92, position[1] + 0.58, position[2] + 0.24),
    new pc.Vec3(0.92, 1.16, 0.92),
    { name: barrel.name, surface: "wood" }
  );
};

export const buildTownLevel = (app: pc.Application): TownBuildResult => {
  const collisionWorld = new CollisionWorld();
  const materials = createTownMaterials(app);
  const root = new pc.Entity("old-town-level");
  app.root.addChild(root);

  app.scene.ambientLight = new pc.Color(0.31, 0.28, 0.24);
  app.scene.fog.type = pc.FOG_LINEAR;
  app.scene.fog.color = new pc.Color(0.89, 0.71, 0.54);
  app.scene.fog.start = 38;
  app.scene.fog.end = 165;

  const sky = createPrimitive({
    name: "sky-dome",
    type: "sphere",
    parent: root,
    position: [0, 32, 0],
    scale: [180, 180, 180],
    material: materials.sky,
    castShadows: false,
    receiveShadows: false
  });
  setEntityMaterial(sky, materials.sky);

  const sun = new pc.Entity("sun");
  sun.addComponent("light", {
    type: "directional",
    castShadows: true,
    intensity: 2.2,
    color: new pc.Color(1, 0.84, 0.62),
    shadowDistance: 120,
    shadowBias: 0.25,
    normalOffsetBias: 0.05
  });
  sun.setEulerAngles(38, 128, 0);
  root.addChild(sun);

  const bounce = new pc.Entity("bounce");
  bounce.addComponent("light", {
    type: "directional",
    castShadows: false,
    intensity: 0.55,
    color: new pc.Color(0.62, 0.72, 0.86)
  });
  bounce.setEulerAngles(55, -34, 0);
  root.addChild(bounce);

  addSolid(root, collisionWorld, materials, {
    name: "plaza-ground",
    position: [0, -0.3, 0],
    scale: [18, 0.6, 18],
    material: materials.cobble,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "north-street",
    position: [0, -0.3, 21],
    scale: [6.4, 0.6, 28],
    material: materials.cobble,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "west-lane",
    position: [-21, -0.3, 0],
    scale: [28, 0.6, 6.8],
    material: materials.cobble,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "south-lane",
    position: [3, -0.3, -20],
    scale: [20, 0.6, 8],
    material: materials.cobble,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "east-lane",
    position: [19, -0.3, 2],
    scale: [14, 0.6, 8],
    material: materials.cobble,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "terrace-floor",
    position: [23, 2.1, 8],
    scale: [12, 0.6, 18],
    material: materials.trimStone,
    surface: "stone",
    castShadows: false
  });
  addSolid(root, collisionWorld, materials, {
    name: "north-dais",
    position: [0, 0.6, 32],
    scale: [8, 1.2, 8],
    material: materials.trimStone,
    surface: "stone",
    castShadows: false
  });

  addBuildingShell(root, collisionWorld, materials, {
    name: "southwest-inn",
    position: [-11.5, 5.2, -12.5],
    scale: [13, 10.4, 11],
    wallMaterial: materials.plasterWarm,
    hasSouthBalcony: true
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "southeast-row",
    position: [17.5, 4.8, -14.2],
    scale: [15, 9.6, 12],
    wallMaterial: materials.plasterLight
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "northwest-civic",
    position: [-14.4, 6, 16],
    scale: [14, 12, 14],
    wallMaterial: materials.plasterRose,
    hasSouthBalcony: true
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "northeast-chapel",
    position: [15.6, 6.5, 20.4],
    scale: [16, 13, 16],
    wallMaterial: materials.plasterWarm
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "west-market-row",
    position: [-28, 5.2, 0],
    scale: [10, 10.4, 24],
    wallMaterial: materials.plasterLight,
    hasEastBalcony: true
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "east-terrace-row",
    position: [31, 6.2, 5.2],
    scale: [8, 12.4, 18],
    wallMaterial: materials.plasterRose,
    hasSouthBalcony: true
  });
  addBuildingShell(root, collisionWorld, materials, {
    name: "east-upper-house",
    position: [20.6, 7.2, 17.6],
    scale: [8.2, 9.6, 8],
    wallMaterial: materials.plasterLight
  });

  addArchway(root, collisionWorld, materials, {
    name: "north-arch",
    position: [0, 0, 9.8],
    width: 4.8,
    height: 4.4,
    depth: 1.4,
    axis: "x"
  });
  addArchway(root, collisionWorld, materials, {
    name: "west-arch",
    position: [-9.6, 0, 0],
    width: 4.8,
    height: 4.2,
    depth: 1.4,
    axis: "z"
  });
  addArchway(root, collisionWorld, materials, {
    name: "south-arch",
    position: [6.8, 0, -10.2],
    width: 5.2,
    height: 4.4,
    depth: 1.4,
    axis: "x"
  });

  addStairs(root, collisionWorld, materials.trimStone, {
    name: "terrace-stairs",
    start: [12.4, 0, 6.2],
    stepCount: 6,
    stepSize: [2.4, 0.4, 3.8],
    axis: "x+"
  });
  addStairs(root, collisionWorld, materials.trimStone, {
    name: "north-dais-stairs",
    start: [0, 0, 26.4],
    stepCount: 3,
    stepSize: [5.6, 0.4, 1.8],
    axis: "z+"
  });

  addFountain(root, collisionWorld, materials, [0, 0, 0]);

  addCoverCluster(root, collisionWorld, materials, [-4.2, 0, 7.4]);
  addCoverCluster(root, collisionWorld, materials, [9.6, 0, -4.2]);
  addCoverCluster(root, collisionWorld, materials, [-16.8, 0, 1.4]);
  addCoverCluster(root, collisionWorld, materials, [19.4, 2.4, 11.6]);

  for (const lampPosition of [
    [-6.5, 0, -6.2],
    [6.6, 0, -6.2],
    [-6.8, 0, 6.2],
    [6.7, 0, 6.3],
    [0.5, 0, 18.2],
    [-17.2, 0, 0.6],
    [20.2, 0, -1.6],
    [23.4, 2.4, 14.6]
  ] as Array<[number, number, number]>) {
    addLamp(root, materials, lampPosition);
  }

  const awning = createPrimitive({
    name: "market-awning",
    type: "box",
    parent: root,
    position: [-18.6, 2.9, 3.3],
    rotation: [22, 0, 0],
    scale: [4.8, 0.12, 2.6],
    material: materials.awning
  });
  collisionWorld.addBox(new pc.Vec3(-18.6, 2.9, 3.3), new pc.Vec3(4.8, 0.12, 2.6), {
    name: awning.name,
    surface: "wood",
    blocksPlayer: false,
    shootable: true
  });

  const playerSpawn: PlayerSpawn = {
    x: -4.6,
    y: 0.01,
    z: -22.4,
    yaw: 24
  };

  const targetSpawns: TargetSpawn[] = [
    { position: new pc.Vec3(-2.4, 1.6, -9.2), yaw: 0, label: "southern-arch" },
    { position: new pc.Vec3(2.6, 1.8, 6.8), yaw: 180, label: "plaza-east" },
    { position: new pc.Vec3(-9.4, 1.6, 2.8), yaw: 90, label: "market-edge" },
    { position: new pc.Vec3(-1.6, 1.9, 14.4), yaw: 180, label: "north-street" },
    { position: new pc.Vec3(0, 2.8, 33.4), yaw: 180, label: "dais" },
    { position: new pc.Vec3(18.8, 1.8, -2.2), yaw: -90, label: "east-entry" },
    { position: new pc.Vec3(20.8, 4.1, 7.8), yaw: -90, label: "terrace-lane" },
    { position: new pc.Vec3(26.8, 4.1, 15.2), yaw: -135, label: "terrace-corner" },
    { position: new pc.Vec3(-24.6, 1.8, -2.2), yaw: 90, label: "west-row" },
    { position: new pc.Vec3(8.4, 4.9, -12.2), yaw: 45, label: "balcony-glint" }
  ];

  return {
    collisionWorld,
    materials,
    playerSpawn,
    targetSpawns
  };
};
