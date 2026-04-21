import * as pc from "playcanvas";

import { enhanceForestEnvironment } from "./environment-assets.js";
import { createViewModel } from "./view-model.js";
import {
  FOREST_HALF_EXTENT,
  FOREST_LANDMARKS,
  FOREST_PATHS,
  PLAYER_START
} from "./config.js";

const LANDMARK_POSITION_BY_LABEL = new Map(
  FOREST_LANDMARKS.map((landmark) => [landmark.label, landmark.position])
);

const getLandmarkPosition = (label) => {
  const position = LANDMARK_POSITION_BY_LABEL.get(label);

  if (!position) {
    throw new Error(`Unknown landmark: ${label}`);
  }

  return position;
};

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
  const position = getLandmarkPosition("Trailhead Lantern");
  const anchor = createAnchor(app, "trailhead", { x: position.x, y: 0, z: position.z });

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

  createLantern(app, materials, "trailhead-lantern-left", {
    x: position.x - 2.4,
    y: 0,
    z: position.z + 1.8
  });
  createLantern(app, materials, "trailhead-lantern-right", {
    x: position.x + 2.7,
    y: 0,
    z: position.z - 2.8
  }, {
    intensity: 0.92,
    range: 11
  });
};

const createAshCamp = (app, materials) => {
  const position = getLandmarkPosition("Ash Camp");
  const center = { x: position.x, y: 0, z: position.z };

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

  createLog(app, materials, "ash-camp-log-1", { x: center.x - 1.2, z: center.z + 0.9 }, 1.05, 32);
  createLog(app, materials, "ash-camp-log-2", { x: center.x + 1.2, z: center.z - 0.9 }, 0.96, -18);
  createLog(app, materials, "ash-camp-log-3", { x: center.x + 0.9, z: center.z + 1.8 }, 0.9, 96);
};

const createHangingTree = (app, materials) => {
  const center = getLandmarkPosition("Hanging Tree");

  createPrimitive(app, {
    name: "hanging-tree-lantern-chain",
    type: "box",
    position: [center.x + 1.8, 6.6, center.z - 0.1],
    scale: [0.04, 2.6, 0.04],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "hanging-tree-lantern",
    type: "sphere",
    position: [center.x + 1.8, 5.25, center.z - 0.1],
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
  lanternLight.setPosition(center.x + 1.8, 5.4, center.z - 0.1);
};

const createStoneCircle = (app, materials) => {
  const center = getLandmarkPosition("Witch Stones");

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
  const position = getLandmarkPosition("Hunter's Blind");
  const anchor = createAnchor(app, "hunters-blind", { x: position.x, y: 0, z: position.z });

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

  createLantern(app, materials, "blind-lantern", {
    x: position.x + 2.6,
    y: 0,
    z: position.z - 1.6
  }, {
    intensity: 0.84,
    range: 12
  });
};

const createBoardedShack = (app, materials) => {
  const position = getLandmarkPosition("Boarded Shack");
  const anchor = createAnchor(app, "boarded-shack", { x: position.x, y: 0, z: position.z });

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

  createLantern(app, materials, "shack-lantern", {
    x: position.x - 3.2,
    y: 0,
    z: position.z + 3.2
  }, {
    intensity: 0.78,
    range: 11
  });
};

const createBlackWater = (app, materials) => {
  const center = getLandmarkPosition("Black Water");

  createPrimitive(app, {
    name: "black-water-pool",
    type: "box",
    position: [center.x, -0.34, center.z],
    scale: [22, 0.12, 16],
    material: materials.water,
    castShadows: false
  });

  createRock(app, materials, "black-water-rock-1", {
    x: center.x - 8.2,
    y: 0.22,
    z: center.z - 5.2
  }, 1.5, createRng(1201));
  createRock(app, materials, "black-water-rock-2", {
    x: center.x + 10.8,
    y: 0.18,
    z: center.z + 6.6
  }, 1.2, createRng(1202));

  const waterLight = new pc.Entity("black-water-light");
  waterLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.22, 0.32, 0.56),
    intensity: 0.48,
    range: 16
  });
  app.root.addChild(waterLight);
  waterLight.setPosition(center.x, 1.2, center.z);
};

const createGravePath = (app, materials) => {
  const center = getLandmarkPosition("Grave Path");

  const markerOffsets = [
    [-1.6, 0.2],
    [0.1, -0.4],
    [1.9, 0.3]
  ];

  for (const [index, offset] of markerOffsets.entries()) {
    const anchor = createAnchor(app, `grave-marker-${index + 1}`, {
      x: center.x + offset[0],
      y: 0,
      z: center.z + offset[1]
    });

    createPrimitive(app, {
      name: `grave-marker-post-${index + 1}`,
      type: "box",
      parent: anchor,
      position: [0, 1.2, 0],
      rotation: [0, 0, index === 1 ? -6 : 4],
      scale: [0.12, 2.4, 0.12],
      material: materials.deadWood
    });

    createPrimitive(app, {
      name: `grave-marker-cross-${index + 1}`,
      type: "box",
      parent: anchor,
      position: [0, 1.9, 0],
      scale: [0.72, 0.12, 0.12],
      material: materials.deadWood
    });
  }

  createLantern(app, materials, "grave-path-lantern", {
    x: center.x + 3.6,
    y: 0,
    z: center.z - 2.4
  }, {
    intensity: 0.72,
    range: 11
  });
};

const createCollapsedBridge = (app, materials) => {
  const center = getLandmarkPosition("Collapsed Bridge");

  createPrimitive(app, {
    name: "bridge-ditch",
    type: "box",
    position: [center.x, -0.52, center.z],
    scale: [12, 0.6, 7.2],
    material: materials.water,
    castShadows: false
  });

  createPrimitive(app, {
    name: "bridge-beam-left",
    type: "box",
    position: [center.x - 2.2, 0.38, center.z],
    rotation: [0, 18, 0],
    scale: [0.24, 0.24, 9.2],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "bridge-beam-right",
    type: "box",
    position: [center.x + 1.8, 0.22, center.z + 0.8],
    rotation: [0, 18, 0],
    scale: [0.24, 0.24, 6.2],
    material: materials.deadWood
  });

  for (let index = 0; index < 5; index += 1) {
    createPrimitive(app, {
      name: `bridge-plank-${index + 1}`,
      type: "box",
      position: [center.x - 1.6 + index * 0.94, 0.52 - index * 0.07, center.z - 0.18 + index * 0.22],
      rotation: [0, 18, index % 2 === 0 ? 3 : -4],
      scale: [0.86, 0.08, 2.9],
      material: materials.shackWood
    });
  }
};

const createRadioTowerBase = (app, materials) => {
  const center = getLandmarkPosition("Radio Tower Base");
  const anchor = createAnchor(app, "radio-tower-base", { x: center.x, y: 0, z: center.z });

  const legs = [
    [-2.8, 0, -2.4],
    [2.5, 0, -2.6],
    [-2.6, 0, 2.5],
    [2.7, 0, 2.8]
  ];

  for (const [index, offset] of legs.entries()) {
    createPrimitive(app, {
      name: `tower-leg-${index + 1}`,
      type: "box",
      parent: anchor,
      position: [offset[0], 6.2, offset[2]],
      rotation: [0, 0, index % 2 === 0 ? 12 : -12],
      scale: [0.18, 12.4, 0.18],
      material: materials.deadWood
    });
  }

  createPrimitive(app, {
    name: "tower-platform",
    type: "box",
    parent: anchor,
    position: [0, 11.4, 0],
    scale: [5.8, 0.16, 5.8],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "tower-mast",
    type: "box",
    parent: anchor,
    position: [0, 17.2, 0],
    scale: [0.22, 11.6, 0.22],
    material: materials.deadWood
  });

  createPrimitive(app, {
    name: "tower-light",
    type: "sphere",
    parent: anchor,
    position: [0, 22.6, 0],
    scale: [0.26, 0.26, 0.26],
    material: materials.lanternGlow,
    castShadows: false,
    receiveShadows: false
  });

  const signalLight = new pc.Entity("tower-light-glow");
  signalLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.84, 0.18, 0.12),
    intensity: 0.34,
    range: 14
  });
  anchor.addChild(signalLight);
  signalLight.setLocalPosition(0, 22.6, 0);
};

const populateForest = (app, materials) => {
  const rng = createRng(1337);
  const landmarkExclusions = FOREST_LANDMARKS.map((landmark) => ({
    x: landmark.position.x,
    z: landmark.position.z,
    radius: landmark.radius + 8.5
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
      const safeRadius = path.width + 3.2;
      if (distanceToSegmentSquared(point, path.start, path.end) < safeRadius * safeRadius) {
        return true;
      }
    }

    return false;
  };

  let rocks = 0;
  let stumps = 0;

  for (let attempts = 0; attempts < 2600; attempts += 1) {
    const point = {
      x: randomRange(rng, -FOREST_HALF_EXTENT + 12, FOREST_HALF_EXTENT - 12),
      z: randomRange(rng, -FOREST_HALF_EXTENT + 12, FOREST_HALF_EXTENT - 12)
    };

    if (isInClearing(point)) {
      continue;
    }

    if (rocks < 160 && rng() < 0.52) {
      createRock(
        app,
        materials,
        `forest-rock-${rocks + 1}`,
        { x: point.x, y: 0.16, z: point.z },
        randomRange(rng, 0.45, 1.45),
        rng
      );
      rocks += 1;
      continue;
    }

    if (stumps < 128) {
      createStump(
        app,
        materials,
        `forest-stump-${stumps + 1}`,
        { x: point.x, z: point.z },
        randomRange(rng, 0.72, 1.38),
        rng
      );
      stumps += 1;
    }

    if (rocks >= 160 && stumps >= 128) {
      break;
    }
  }

  const pathLogs = [
    { x: -132, z: 110, length: 1.6, rotationY: 38 },
    { x: -58, z: 58, length: 1.25, rotationY: -24 },
    { x: 68, z: 132, length: 1.35, rotationY: 62 },
    { x: 144, z: 28, length: 1.5, rotationY: 18 },
    { x: 82, z: -108, length: 1.4, rotationY: 74 },
    { x: -146, z: -42, length: 1.55, rotationY: 26 },
    { x: -42, z: -196, length: 1.45, rotationY: -14 }
  ];

  for (const [index, log] of pathLogs.entries()) {
    createLog(app, materials, `path-log-${index + 1}`, log, log.length, log.rotationY);
  }
};

export const buildScene = (app) => {
  app.scene.ambientLight = new pc.Color(0.07, 0.08, 0.09);
  app.scene.fog.type = pc.FOG_LINEAR;
  app.scene.fog.color.set(0.08, 0.07, 0.08);
  app.scene.fog.start = 32;
  app.scene.fog.end = 220;

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

  const cameraRig = new pc.Entity("camera-rig");
  playerRig.addChild(cameraRig);

  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.14, 0.09, 0.08),
    nearClip: 0.03,
    farClip: 900,
    fov: 72
  });
  cameraRig.addChild(camera);
  const viewModel = createViewModel(camera);
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
    range: 260
  });
  horizonGlow.setPosition(-76, 28, -FOREST_HALF_EXTENT - 128);
  app.root.addChild(horizonGlow);

  const ground = createPrimitive(app, {
    name: "ground",
    type: "box",
    position: [0, -0.5, 0],
    scale: [FOREST_HALF_EXTENT * 2.4, 1, FOREST_HALF_EXTENT * 2.4],
    material: materials.ground,
    castShadows: false
  });

  createPrimitive(app, {
    name: "north-ridge",
    type: "box",
    position: [0, 15, -FOREST_HALF_EXTENT - 42],
    scale: [FOREST_HALF_EXTENT * 2.7, 30, 42],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "south-ridge",
    type: "box",
    position: [0, 14, FOREST_HALF_EXTENT + 42],
    scale: [FOREST_HALF_EXTENT * 2.7, 28, 42],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "west-ridge",
    type: "box",
    position: [-FOREST_HALF_EXTENT - 42, 14, 0],
    scale: [42, 28, FOREST_HALF_EXTENT * 2.7],
    material: materials.horizon
  });

  createPrimitive(app, {
    name: "east-ridge",
    type: "box",
    position: [FOREST_HALF_EXTENT + 42, 14, 0],
    scale: [42, 28, FOREST_HALF_EXTENT * 2.7],
    material: materials.horizon
  });

  for (const [index, segment] of FOREST_PATHS.entries()) {
    createPathSegment(app, materials.path, segment, index);
  }

  createTrailhead(app, materials);
  createAshCamp(app, materials);
  createGravePath(app, materials);
  createHangingTree(app, materials);
  createStoneCircle(app, materials);
  createHunterBlind(app, materials);
  createBoardedShack(app, materials);
  createBlackWater(app, materials);
  createCollapsedBridge(app, materials);
  createRadioTowerBase(app, materials);
  populateForest(app, materials);

  createPrimitive(app, {
    name: "moon",
    type: "sphere",
    position: [FOREST_HALF_EXTENT * 0.82, 126, -FOREST_HALF_EXTENT - 180],
    scale: [18, 18, 18],
    material: materials.moonGlow,
    castShadows: false,
    receiveShadows: false
  });

  const environmentReady = enhanceForestEnvironment(app, { groundEntity: ground });

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

    let fallbackStatus = "The modeled pines and drowned paths keep shifting the forest's scale until direction stops feeling trustworthy.";

    if (depth < 72) {
      fallbackStatus = "The lantern glow from the trailhead still lingers between the trunks.";
    } else if (depth < 180) {
      fallbackStatus = "The trails keep branching into darker corridors, and every turn feels chosen for you.";
    } else if (position.x > 80) {
      fallbackStatus = "The eastern forest breaks into wider service trails and deeper stands that swallow the moonlight.";
    } else if (position.x < -80) {
      fallbackStatus = "The western thicket crowds close enough to hide movement even when nothing is there.";
    } else if (position.z < -80) {
      fallbackStatus = "The southern reaches feel abandoned by everything except wind, rot, and old infrastructure.";
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
    cameraRig,
    camera,
    viewModel,
    describePosition,
    environmentReady
  };
};
