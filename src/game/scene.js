import * as pc from "playcanvas";

import {
  FOREST_HALF_EXTENT,
  FOREST_LANDMARKS,
  FOREST_PATHS,
  PLAYER_START
} from "./config.js";

export const applyMaterial = (entity, material) => {
  if (!entity.render) {
    return;
  }

  for (const meshInstance of entity.render.meshInstances) {
    meshInstance.material = material;
  }
};

const createMaterial = (color, options = {}) => {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.metalness = options.metalness ?? 0.05;
  material.gloss = options.gloss ?? 0.35;
  material.emissive = options.emissive ?? new pc.Color(0, 0, 0);
  material.emissiveIntensity = options.emissiveIntensity ?? 1;
  material.update();
  return material;
};

const createPrimitive = (
  app,
  {
    name,
    type,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    material,
    parent = null,
    castShadows = true,
    receiveShadows = true
  }
) => {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    type,
    castShadows,
    receiveShadows
  });
  (parent ?? app.root).addChild(entity);
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  if (material) {
    applyMaterial(entity, material);
  }
  return entity;
};

const createAnchor = (app, name, position) => {
  const anchor = new pc.Entity(name);
  app.root.addChild(anchor);
  anchor.setPosition(position.x, position.y ?? 0, position.z);
  return anchor;
};

const createRng = (seed) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const randomRange = (rng, min, max) => min + (max - min) * rng();

const distanceToSegmentSquared = (point, start, end) => {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;

  if (lengthSquared === 0) {
    const offsetX = point.x - start.x;
    const offsetZ = point.z - start.z;
    return offsetX * offsetX + offsetZ * offsetZ;
  }

  const projection = ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared;
  const t = pc.math.clamp(projection, 0, 1);
  const nearestX = start.x + dx * t;
  const nearestZ = start.z + dz * t;
  const offsetX = point.x - nearestX;
  const offsetZ = point.z - nearestZ;
  return offsetX * offsetX + offsetZ * offsetZ;
};

const createPathSegment = (app, material, segment, index) => {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz) * pc.math.RAD_TO_DEG;

  createPrimitive(app, {
    name: `path-${index + 1}`,
    type: "box",
    position: [(segment.start.x + segment.end.x) * 0.5, -0.12, (segment.start.z + segment.end.z) * 0.5],
    rotation: [0, angle, 0],
    scale: [segment.width, 0.12, length],
    material,
    castShadows: false
  });
};

const createLantern = (app, materials, name, position, options = {}) => {
  const anchor = createAnchor(app, name, position);
  const postHeight = options.postHeight ?? 2.7;

  createPrimitive(app, {
    name: `${name}-post`,
    type: "cylinder",
    parent: anchor,
    position: [0, postHeight * 0.5, 0],
    scale: [0.09, postHeight * 0.5, 0.09],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: `${name}-arm`,
    type: "box",
    parent: anchor,
    position: [0.38, postHeight - 0.1, 0],
    rotation: [0, 0, 8],
    scale: [0.7, 0.06, 0.06],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: `${name}-glow`,
    type: "sphere",
    parent: anchor,
    position: [0.68, postHeight - 0.42, 0],
    scale: [0.22, 0.22, 0.22],
    material: materials.lanternGlow,
    castShadows: false
  });

  const light = new pc.Entity(`${name}-light`);
  light.addComponent("light", {
    type: "omni",
    color: options.color ?? new pc.Color(1, 0.46, 0.19),
    intensity: options.intensity ?? 1.25,
    range: options.range ?? 15
  });
  anchor.addChild(light);
  light.setLocalPosition(0.68, postHeight - 0.42, 0);
};

const createPineTree = (app, materials, name, position, scale, rng, castShadows) => {
  const anchor = createAnchor(app, name, position);
  anchor.setEulerAngles(0, randomRange(rng, 0, 360), 0);

  const trunkHeight = randomRange(rng, 7.2, 10.8) * scale;

  createPrimitive(app, {
    name: `${name}-trunk`,
    type: "cylinder",
    parent: anchor,
    position: [0, trunkHeight * 0.5, 0],
    scale: [0.32 * scale, trunkHeight * 0.5, 0.32 * scale],
    material: materials.bark,
    castShadows
  });

  createPrimitive(app, {
    name: `${name}-canopy-low`,
    type: "cone",
    parent: anchor,
    position: [0, trunkHeight * 0.7, 0],
    scale: [2.5 * scale, 3.8 * scale, 2.5 * scale],
    material: materials.needles,
    castShadows
  });

  createPrimitive(app, {
    name: `${name}-canopy-high`,
    type: "cone",
    parent: anchor,
    position: [0, trunkHeight * 1.02, 0],
    scale: [1.8 * scale, 3.2 * scale, 1.8 * scale],
    material: materials.needlesDark,
    castShadows
  });
};

const createDeadTree = (app, materials, name, position, scale, rng, castShadows) => {
  const anchor = createAnchor(app, name, position);
  anchor.setEulerAngles(0, randomRange(rng, 0, 360), 0);

  const trunkHeight = randomRange(rng, 6.8, 9.6) * scale;

  createPrimitive(app, {
    name: `${name}-trunk`,
    type: "cylinder",
    parent: anchor,
    position: [0, trunkHeight * 0.5, 0],
    scale: [0.28 * scale, trunkHeight * 0.5, 0.28 * scale],
    material: materials.deadWood,
    castShadows
  });

  createPrimitive(app, {
    name: `${name}-branch-1`,
    type: "cylinder",
    parent: anchor,
    position: [0.55 * scale, trunkHeight * 0.74, 0],
    rotation: [14, 0, 58],
    scale: [0.07 * scale, 1.35 * scale, 0.07 * scale],
    material: materials.deadWood,
    castShadows
  });

  createPrimitive(app, {
    name: `${name}-branch-2`,
    type: "cylinder",
    parent: anchor,
    position: [-0.4 * scale, trunkHeight * 0.65, 0.12 * scale],
    rotation: [-18, 0, -46],
    scale: [0.06 * scale, 1.05 * scale, 0.06 * scale],
    material: materials.deadWood,
    castShadows
  });
};

const createRock = (app, materials, name, position, scale, rng) => {
  createPrimitive(app, {
    name,
    type: "sphere",
    position: [position.x, position.y ?? 0.25 * scale, position.z],
    rotation: [randomRange(rng, -12, 12), randomRange(rng, 0, 360), randomRange(rng, -8, 8)],
    scale: [
      scale * randomRange(rng, 0.8, 1.5),
      scale * randomRange(rng, 0.55, 0.9),
      scale * randomRange(rng, 0.8, 1.4)
    ],
    material: materials.rock
  });
};

const createStump = (app, materials, name, position, scale, rng) => {
  createPrimitive(app, {
    name,
    type: "cylinder",
    position: [position.x, 0.28 * scale, position.z],
    rotation: [0, randomRange(rng, 0, 360), 0],
    scale: [0.32 * scale, 0.28 * scale, 0.32 * scale],
    material: materials.deadWood
  });
};

const createLog = (app, materials, name, position, length, rotationY) => {
  createPrimitive(app, {
    name,
    type: "cylinder",
    position: [position.x, 0.34, position.z],
    rotation: [0, rotationY, 90],
    scale: [0.22, length, 0.22],
    material: materials.deadWood
  });
};

const createTrailhead = (app, materials) => {
  const anchor = createAnchor(app, "trailhead", { x: -62, y: 0, z: 58 });

  createPrimitive(app, {
    name: "trailhead-left-post",
    type: "box",
    parent: anchor,
    position: [-1.8, 2.4, 0],
    scale: [0.24, 4.8, 0.24],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "trailhead-right-post",
    type: "box",
    parent: anchor,
    position: [1.8, 2.4, 0],
    scale: [0.24, 4.8, 0.24],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "trailhead-beam",
    type: "box",
    parent: anchor,
    position: [0, 4.55, 0],
    rotation: [0, 0, -2],
    scale: [4.1, 0.22, 0.26],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "trailhead-sign",
    type: "box",
    parent: anchor,
    position: [0, 3.5, 0.05],
    rotation: [0, 0, 3],
    scale: [1.7, 0.78, 0.1],
    material: materials.shackWood
  });

  createLantern(app, materials, "trailhead-lantern-left", { x: -64.4, y: 0, z: 59.8 });
  createLantern(app, materials, "trailhead-lantern-right", { x: -59.3, y: 0, z: 55.2 }, {
    intensity: 0.92,
    range: 11
  });
};

const createAshCamp = (app, materials) => {
  const center = { x: -6, y: 0, z: 18 };

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    createRock(app, materials, `ash-camp-stone-${index + 1}`, {
      x: center.x + Math.cos(angle) * 1.5,
      y: 0.16,
      z: center.z + Math.sin(angle) * 1.5
    }, 0.5, createRng(400 + index));
  }

  createPrimitive(app, {
    name: "ash-camp-fire",
    type: "sphere",
    position: [center.x, 0.22, center.z],
    scale: [0.4, 0.18, 0.4],
    material: materials.ember,
    castShadows: false
  });

  const fireLight = new pc.Entity("ash-camp-light");
  fireLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(1, 0.38, 0.16),
    intensity: 1.1,
    range: 12
  });
  app.root.addChild(fireLight);
  fireLight.setPosition(center.x, 0.8, center.z);

  createLog(app, materials, "ash-camp-log-1", { x: -7.2, z: 18.9 }, 1.05, 32);
  createLog(app, materials, "ash-camp-log-2", { x: -4.8, z: 17.1 }, 0.96, -18);
  createLog(app, materials, "ash-camp-log-3", { x: -5.1, z: 19.8 }, 0.9, 96);
};

const createHangingTree = (app, materials) => {
  const rng = createRng(909);
  createDeadTree(app, materials, "hanging-tree-main", { x: -28, y: 0, z: -10 }, 1.9, rng, true);

  createPrimitive(app, {
    name: "hanging-tree-lantern-chain",
    type: "box",
    position: [-26.2, 5.8, -10],
    scale: [0.04, 2.6, 0.04],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "hanging-tree-lantern",
    type: "sphere",
    position: [-26.2, 4.45, -10],
    scale: [0.24, 0.24, 0.24],
    material: materials.lanternGlow,
    castShadows: false
  });

  const lanternLight = new pc.Entity("hanging-tree-light");
  lanternLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.94, 0.42, 0.18),
    intensity: 0.95,
    range: 12
  });
  app.root.addChild(lanternLight);
  lanternLight.setPosition(-26.2, 4.6, -10);
};

const createStoneCircle = (app, materials) => {
  const center = { x: -56, z: -46 };

  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    createPrimitive(app, {
      name: `witch-stone-${index + 1}`,
      type: "box",
      position: [center.x + Math.cos(angle) * 5.4, 2.3, center.z + Math.sin(angle) * 5.4],
      rotation: [randomRange(createRng(550 + index), -8, 8), randomRange(createRng(650 + index), 0, 360), randomRange(createRng(750 + index), -6, 6)],
      scale: [1.2, randomRange(createRng(850 + index), 4.2, 5.4), 0.9],
      material: materials.stone
    });
  }

  createPrimitive(app, {
    name: "witch-stones-core",
    type: "sphere",
    position: [center.x, 0.22, center.z],
    scale: [0.55, 0.16, 0.55],
    material: materials.moonGlow,
    castShadows: false
  });

  const coreLight = new pc.Entity("witch-stones-light");
  coreLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.45, 0.68, 1),
    intensity: 0.55,
    range: 16
  });
  app.root.addChild(coreLight);
  coreLight.setPosition(center.x, 0.95, center.z);
};

const createHunterBlind = (app, materials) => {
  const anchor = createAnchor(app, "hunters-blind", { x: 44, y: 0, z: 34 });

  const legOffsets = [
    [-1.4, 0, -1.4],
    [1.4, 0, -1.2],
    [-1.3, 0, 1.3],
    [1.5, 0, 1.5]
  ];

  for (const [index, offset] of legOffsets.entries()) {
    createPrimitive(app, {
      name: `blind-leg-${index + 1}`,
      type: "box",
      parent: anchor,
      position: [offset[0], 3.6, offset[2]],
      rotation: [0, 0, index % 2 === 0 ? 3 : -3],
      scale: [0.24, 7.2, 0.24],
      material: materials.deadWood
    });
  }

  createPrimitive(app, {
    name: "blind-platform",
    type: "box",
    parent: anchor,
    position: [0, 6.6, 0],
    scale: [4.3, 0.22, 3.7],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "blind-back-wall",
    type: "box",
    parent: anchor,
    position: [0, 8.2, -1.5],
    scale: [4.1, 3.1, 0.18],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "blind-left-wall",
    type: "box",
    parent: anchor,
    position: [-2.05, 8.1, 0],
    scale: [0.18, 2.9, 3.2],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "blind-right-wall",
    type: "box",
    parent: anchor,
    position: [2.05, 8.1, 0],
    scale: [0.18, 2.9, 3.2],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "blind-roof-left",
    type: "box",
    parent: anchor,
    position: [-1.1, 9.6, 0],
    rotation: [0, 0, 26],
    scale: [2.6, 0.2, 3.8],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "blind-roof-right",
    type: "box",
    parent: anchor,
    position: [1.1, 9.6, 0],
    rotation: [0, 0, -26],
    scale: [2.6, 0.2, 3.8],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "blind-ladder",
    type: "box",
    parent: anchor,
    position: [1.95, 3.4, 1.5],
    rotation: [0, 0, 18],
    scale: [0.12, 6.4, 1.1],
    material: materials.deadWood
  });

  createLantern(app, materials, "blind-lantern", { x: 46.6, y: 0, z: 32.4 }, {
    intensity: 0.84,
    range: 12
  });
};

const createBoardedShack = (app, materials) => {
  const anchor = createAnchor(app, "boarded-shack", { x: 52, y: 0, z: -28 });

  createPrimitive(app, {
    name: "shack-floor",
    type: "box",
    parent: anchor,
    position: [0, 0.5, 0],
    scale: [6.4, 1, 5.5],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-wall-back",
    type: "box",
    parent: anchor,
    position: [0, 3.1, -2.7],
    scale: [6.1, 5.2, 0.22],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-wall-left",
    type: "box",
    parent: anchor,
    position: [-3.1, 3.1, 0],
    scale: [0.22, 5.2, 5.2],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-wall-right",
    type: "box",
    parent: anchor,
    position: [3.1, 3.1, 0],
    scale: [0.22, 5.2, 5.2],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-wall-front-left",
    type: "box",
    parent: anchor,
    position: [-1.95, 3.1, 2.7],
    scale: [2.1, 5.2, 0.22],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-wall-front-right",
    type: "box",
    parent: anchor,
    position: [1.95, 3.1, 2.7],
    scale: [2.1, 5.2, 0.22],
    material: materials.shackWood
  });

  createPrimitive(app, {
    name: "shack-board-1",
    type: "box",
    parent: anchor,
    position: [0, 3.2, 2.84],
    rotation: [0, 0, 8],
    scale: [3.5, 0.18, 0.18],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "shack-board-2",
    type: "box",
    parent: anchor,
    position: [0.12, 2.45, 2.84],
    rotation: [0, 0, -11],
    scale: [3.2, 0.18, 0.18],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "shack-roof-left",
    type: "box",
    parent: anchor,
    position: [-1.4, 5.7, 0],
    rotation: [0, 0, 28],
    scale: [4.4, 0.22, 6.1],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "shack-roof-right",
    type: "box",
    parent: anchor,
    position: [1.4, 5.7, 0],
    rotation: [0, 0, -28],
    scale: [4.4, 0.22, 6.1],
    material: materials.deadWood
  });

  createLantern(app, materials, "shack-lantern", { x: 48.8, y: 0, z: -24.8 }, {
    intensity: 0.78,
    range: 11
  });
};

const createBlackWater = (app, materials) => {
  createPrimitive(app, {
    name: "black-water-pool",
    type: "box",
    position: [34, -0.34, 66],
    scale: [14, 0.12, 10],
    material: materials.water,
    castShadows: false
  });

  createRock(app, materials, "black-water-rock-1", { x: 27.5, y: 0.22, z: 62.4 }, 1.5, createRng(1201));
  createRock(app, materials, "black-water-rock-2", { x: 41.9, y: 0.18, z: 70.2 }, 1.2, createRng(1202));
  createDeadTree(app, materials, "black-water-tree-1", { x: 29.6, y: 0, z: 71.6 }, 1.25, createRng(1203), true);
  createDeadTree(app, materials, "black-water-tree-2", { x: 40.8, y: 0, z: 59.2 }, 1.15, createRng(1204), true);

  const waterLight = new pc.Entity("black-water-light");
  waterLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.22, 0.32, 0.56),
    intensity: 0.48,
    range: 16
  });
  app.root.addChild(waterLight);
  waterLight.setPosition(34, 1.2, 66);
};

const populateForest = (app, materials) => {
  const rng = createRng(1337);
  const landmarkExclusions = FOREST_LANDMARKS.map((landmark) => ({
    x: landmark.position.x,
    z: landmark.position.z,
    radius: landmark.radius + 5.5
  }));

  const isInClearing = (point) => {
    for (const clearing of landmarkExclusions) {
      const dx = point.x - clearing.x;
      const dz = point.z - clearing.z;
      if (dx * dx + dz * dz < clearing.radius * clearing.radius) {
        return true;
      }
    }

    for (const path of FOREST_PATHS) {
      const safeRadius = path.width + 2.2;
      if (distanceToSegmentSquared(point, path.start, path.end) < safeRadius * safeRadius) {
        return true;
      }
    }

    return false;
  };

  let pines = 0;
  let deadTrees = 0;
  let rocks = 0;
  let stumps = 0;

  for (let attempts = 0; attempts < 900; attempts += 1) {
    const point = {
      x: randomRange(rng, -FOREST_HALF_EXTENT - 10, FOREST_HALF_EXTENT + 10),
      z: randomRange(rng, -FOREST_HALF_EXTENT - 10, FOREST_HALF_EXTENT + 10)
    };

    if (isInClearing(point)) {
      continue;
    }

    const onPerimeter =
      Math.abs(point.x) > FOREST_HALF_EXTENT - 8 || Math.abs(point.z) > FOREST_HALF_EXTENT - 8;

    if ((pines < 110 && rng() < 0.68) || (onPerimeter && pines < 140)) {
      createPineTree(
        app,
        materials,
        `pine-${pines + 1}`,
        { x: point.x, y: 0, z: point.z },
        randomRange(rng, onPerimeter ? 1.1 : 0.8, onPerimeter ? 1.45 : 1.15),
        rng,
        onPerimeter
      );
      pines += 1;
      continue;
    }

    if (deadTrees < 34 && rng() < 0.28) {
      createDeadTree(
        app,
        materials,
        `dead-tree-${deadTrees + 1}`,
        { x: point.x, y: 0, z: point.z },
        randomRange(rng, 0.8, 1.35),
        rng,
        true
      );
      deadTrees += 1;
      continue;
    }

    if (rocks < 52 && rng() < 0.4) {
      createRock(
        app,
        materials,
        `forest-rock-${rocks + 1}`,
        { x: point.x, y: 0.16, z: point.z },
        randomRange(rng, 0.45, 1.3),
        rng
      );
      rocks += 1;
      continue;
    }

    if (stumps < 30) {
      createStump(
        app,
        materials,
        `forest-stump-${stumps + 1}`,
        { x: point.x, z: point.z },
        randomRange(rng, 0.75, 1.3),
        rng
      );
      stumps += 1;
    }

    if (pines >= 140 && deadTrees >= 34 && rocks >= 52 && stumps >= 30) {
      break;
    }
  }

  const pathLogs = [
    { x: -17, z: 2, length: 1.5, rotationY: 42 },
    { x: 15, z: 23, length: 1.2, rotationY: -28 },
    { x: 21, z: -1, length: 1.35, rotationY: 74 },
    { x: -42, z: -27, length: 1.1, rotationY: 18 }
  ];

  for (const [index, log] of pathLogs.entries()) {
    createLog(app, materials, `path-log-${index + 1}`, log, log.length, log.rotationY);
  }
};

export const buildScene = (app) => {
  app.scene.ambientLight = new pc.Color(0.08, 0.09, 0.1);
  app.scene.fog = pc.FOG_LINEAR;
  app.scene.fogColor = new pc.Color(0.08, 0.07, 0.08);
  app.scene.fogStart = 18;
  app.scene.fogEnd = 126;

  const materials = {
    ground: createMaterial(new pc.Color(0.08, 0.09, 0.08), {
      metalness: 0.04,
      gloss: 0.08
    }),
    path: createMaterial(new pc.Color(0.19, 0.15, 0.12), {
      metalness: 0.02,
      gloss: 0.1
    }),
    bark: createMaterial(new pc.Color(0.19, 0.13, 0.11), {
      metalness: 0.04,
      gloss: 0.18
    }),
    deadWood: createMaterial(new pc.Color(0.29, 0.26, 0.24), {
      metalness: 0.03,
      gloss: 0.14
    }),
    shackWood: createMaterial(new pc.Color(0.25, 0.21, 0.18), {
      metalness: 0.04,
      gloss: 0.16
    }),
    needles: createMaterial(new pc.Color(0.1, 0.13, 0.09), {
      metalness: 0.02,
      gloss: 0.08
    }),
    needlesDark: createMaterial(new pc.Color(0.06, 0.08, 0.06), {
      metalness: 0.02,
      gloss: 0.06
    }),
    rock: createMaterial(new pc.Color(0.22, 0.23, 0.25), {
      metalness: 0.06,
      gloss: 0.12
    }),
    stone: createMaterial(new pc.Color(0.28, 0.29, 0.31), {
      metalness: 0.08,
      gloss: 0.16
    }),
    lanternGlow: createMaterial(new pc.Color(0.96, 0.48, 0.18), {
      emissive: new pc.Color(0.92, 0.34, 0.08),
      emissiveIntensity: 4.6,
      gloss: 0.72
    }),
    ember: createMaterial(new pc.Color(0.85, 0.25, 0.08), {
      emissive: new pc.Color(1, 0.2, 0.06),
      emissiveIntensity: 4.8,
      gloss: 0.7
    }),
    water: createMaterial(new pc.Color(0.05, 0.06, 0.08), {
      emissive: new pc.Color(0.03, 0.06, 0.1),
      emissiveIntensity: 1.4,
      gloss: 0.52
    }),
    moonGlow: createMaterial(new pc.Color(0.55, 0.66, 0.84), {
      emissive: new pc.Color(0.3, 0.48, 0.78),
      emissiveIntensity: 2.6,
      gloss: 0.6
    }),
    horizon: createMaterial(new pc.Color(0.09, 0.08, 0.09), {
      metalness: 0.02,
      gloss: 0.04
    })
  };

  const playerRig = new pc.Entity("player-rig");
  playerRig.setPosition(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);

  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.14, 0.09, 0.08),
    farClip: 300,
    fov: 72
  });
  playerRig.addChild(camera);
  app.root.addChild(playerRig);

  const duskLight = new pc.Entity("dusk-light");
  duskLight.addComponent("light", {
    type: "directional",
    color: new pc.Color(1, 0.58, 0.28),
    intensity: 1.55,
    castShadows: true
  });
  duskLight.setEulerAngles(28, -52, 0);
  app.root.addChild(duskLight);

  const moonLight = new pc.Entity("moon-light");
  moonLight.addComponent("light", {
    type: "directional",
    color: new pc.Color(0.22, 0.32, 0.48),
    intensity: 0.48
  });
  moonLight.setEulerAngles(72, 118, 0);
  app.root.addChild(moonLight);

  const horizonGlow = new pc.Entity("horizon-glow");
  horizonGlow.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.48, 0.18, 0.1),
    intensity: 0.34,
    range: 120
  });
  horizonGlow.setPosition(-18, 18, -92);
  app.root.addChild(horizonGlow);

  createPrimitive(app, {
    name: "ground",
    type: "box",
    position: [0, -0.5, 0],
    scale: [FOREST_HALF_EXTENT * 2.3, 1, FOREST_HALF_EXTENT * 2.3],
    material: materials.ground,
    castShadows: false
  });

  createPrimitive(app, {
    name: "north-ridge",
    type: "box",
    position: [0, 9, -FOREST_HALF_EXTENT - 18],
    scale: [FOREST_HALF_EXTENT * 2.5, 18, 18],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "south-ridge",
    type: "box",
    position: [0, 8, FOREST_HALF_EXTENT + 18],
    scale: [FOREST_HALF_EXTENT * 2.5, 16, 18],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "west-ridge",
    type: "box",
    position: [-FOREST_HALF_EXTENT - 18, 8, 0],
    scale: [18, 16, FOREST_HALF_EXTENT * 2.5],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "east-ridge",
    type: "box",
    position: [FOREST_HALF_EXTENT + 18, 8, 0],
    scale: [18, 16, FOREST_HALF_EXTENT * 2.5],
    material: materials.horizon
  });

  for (const [index, segment] of FOREST_PATHS.entries()) {
    createPathSegment(app, materials.path, segment, index);
  }

  createTrailhead(app, materials);
  createAshCamp(app, materials);
  createHangingTree(app, materials);
  createStoneCircle(app, materials);
  createHunterBlind(app, materials);
  createBoardedShack(app, materials);
  createBlackWater(app, materials);
  populateForest(app, materials);

  createPrimitive(app, {
    name: "moon",
    type: "sphere",
    position: [78, 44, -102],
    scale: [7.5, 7.5, 7.5],
    material: materials.moonGlow,
    castShadows: false,
    receiveShadows: false
  });

  const landmarkVectors = FOREST_LANDMARKS.map((landmark) => ({
    ...landmark,
    vector: new pc.Vec3(landmark.position.x, 0, landmark.position.z)
  }));

  const trailhead = landmarkVectors[0].vector.clone();

  const describePosition = (position) => {
    const groundPosition = new pc.Vec3(position.x, 0, position.z);
    let nearest = landmarkVectors[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const landmark of landmarkVectors) {
      const distance = groundPosition.clone().sub(landmark.vector).length();

      if (distance < nearestDistance) {
        nearest = landmark;
        nearestDistance = distance;
      }
    }

    const depth = Math.round(groundPosition.clone().sub(trailhead).length());
    const landmarkLabel =
      nearestDistance <= nearest.radius ? nearest.label : `Near ${nearest.label}`;

    let fallbackStatus = "The pines knit together until the trail feels imagined rather than found.";

    if (depth < 24) {
      fallbackStatus = "The lantern glow from the trailhead still lingers between the trunks.";
    } else if (depth < 60) {
      fallbackStatus = "Damp soil and broken branches keep steering you deeper into the grove.";
    } else if (position.x > 18) {
      fallbackStatus = "The eastern forest opens in strange gaps, like something much larger keeps using these routes.";
    } else if (position.x < -18) {
      fallbackStatus = "The western thicket crowds close enough to hide movement even when nothing is there.";
    }

    return {
      landmark: landmarkLabel,
      omen: nearest.omen,
      depth,
      status: nearestDistance <= nearest.radius ? nearest.status : fallbackStatus
    };
  };

  return {
    playerRig,
    camera,
    describePosition
  };
};
