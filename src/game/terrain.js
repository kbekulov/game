import * as pc from "playcanvas";

import { FOREST_HALF_EXTENT, FOREST_LANDMARKS, FOREST_PATHS } from "./config.js";

const TERRAIN_SIZE = FOREST_HALF_EXTENT * 2.5;
const TERRAIN_SUBDIVISIONS = 180;
const TERRAIN_EDGE_START = FOREST_HALF_EXTENT * 0.64;
const TERRAIN_EDGE_END = FOREST_HALF_EXTENT * 1.08;

const LANDMARK_POSITIONS = new Map(
  FOREST_LANDMARKS.map((landmark) => [landmark.label, landmark.position])
);

const LANDMARK_HEIGHT_OFFSETS = new Map([
  ["Trailhead Lantern", 0.2],
  ["Ash Camp", 0.3],
  ["Split Creek", -0.4],
  ["Grave Path", 0.1],
  ["Hanging Tree", 1.2],
  ["Hunter's Blind", 2.4],
  ["Black Water", -1.4],
  ["Witch Stones", 2.1],
  ["Boarded Shack", 0.7],
  ["Collapsed Bridge", -0.8],
  ["Radio Tower Base", 3.1]
]);

const clamp01 = (value) => pc.math.clamp(value, 0, 1);

const lerp = (start, end, amount) => start + (end - start) * amount;

const smoothstep = (min, max, value) => {
  if (min === max) {
    return value < min ? 0 : 1;
  }

  const t = clamp01((value - min) / (max - min));
  return t * t * (3 - 2 * t);
};

const smootherstep = (min, max, value) => {
  if (min === max) {
    return value < min ? 0 : 1;
  }

  const t = clamp01((value - min) / (max - min));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const rotatePoint = (x, z, degrees) => {
  const radians = degrees * pc.math.DEG_TO_RAD;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: x * cosine - z * sine,
    z: x * sine + z * cosine
  };
};

const getLandmarkPosition = (label) => {
  const position = LANDMARK_POSITIONS.get(label);

  if (!position) {
    throw new Error(`Unknown terrain landmark: ${label}`);
  }

  return position;
};

const sampleMacroTerrainHeight = (x, z) => {
  const warpX = x + Math.sin(z * 0.008) * 24 + Math.cos((x - z) * 0.0065) * 14;
  const warpZ = z + Math.cos(x * 0.0074) * 26 - Math.sin((x + z) * 0.005) * 12;

  let height =
    Math.sin(warpX * 0.0084) * 5.6 +
    Math.cos(warpZ * 0.006) * 5 +
    Math.sin((warpX + warpZ) * 0.0038) * 6.8 +
    Math.cos((warpX - warpZ) * 0.0046) * 3.1;

  height +=
    Math.sin(warpX * 0.027) * 1.15 +
    Math.cos(warpZ * 0.031) * 0.92 +
    Math.sin((warpX + warpZ) * 0.022) * 0.68;

  const edgeBlend = smootherstep(
    TERRAIN_EDGE_START,
    TERRAIN_EDGE_END,
    Math.max(Math.abs(x), Math.abs(z))
  );

  height += edgeBlend * edgeBlend * 14.5;

  return height;
};

const sampleFeatureHeight = (x, z) => {
  let height = sampleMacroTerrainHeight(x, z);

  const blackWater = getLandmarkPosition("Black Water");
  const blackWaterDx = x - blackWater.x;
  const blackWaterDz = z - blackWater.z;
  height -= Math.exp(-((blackWaterDx * blackWaterDx) / 160 + (blackWaterDz * blackWaterDz) / 120)) * 5.8;

  const splitCreek = getLandmarkPosition("Split Creek");
  const splitCreekLocal = rotatePoint(x - splitCreek.x, z - splitCreek.z, -36);
  height -= Math.exp(-((splitCreekLocal.x * splitCreekLocal.x) / 640 + (splitCreekLocal.z * splitCreekLocal.z) / 90)) * 2.7;

  const collapsedBridge = getLandmarkPosition("Collapsed Bridge");
  const bridgeLocal = rotatePoint(x - collapsedBridge.x, z - collapsedBridge.z, -18);
  height -= Math.exp(-((bridgeLocal.x * bridgeLocal.x) / 840 + (bridgeLocal.z * bridgeLocal.z) / 64)) * 4.2;

  const witchStones = getLandmarkPosition("Witch Stones");
  const witchDx = x - witchStones.x;
  const witchDz = z - witchStones.z;
  height += Math.exp(-((witchDx * witchDx) / 1400 + (witchDz * witchDz) / 1400)) * 3.6;

  const huntersBlind = getLandmarkPosition("Hunter's Blind");
  const blindDx = x - huntersBlind.x;
  const blindDz = z - huntersBlind.z;
  height += Math.exp(-((blindDx * blindDx) / 2200 + (blindDz * blindDz) / 2200)) * 4.1;

  const radioTower = getLandmarkPosition("Radio Tower Base");
  const towerDx = x - radioTower.x;
  const towerDz = z - radioTower.z;
  height += Math.exp(-((towerDx * towerDx) / 1700 + (towerDz * towerDz) / 1700)) * 4.8;

  const hangingTree = getLandmarkPosition("Hanging Tree");
  const hangingDx = x - hangingTree.x;
  const hangingDz = z - hangingTree.z;
  height += Math.exp(-((hangingDx * hangingDx) / 1900 + (hangingDz * hangingDz) / 1300)) * 2.2;

  return height;
};

const LANDMARK_SURFACES = FOREST_LANDMARKS.map((landmark) => ({
  ...landmark,
  targetHeight:
    sampleFeatureHeight(landmark.position.x, landmark.position.z) +
    (LANDMARK_HEIGHT_OFFSETS.get(landmark.label) ?? 0)
}));

const getClosestPathInfo = (x, z) => {
  let closest = {
    distance: Number.POSITIVE_INFINITY,
    nearestX: x,
    nearestZ: z,
    width: 0
  };

  for (const path of FOREST_PATHS) {
    const dx = path.end.x - path.start.x;
    const dz = path.end.z - path.start.z;
    const lengthSquared = dx * dx + dz * dz;
    const projection =
      lengthSquared === 0
        ? 0
        : ((x - path.start.x) * dx + (z - path.start.z) * dz) / lengthSquared;
    const t = clamp01(projection);
    const nearestX = path.start.x + dx * t;
    const nearestZ = path.start.z + dz * t;
    const distance = Math.hypot(x - nearestX, z - nearestZ);

    if (distance < closest.distance) {
      closest = {
        distance,
        nearestX,
        nearestZ,
        width: path.width
      };
    }
  }

  return closest;
};

const blendPathHeight = (height, x, z) => {
  const nearestPath = getClosestPathInfo(x, z);
  const pathRadius = nearestPath.width * 0.58 + 5.8;
  const shoulderBlend = 1 - smoothstep(nearestPath.width * 0.18, pathRadius, nearestPath.distance);

  if (shoulderBlend <= 0) {
    return height;
  }

  const targetHeight =
    sampleFeatureHeight(nearestPath.nearestX, nearestPath.nearestZ) - 0.18;

  return lerp(height, targetHeight, shoulderBlend * 0.76);
};

const blendLandmarkHeight = (height, x, z) => {
  let result = height;

  for (const landmark of LANDMARK_SURFACES) {
    const dx = x - landmark.position.x;
    const dz = z - landmark.position.z;
    const distance = Math.hypot(dx, dz);
    const influenceRadius = landmark.radius + 12;
    const blend = 1 - smoothstep(landmark.radius * 0.34, influenceRadius, distance);

    if (blend <= 0) {
      continue;
    }

    const strength =
      landmark.label === "Black Water"
        ? 0.95
        : landmark.label === "Collapsed Bridge"
          ? 0.88
          : 0.72;

    result = lerp(result, landmark.targetHeight, Math.pow(blend, 1.35) * strength);
  }

  return result;
};

export const sampleTerrainHeight = (x, z) => {
  const featureHeight = sampleFeatureHeight(x, z);
  const pathHeight = blendPathHeight(featureHeight, x, z);
  return blendLandmarkHeight(pathHeight, x, z);
};

export const sampleTerrainNormal = (x, z, step = 1.6) => {
  const left = sampleTerrainHeight(x - step, z);
  const right = sampleTerrainHeight(x + step, z);
  const back = sampleTerrainHeight(x, z - step);
  const front = sampleTerrainHeight(x, z + step);

  return new pc.Vec3(left - right, step * 2, back - front).normalize();
};

export const createTerrainEntity = (app, material) => {
  const positions = [];
  const uvs = [];
  const indices = [];
  const halfSize = TERRAIN_SIZE * 0.5;

  for (let row = 0; row <= TERRAIN_SUBDIVISIONS; row += 1) {
    for (let column = 0; column <= TERRAIN_SUBDIVISIONS; column += 1) {
      const x = (column / TERRAIN_SUBDIVISIONS) * TERRAIN_SIZE - halfSize;
      const z = ((TERRAIN_SUBDIVISIONS - row) / TERRAIN_SUBDIVISIONS) * TERRAIN_SIZE - halfSize;
      const y = sampleTerrainHeight(x, z);

      positions.push(x, y, z);
      uvs.push(column / TERRAIN_SUBDIVISIONS, 1 - row / TERRAIN_SUBDIVISIONS);
    }
  }

  for (let row = 0; row < TERRAIN_SUBDIVISIONS; row += 1) {
    for (let column = 0; column < TERRAIN_SUBDIVISIONS; column += 1) {
      const index = column + row * (TERRAIN_SUBDIVISIONS + 1);

      indices.push(index, index + 1, index + TERRAIN_SUBDIVISIONS + 2);
      indices.push(index, index + TERRAIN_SUBDIVISIONS + 2, index + TERRAIN_SUBDIVISIONS + 1);
    }
  }

  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(pc.calculateNormals(positions, indices));
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update();

  const meshInstance = new pc.MeshInstance(mesh, material);
  meshInstance.castShadow = false;

  const terrain = new pc.Entity("terrain");
  terrain.addComponent("render", {
    castShadows: false,
    receiveShadows: true,
    meshInstances: [meshInstance]
  });
  app.root.addChild(terrain);

  return terrain;
};
