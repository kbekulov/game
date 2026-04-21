import * as pc from "playcanvas";

import { FOREST_HALF_EXTENT, FOREST_LANDMARKS, FOREST_PATHS } from "./config.js";
import { sampleTerrainHeight, sampleTerrainNormal } from "./terrain.js";

const LANDMARK_POSITIONS = new Map(
  FOREST_LANDMARKS.map((landmark) => [landmark.label, landmark.position])
);

const FOREST_GROVES = [
  { center: { x: -236, z: 190 }, radius: 56, target: 28, deadChance: 0.12 },
  { center: { x: -154, z: 116 }, radius: 70, target: 34, deadChance: 0.16 },
  { center: { x: -170, z: 12 }, radius: 88, target: 38, deadChance: 0.22 },
  { center: { x: -226, z: -64 }, radius: 84, target: 30, deadChance: 0.28 },
  { center: { x: -48, z: 136 }, radius: 96, target: 38, deadChance: 0.1 },
  { center: { x: 82, z: 222 }, radius: 92, target: 34, deadChance: 0.14 },
  { center: { x: 172, z: 116 }, radius: 82, target: 34, deadChance: 0.16 },
  { center: { x: 186, z: -112 }, radius: 96, target: 40, deadChance: 0.24 },
  { center: { x: 18, z: -176 }, radius: 92, target: 30, deadChance: 0.3 },
  { center: { x: -82, z: -236 }, radius: 102, target: 34, deadChance: 0.34 }
];

const loadAsset = (app, url, type) =>
  new Promise((resolve, reject) => {
    app.assets.loadFromUrl(url, type, (err, asset) => {
      if (err) {
        reject(new Error(`Failed to load ${url}: ${err}`));
        return;
      }

      resolve(asset);
    });
  });

const createRng = (seed) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const randomRange = (rng, min, max) => min + (max - min) * rng();

const getRenderComponents = (entity) => {
  const renders = entity.findComponents("render");

  if (entity.render && !renders.includes(entity.render)) {
    renders.unshift(entity.render);
  }

  return renders;
};

const applyMaterialToHierarchy = (entity, material) => {
  for (const render of getRenderComponents(entity)) {
    for (const meshInstance of render.meshInstances) {
      meshInstance.material = material;
    }
  }
};

const configureRepeatTexture = (texture, repeat = true) => {
  texture.addressU = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  texture.anisotropy = 8;
};

const configureRenderHierarchy = (entity, castShadows, receiveShadows) => {
  for (const render of getRenderComponents(entity)) {
    render.castShadows = castShadows;
    render.receiveShadows = receiveShadows;
  }
};

const createMaterialVariant = (setup) => {
  const material = new pc.StandardMaterial();
  setup(material);
  material.update();
  return material;
};

const createSceneChild = (
  parent,
  {
    name,
    type,
    material,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
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
  parent.addChild(entity);
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  applyMaterialToHierarchy(entity, material);
  return entity;
};

const addLeafFan = (parent, name, material, position, width, height, rotations, tintScale = 1) => {
  for (const [index, rotationY] of rotations.entries()) {
    createSceneChild(parent, {
      name: `${name}-${index + 1}`,
      type: "plane",
      material,
      position,
      rotation: [90, rotationY, 0],
      scale: [width * tintScale, height * tintScale, 1],
      castShadows: false,
      receiveShadows: false
    });
  }
};

const getLandmarkPosition = (label) => {
  const position = LANDMARK_POSITIONS.get(label);

  if (!position) {
    throw new Error(`Unknown landmark: ${label}`);
  }

  return position;
};

const offsetFromLandmark = (label, dx, dz, y = 0) => {
  const base = getLandmarkPosition(label);

  return {
    x: base.x + dx,
    y,
    z: base.z + dz
  };
};

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

const createGroundMaterial = async (app) => {
  const [diffuseAsset, normalAsset, roughAsset] = await Promise.all([
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_diffuse_2k.jpg", "texture"),
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_nor_gl_2k.png", "texture"),
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_rough_2k.jpg", "texture")
  ]);

  const diffuseTexture = diffuseAsset.resource;
  const normalTexture = normalAsset.resource;
  const roughTexture = roughAsset.resource;

  configureRepeatTexture(diffuseTexture);
  configureRepeatTexture(normalTexture);
  configureRepeatTexture(roughTexture);

  const tilingAmount = Math.round((FOREST_HALF_EXTENT / 96) * 28);
  const tiling = new pc.Vec2(tilingAmount, tilingAmount);
  const material = createMaterialVariant((instance) => {
    instance.diffuse = new pc.Color(0.94, 0.94, 0.94);
    instance.diffuseMap = diffuseTexture;
    instance.diffuseMapTiling = tiling.clone();
    instance.normalMap = normalTexture;
    instance.normalMapTiling = tiling.clone();
    instance.bumpiness = 0.7;
    instance.gloss = 0.28;
    instance.glossMap = roughTexture;
    instance.glossMapChannel = "r";
    instance.glossMapTiling = tiling.clone();
    instance.glossInvert = true;
    instance.metalness = 0;
  });

  return material;
};

const applyGroundDetail = async (app, groundEntity) => {
  const material = await createGroundMaterial(app);
  applyMaterialToHierarchy(groundEntity, material);
};

const createDuskSkydome = async (app) => {
  const skyTextureAsset = await loadAsset(
    app,
    "./assets/textures/sky/qwantani_dusk_1_puresky.jpg",
    "texture"
  );
  const material = createMaterialVariant((instance) => {
    instance.useLighting = false;
    instance.useFog = false;
    instance.diffuse = new pc.Color(0, 0, 0);
    instance.emissive = new pc.Color(1, 1, 1);
    instance.emissiveIntensity = 1.08;
    instance.emissiveMap = skyTextureAsset.resource;
    instance.cull = pc.CULLFACE_FRONT;
    instance.depthWrite = false;
  });

  const skydome = new pc.Entity("dusk-skydome");
  skydome.addComponent("render", {
    type: "sphere",
    castShadows: false,
    receiveShadows: false
  });
  app.root.addChild(skydome);
  skydome.setLocalPosition(0, 72, 0);
  skydome.setLocalScale(FOREST_HALF_EXTENT * 3, FOREST_HALF_EXTENT * 3, FOREST_HALF_EXTENT * 3);
  applyMaterialToHierarchy(skydome, material);
};

const createForestMaterials = async (app) => {
  const [
    barkDiffuseAsset,
    barkNormalAsset,
    barkArmAsset,
    leavesDiffuseAsset,
    leavesNormalAsset,
    leavesArmAsset,
    leavesAlphaAsset
  ] = await Promise.all([
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_diff_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_nor_gl_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_arm_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_leaves_diff_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_leaves_nor_gl_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_leaves_arm_1k.jpg", "texture"),
    loadAsset(app, "./assets/models/tree_small_02/textures/tree_small_02_leaves_alpha_1k.png", "texture")
  ]);

  const barkDiffuse = barkDiffuseAsset.resource;
  const barkNormal = barkNormalAsset.resource;
  const barkArm = barkArmAsset.resource;
  const leavesDiffuse = leavesDiffuseAsset.resource;
  const leavesNormal = leavesNormalAsset.resource;
  const leavesArm = leavesArmAsset.resource;
  const leavesAlpha = leavesAlphaAsset.resource;

  configureRepeatTexture(barkDiffuse);
  configureRepeatTexture(barkNormal);
  configureRepeatTexture(barkArm);
  configureRepeatTexture(leavesDiffuse, false);
  configureRepeatTexture(leavesNormal, false);
  configureRepeatTexture(leavesArm, false);
  configureRepeatTexture(leavesAlpha, false);

  const bark = createMaterialVariant((material) => {
    material.diffuse = new pc.Color(0.74, 0.7, 0.68);
    material.diffuseMap = barkDiffuse;
    material.normalMap = barkNormal;
    material.bumpiness = 0.55;
    material.useMetalness = true;
    material.metalness = 0;
    material.metalnessMap = barkArm;
    material.metalnessMapChannel = "b";
    material.gloss = 0.18;
    material.glossMap = barkArm;
    material.glossMapChannel = "g";
    material.glossInvert = true;
  });

  const deadBark = createMaterialVariant((material) => {
    material.diffuse = new pc.Color(0.58, 0.56, 0.54);
    material.diffuseMap = barkDiffuse;
    material.normalMap = barkNormal;
    material.bumpiness = 0.5;
    material.useMetalness = true;
    material.metalness = 0;
    material.metalnessMap = barkArm;
    material.metalnessMapChannel = "b";
    material.gloss = 0.12;
    material.glossMap = barkArm;
    material.glossMapChannel = "g";
    material.glossInvert = true;
  });

  const leaves = createMaterialVariant((material) => {
    material.diffuse = new pc.Color(0.36, 0.43, 0.34);
    material.diffuseMap = leavesDiffuse;
    material.opacityMap = leavesAlpha;
    material.opacityMapChannel = "r";
    material.alphaTest = 0.44;
    material.cull = pc.CULLFACE_NONE;
    material.twoSidedLighting = true;
    material.normalMap = leavesNormal;
    material.bumpiness = 0.38;
    material.useMetalness = true;
    material.metalness = 0;
    material.metalnessMap = leavesArm;
    material.metalnessMapChannel = "b";
    material.gloss = 0.22;
    material.glossMap = leavesArm;
    material.glossMapChannel = "g";
    material.glossInvert = true;
  });

  const leavesDark = createMaterialVariant((material) => {
    material.diffuse = new pc.Color(0.24, 0.31, 0.24);
    material.diffuseMap = leavesDiffuse;
    material.opacityMap = leavesAlpha;
    material.opacityMapChannel = "r";
    material.alphaTest = 0.44;
    material.cull = pc.CULLFACE_NONE;
    material.twoSidedLighting = true;
    material.normalMap = leavesNormal;
    material.bumpiness = 0.34;
    material.useMetalness = true;
    material.metalness = 0;
    material.metalnessMap = leavesArm;
    material.metalnessMapChannel = "b";
    material.gloss = 0.18;
    material.glossMap = leavesArm;
    material.glossMapChannel = "g";
    material.glossInvert = true;
  });

  return {
    bark,
    deadBark,
    leaves,
    leavesDark
  };
};

const createForestTemplates = (materials) => {
  const tall = new pc.Entity("tree-template-tall");
  createSceneChild(tall, {
    name: "trunk",
    type: "cylinder",
    material: materials.bark,
    position: [0, 4.1, 0],
    scale: [0.24, 4.1, 0.24]
  });
  createSceneChild(tall, {
    name: "branch-left",
    type: "cylinder",
    material: materials.bark,
    position: [-0.44, 4.9, 0.1],
    rotation: [0, 0, -46],
    scale: [0.07, 1.1, 0.07]
  });
  createSceneChild(tall, {
    name: "branch-right",
    type: "cylinder",
    material: materials.bark,
    position: [0.46, 5.5, -0.08],
    rotation: [0, 0, 54],
    scale: [0.07, 1.0, 0.07]
  });
  addLeafFan(tall, "lower-canopy", materials.leavesDark, [0, 4.8, 0], 4.8, 5.2, [0, 60, 120]);
  addLeafFan(tall, "upper-canopy", materials.leaves, [0, 6.7, 0], 3.3, 3.8, [30, 90, 150]);

  const crooked = new pc.Entity("tree-template-crooked");
  createSceneChild(crooked, {
    name: "trunk",
    type: "cylinder",
    material: materials.bark,
    position: [0.12, 3.7, 0],
    rotation: [0, 0, -5],
    scale: [0.22, 3.7, 0.22]
  });
  createSceneChild(crooked, {
    name: "branch-left",
    type: "cylinder",
    material: materials.bark,
    position: [-0.58, 4.2, 0.12],
    rotation: [12, 0, -62],
    scale: [0.06, 1.0, 0.06]
  });
  createSceneChild(crooked, {
    name: "branch-right",
    type: "cylinder",
    material: materials.bark,
    position: [0.62, 4.6, -0.14],
    rotation: [-10, 0, 58],
    scale: [0.06, 0.92, 0.06]
  });
  addLeafFan(crooked, "main-canopy", materials.leavesDark, [0.18, 4.6, 0], 4.1, 4.5, [18, 78, 138]);
  addLeafFan(crooked, "top-canopy", materials.leaves, [0.4, 6.0, 0], 2.7, 3.0, [42, 102]);

  const sapling = new pc.Entity("tree-template-sapling");
  createSceneChild(sapling, {
    name: "trunk",
    type: "cylinder",
    material: materials.bark,
    position: [0, 2.4, 0],
    scale: [0.12, 2.4, 0.12]
  });
  addLeafFan(sapling, "canopy", materials.leaves, [0, 3.1, 0], 2.0, 3.0, [0, 90]);

  const dead = new pc.Entity("tree-template-dead");
  createSceneChild(dead, {
    name: "trunk",
    type: "cylinder",
    material: materials.deadBark,
    position: [0, 4.9, 0],
    scale: [0.19, 4.9, 0.19]
  });
  createSceneChild(dead, {
    name: "branch-1",
    type: "cylinder",
    material: materials.deadBark,
    position: [0.38, 5.7, 0],
    rotation: [14, 0, 58],
    scale: [0.05, 1.25, 0.05]
  });
  createSceneChild(dead, {
    name: "branch-2",
    type: "cylinder",
    material: materials.deadBark,
    position: [-0.42, 4.8, 0.14],
    rotation: [-16, 0, -52],
    scale: [0.05, 1.0, 0.05]
  });
  createSceneChild(dead, {
    name: "branch-3",
    type: "cylinder",
    material: materials.deadBark,
    position: [0.18, 6.8, -0.18],
    rotation: [22, 0, 24],
    scale: [0.04, 0.75, 0.04]
  });

  const deadTall = dead.clone();
  deadTall.name = "tree-template-dead-tall";
  deadTall.setLocalScale(1.12, 1.32, 1.12);

  return {
    tall,
    crooked,
    sapling,
    dead,
    deadTall
  };
};

const cloneTemplate = (template, parent, placement) => {
  const entity = template.clone();
  entity.name = placement.name;
  parent.addChild(entity);
  const groundHeight = sampleTerrainHeight(placement.x, placement.z);
  const slopeNormal = sampleTerrainNormal(placement.x, placement.z);
  entity.setLocalPosition(placement.x, groundHeight + (placement.y ?? 0), placement.z);
  entity.setLocalEulerAngles(
    (placement.tiltX ?? 0) + slopeNormal.z * 7.5,
    placement.rotationY ?? 0,
    (placement.tiltZ ?? 0) - slopeNormal.x * 7.5
  );
  entity.setLocalScale(placement.scale, placement.scale, placement.scale);
  configureRenderHierarchy(
    entity,
    placement.castShadows ?? true,
    placement.receiveShadows ?? true
  );
  return entity;
};

const createTreePlacementHelpers = () => {
  const occupied = new Set();
  const mapLimit = FOREST_HALF_EXTENT - 12;

  const claim = (point, cellSize) => {
    const xCell = Math.round(point.x / cellSize);
    const zCell = Math.round(point.z / cellSize);
    const key = `${xCell}:${zCell}`;

    if (occupied.has(key)) {
      return false;
    }

    occupied.add(key);
    return true;
  };

  const isInsideMap = (point) =>
    Math.abs(point.x) < mapLimit && Math.abs(point.z) < mapLimit;

  const isNearClearing = (point, landmarkPadding, pathPadding) => {
    for (const landmark of FOREST_LANDMARKS) {
      const dx = point.x - landmark.position.x;
      const dz = point.z - landmark.position.z;
      const radius = landmark.radius + landmarkPadding;

      if (dx * dx + dz * dz < radius * radius) {
        return true;
      }
    }

    for (const path of FOREST_PATHS) {
      const safeRadius = path.width + pathPadding;

      if (distanceToSegmentSquared(point, path.start, path.end) < safeRadius * safeRadius) {
        return true;
      }
    }

    return false;
  };

  return {
    claim,
    isInsideMap,
    isNearClearing
  };
};

const placePathEdgeTrees = (root, templates, rng, helpers) => {
  let placed = 0;

  for (const path of FOREST_PATHS) {
    const dx = path.end.x - path.start.x;
    const dz = path.end.z - path.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const nx = -dz / length;
    const nz = dx / length;
    let distance = randomRange(rng, 8, 14);

    while (distance < length - 10) {
      const t = distance / length;
      const anchorX = path.start.x + dx * t;
      const anchorZ = path.start.z + dz * t;
      const sideOffset = path.width * 0.5 + randomRange(rng, 4.6, 8.2);

      for (const side of [-1, 1]) {
        if (rng() < 0.18) {
          continue;
        }

        const point = {
          x: anchorX + nx * side * sideOffset + randomRange(rng, -1.8, 1.8),
          z: anchorZ + nz * side * sideOffset + randomRange(rng, -1.8, 1.8)
        };

        if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 2, 1.8)) {
          continue;
        }

        if (!helpers.claim(point, 6)) {
          continue;
        }

        const templatePool = rng() < 0.76 ? [templates.tall, templates.crooked] : [templates.sapling];
        const template = templatePool[Math.floor(rng() * templatePool.length)];
        cloneTemplate(template, root, {
          name: `path-tree-${placed + 1}`,
          x: point.x,
          z: point.z,
          scale: randomRange(rng, template === templates.sapling ? 1.05 : 1.2, template === templates.sapling ? 1.45 : 1.78),
          rotationY: randomRange(rng, 0, 360),
          tiltX: randomRange(rng, -2.5, 2.5),
          tiltZ: randomRange(rng, -1.5, 1.5),
          receiveShadows: false
        });
        placed += 1;
      }

      distance += randomRange(rng, 12, 20);
    }
  }
};

const placeGroveTrees = (root, templates, rng, helpers) => {
  let placed = 0;

  for (const grove of FOREST_GROVES) {
    let created = 0;

    for (let attempts = 0; attempts < grove.target * 8 && created < grove.target; attempts += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * grove.radius;
      const point = {
        x: grove.center.x + Math.cos(angle) * radius,
        z: grove.center.z + Math.sin(angle) * radius
      };

      if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 6, 3.4)) {
        continue;
      }

      if (!helpers.claim(point, randomRange(rng, 5.2, 7.2))) {
        continue;
      }

      const deadRoll = rng();
      const isDead = deadRoll < grove.deadChance;
      const isSapling = !isDead && rng() < 0.2;
      const template = isDead
        ? rng() < 0.5
          ? templates.dead
          : templates.deadTall
        : isSapling
          ? templates.sapling
          : rng() < 0.55
            ? templates.tall
            : templates.crooked;

      cloneTemplate(template, root, {
        name: `grove-tree-${placed + 1}`,
        x: point.x,
        z: point.z,
        scale: randomRange(
          rng,
          template === templates.sapling ? 0.92 : 1.05,
          template === templates.deadTall ? 1.9 : template === templates.sapling ? 1.36 : 1.82
        ),
        rotationY: randomRange(rng, 0, 360),
        tiltX: randomRange(rng, -3, 3),
        tiltZ: randomRange(rng, -2.2, 2.2),
        receiveShadows: false
      });

      created += 1;
      placed += 1;
    }
  }
};

const placePerimeterTrees = (root, templates, rng, helpers) => {
  let placed = 0;

  for (let attempts = 0; attempts < 320; attempts += 1) {
    const axis = rng() < 0.5 ? "x" : "z";
    const sign = rng() < 0.5 ? -1 : 1;
    const point = {
      x: axis === "x" ? sign * randomRange(rng, FOREST_HALF_EXTENT - 42, FOREST_HALF_EXTENT - 12) : randomRange(rng, -FOREST_HALF_EXTENT + 16, FOREST_HALF_EXTENT - 16),
      z: axis === "z" ? sign * randomRange(rng, FOREST_HALF_EXTENT - 42, FOREST_HALF_EXTENT - 12) : randomRange(rng, -FOREST_HALF_EXTENT + 16, FOREST_HALF_EXTENT - 16)
    };

    if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 8, 4)) {
      continue;
    }

    if (!helpers.claim(point, 7.2)) {
      continue;
    }

    const template = rng() < 0.18 ? templates.deadTall : rng() < 0.44 ? templates.crooked : templates.tall;

    cloneTemplate(template, root, {
      name: `perimeter-tree-${placed + 1}`,
      x: point.x,
      z: point.z,
      scale: randomRange(rng, 1.35, 2.2),
      rotationY: randomRange(rng, 0, 360),
      tiltX: randomRange(rng, -2.4, 2.4),
      tiltZ: randomRange(rng, -1.8, 1.8),
      receiveShadows: false
    });

    placed += 1;

    if (placed >= 86) {
      break;
    }
  }
};

const placeSpecialTrees = (root, templates) => {
  const hangingTree = getLandmarkPosition("Hanging Tree");
  cloneTemplate(templates.deadTall, root, {
    name: "landmark-hanging-tree",
    x: hangingTree.x,
    z: hangingTree.z,
    scale: 2.08,
    rotationY: 26,
    tiltX: 0,
    tiltZ: -2.8,
    receiveShadows: false
  });

  const blackWater = getLandmarkPosition("Black Water");
  cloneTemplate(templates.dead, root, {
    name: "landmark-black-water-tree-1",
    x: blackWater.x - 10.6,
    z: blackWater.z + 7.8,
    scale: 1.62,
    rotationY: 214,
    tiltZ: 1.8,
    receiveShadows: false
  });
  cloneTemplate(templates.deadTall, root, {
    name: "landmark-black-water-tree-2",
    x: blackWater.x + 9.8,
    z: blackWater.z - 11.4,
    scale: 1.46,
    rotationY: 84,
    tiltX: -1.6,
    receiveShadows: false
  });

  const shack = getLandmarkPosition("Boarded Shack");
  cloneTemplate(templates.crooked, root, {
    name: "landmark-shack-tree",
    x: shack.x + 11.2,
    z: shack.z + 8.4,
    scale: 1.72,
    rotationY: 132,
    receiveShadows: false
  });
};

const addModeledForest = async (app, parent) => {
  const materials = await createForestMaterials(app);
  const templates = createForestTemplates(materials);
  const forestRoot = new pc.Entity("modeled-forest");
  parent.addChild(forestRoot);

  const rng = createRng(24891);
  const helpers = createTreePlacementHelpers();

  placeGroveTrees(forestRoot, templates, rng, helpers);
  placePathEdgeTrees(forestRoot, templates, rng, helpers);
  placePerimeterTrees(forestRoot, templates, rng, helpers);
  placeSpecialTrees(forestRoot, templates);
};

const placeModelEntity = (asset, parent, placement) => {
  const entity = asset.resource.instantiateRenderEntity({
    castShadows: placement.castShadows ?? true,
    receiveShadows: placement.receiveShadows ?? true
  });

  entity.name = placement.name;
  parent.addChild(entity);
  entity.setLocalPosition(
    placement.x,
    sampleTerrainHeight(placement.x, placement.z) + (placement.y ?? 0),
    placement.z
  );
  entity.setLocalEulerAngles(0, placement.rotationY ?? 0, 0);
  entity.setLocalScale(placement.scale, placement.scale, placement.scale);
  configureRenderHierarchy(
    entity,
    placement.castShadows ?? true,
    placement.receiveShadows ?? true
  );
};

const addGroundProps = async (app, parent) => {
  const [stumpAsset, rootAsset] = await Promise.all([
    loadAsset(app, "./assets/models/tree_stump_02/tree_stump_02_1k.gltf", "container"),
    loadAsset(app, "./assets/models/root_cluster_02/root_cluster_02_1k.gltf", "container")
  ]);

  const stumpPlacements = [
    { name: "hero-stump-trailhead", ...offsetFromLandmark("Trailhead Lantern", 10.6, -8.8, 0.22), scale: 1.24, rotationY: 32 },
    { name: "hero-stump-ash-camp", ...offsetFromLandmark("Ash Camp", -8.4, 7.8, 0.25), scale: 1.34, rotationY: 146 },
    { name: "hero-stump-split-creek", ...offsetFromLandmark("Split Creek", 9.2, -10.4, 0.22), scale: 1.18, rotationY: 68 },
    { name: "hero-stump-hanging-tree", ...offsetFromLandmark("Hanging Tree", 6.8, -6.4, 0.24), scale: 1.42, rotationY: 112 },
    { name: "hero-stump-witch-stones", ...offsetFromLandmark("Witch Stones", 11.6, -9.4, 0.24), scale: 1.46, rotationY: 208 },
    { name: "hero-stump-hunter-blind", ...offsetFromLandmark("Hunter's Blind", -12.8, -8.2, 0.23), scale: 1.24, rotationY: 284 },
    { name: "hero-stump-black-water", ...offsetFromLandmark("Black Water", -13.6, 8.4, 0.24), scale: 1.22, rotationY: 44 },
    { name: "hero-stump-shack", ...offsetFromLandmark("Boarded Shack", 10.2, 8.8, 0.24), scale: 1.24, rotationY: 150 },
    { name: "hero-stump-bridge", ...offsetFromLandmark("Collapsed Bridge", -10.4, 6.8, 0.22), scale: 1.18, rotationY: 248 },
    { name: "hero-stump-tower", ...offsetFromLandmark("Radio Tower Base", 8.8, 11.2, 0.22), scale: 1.28, rotationY: 18 }
  ];

  for (const placement of stumpPlacements) {
    placeModelEntity(stumpAsset, parent, placement);
  }

  const rootPlacements = [
    { name: "hero-roots-trailhead", ...offsetFromLandmark("Trailhead Lantern", -12.4, -10.8, 0.02), scale: 3.9, rotationY: 16 },
    { name: "hero-roots-ash-camp", ...offsetFromLandmark("Ash Camp", -14.2, -8.2, 0.02), scale: 4.1, rotationY: 102 },
    { name: "hero-roots-hanging-tree", ...offsetFromLandmark("Hanging Tree", -16.8, -10.6, 0.02), scale: 4.7, rotationY: 238 },
    { name: "hero-roots-witch-stones", ...offsetFromLandmark("Witch Stones", -18.4, 8.2, 0.02), scale: 4.4, rotationY: 314 },
    { name: "hero-roots-hunter-blind", ...offsetFromLandmark("Hunter's Blind", 11.8, -11.8, 0.02), scale: 4.0, rotationY: 154 },
    { name: "hero-roots-black-water", ...offsetFromLandmark("Black Water", -15.2, -12.4, 0.02), scale: 4.8, rotationY: 206 },
    { name: "hero-roots-shack", ...offsetFromLandmark("Boarded Shack", -12.8, 12.6, 0.02), scale: 4.1, rotationY: 52 },
    { name: "hero-roots-bridge", ...offsetFromLandmark("Collapsed Bridge", 13.2, 12.2, 0.02), scale: 4.2, rotationY: 286 }
  ];

  for (const placement of rootPlacements) {
    placeModelEntity(rootAsset, parent, placement);
  }
};

export const enhanceForestEnvironment = async (app, { groundEntity }) => {
  const detailRoot = new pc.Entity("forest-detail-assets");
  app.root.addChild(detailRoot);

  const results = await Promise.allSettled([
    createDuskSkydome(app),
    applyGroundDetail(app, groundEntity),
    addGroundProps(app, detailRoot),
    addModeledForest(app, detailRoot)
  ]);

  const failed = results.filter((result) => result.status === "rejected");

  for (const result of failed) {
    console.warn(result.reason);
  }

  return {
    failedCount: failed.length
  };
};
