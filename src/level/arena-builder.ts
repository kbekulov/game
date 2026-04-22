import * as pc from "playcanvas";

import type { EnemySpawn, PlayerSpawn } from "@/core/config.ts";
import { createPrimitive, createPivot, setEntityMaterial } from "@/core/primitives.ts";
import { CollisionWorld } from "@/level/collision-world.ts";

export interface ArenaMaterials {
  ground: pc.StandardMaterial;
  wall: pc.StandardMaterial;
  cover: pc.StandardMaterial;
  playerBody: pc.StandardMaterial;
  playerAccent: pc.StandardMaterial;
  enemyBody: pc.StandardMaterial;
  enemyAccent: pc.StandardMaterial;
  weapon: pc.StandardMaterial;
  muzzleFlash: pc.StandardMaterial;
}

export interface ArenaBuildResult {
  collisionWorld: CollisionWorld;
  materials: ArenaMaterials;
  playerSpawn: PlayerSpawn;
  enemySpawns: EnemySpawn[];
}

const createMaterial = (setup: (material: pc.StandardMaterial) => void): pc.StandardMaterial => {
  const material = new pc.StandardMaterial();
  setup(material);
  material.update();
  return material;
};

const addSolid = (
  root: pc.Entity,
  world: CollisionWorld,
  {
    name,
    position,
    scale,
    material,
    blocksPlayer = true,
    blocksCamera = true,
    shootable = true
  }: {
    name: string;
    position: [number, number, number];
    scale: [number, number, number];
    material: pc.Material;
    blocksPlayer?: boolean;
    blocksCamera?: boolean;
    shootable?: boolean;
  }
): pc.Entity => {
  const entity = createPrimitive({
    name,
    type: "box",
    parent: root,
    position,
    scale,
    material
  });

  world.addBox(new pc.Vec3(position[0], position[1], position[2]), new pc.Vec3(scale[0], scale[1], scale[2]), {
    name,
    blocksPlayer,
    blocksCamera,
    shootable
  });

  return entity;
};

export const buildArena = (app: pc.Application): ArenaBuildResult => {
  const collisionWorld = new CollisionWorld();
  const root = new pc.Entity("arena-root");
  app.root.addChild(root);

  const materials: ArenaMaterials = {
    ground: createMaterial((material) => {
      material.diffuse = new pc.Color(0.44, 0.47, 0.49);
      material.gloss = 0.18;
    }),
    wall: createMaterial((material) => {
      material.diffuse = new pc.Color(0.66, 0.62, 0.56);
      material.gloss = 0.12;
    }),
    cover: createMaterial((material) => {
      material.diffuse = new pc.Color(0.33, 0.25, 0.18);
      material.gloss = 0.08;
    }),
    playerBody: createMaterial((material) => {
      material.diffuse = new pc.Color(0.18, 0.28, 0.48);
      material.gloss = 0.18;
    }),
    playerAccent: createMaterial((material) => {
      material.diffuse = new pc.Color(0.82, 0.84, 0.88);
      material.gloss = 0.36;
    }),
    enemyBody: createMaterial((material) => {
      material.diffuse = new pc.Color(0.48, 0.19, 0.18);
      material.gloss = 0.16;
    }),
    enemyAccent: createMaterial((material) => {
      material.diffuse = new pc.Color(0.92, 0.66, 0.28);
      material.gloss = 0.36;
    }),
    weapon: createMaterial((material) => {
      material.diffuse = new pc.Color(0.12, 0.12, 0.14);
      material.gloss = 0.42;
      material.metalness = 0.35;
    }),
    muzzleFlash: createMaterial((material) => {
      material.useLighting = false;
      material.diffuse = new pc.Color(0, 0, 0);
      material.emissive = new pc.Color(1, 0.74, 0.28);
      material.emissiveIntensity = 1.8;
    })
  };

  app.scene.ambientLight = new pc.Color(0.34, 0.38, 0.44);
  app.scene.fog.type = pc.FOG_LINEAR;
  app.scene.fog.color = new pc.Color(0.56, 0.64, 0.74);
  app.scene.fog.start = 26;
  app.scene.fog.end = 72;

  const sun = new pc.Entity("sun");
  sun.addComponent("light", {
    type: "directional",
    color: new pc.Color(1, 0.95, 0.86),
    intensity: 1.6,
    castShadows: true,
    shadowDistance: 72,
    shadowBias: 0.28,
    normalOffsetBias: 0.05
  });
  sun.setEulerAngles(44, 132, 0);
  root.addChild(sun);

  const sky = createPrimitive({
    name: "sky-dome",
    type: "sphere",
    parent: root,
    position: [0, 24, 0],
    scale: [160, 160, 160],
    material: createMaterial((material) => {
      material.useLighting = false;
      material.diffuse = new pc.Color(0, 0, 0);
      material.emissive = new pc.Color(0.55, 0.68, 0.86);
      material.emissiveIntensity = 1;
      material.cull = pc.CULLFACE_FRONT;
    }),
    castShadows: false,
    receiveShadows: false
  });
  setEntityMaterial(sky, sky.render!.meshInstances[0].material);

  addSolid(root, collisionWorld, {
    name: "ground",
    position: [0, -0.1, 0],
    scale: [40, 0.2, 40],
    material: materials.ground,
    blocksPlayer: false,
    blocksCamera: false,
    shootable: true
  });

  addSolid(root, collisionWorld, {
    name: "north-wall",
    position: [0, 2, -20],
    scale: [40, 4, 1.4],
    material: materials.wall
  });
  addSolid(root, collisionWorld, {
    name: "south-wall",
    position: [0, 2, 20],
    scale: [40, 4, 1.4],
    material: materials.wall
  });
  addSolid(root, collisionWorld, {
    name: "west-wall",
    position: [-20, 2, 0],
    scale: [1.4, 4, 40],
    material: materials.wall
  });
  addSolid(root, collisionWorld, {
    name: "east-wall",
    position: [20, 2, 0],
    scale: [1.4, 4, 40],
    material: materials.wall
  });

  for (const [x, y, z, sx, sy, sz] of [
    [-6, 0.7, -4, 2.2, 1.4, 2.2],
    [6, 0.7, -4, 2.2, 1.4, 2.2],
    [-10, 1, 7, 3.2, 2, 2.2],
    [10, 1, 7, 3.2, 2, 2.2],
    [0, 0.9, 4, 4.6, 1.8, 1.6],
    [0, 1.2, -10, 2.8, 2.4, 2.8]
  ] as Array<[number, number, number, number, number, number]>) {
    addSolid(root, collisionWorld, {
      name: `cover-${x}-${z}`,
      position: [x, y, z],
      scale: [sx, sy, sz],
      material: materials.cover
    });
  }

  const platformRoot = createPivot(root, "platform-group", [0, 0, 0]);
  for (const [x, z] of [
    [-14, -12],
    [14, -12],
    [-14, 12],
    [14, 12]
  ] as Array<[number, number]>) {
    createPrimitive({
      name: `marker-${x}-${z}`,
      type: "cylinder",
      parent: platformRoot,
      position: [x, 0.18, z],
      scale: [1.2, 0.18, 1.2],
      material: materials.wall
    });
  }

  const playerSpawn: PlayerSpawn = {
    x: 0,
    z: 12,
    yaw: 180
  };

  const enemySpawns: EnemySpawn[] = [
    { x: -12, z: -10, patrolAxis: "x", patrolAmplitude: 2.8, phase: 0 },
    { x: 12, z: -10, patrolAxis: "x", patrolAmplitude: 2.8, phase: 1.2 },
    { x: -14, z: 2, patrolAxis: "z", patrolAmplitude: 2.2, phase: 0.6 },
    { x: 14, z: 2, patrolAxis: "z", patrolAmplitude: 2.2, phase: 2.4 },
    { x: 0, z: -14, patrolAxis: "x", patrolAmplitude: 3.4, phase: 0.9 }
  ];

  return {
    collisionWorld,
    materials,
    playerSpawn,
    enemySpawns
  };
};
