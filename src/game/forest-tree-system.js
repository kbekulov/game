import * as pc from "playcanvas";

import { FOREST_HALF_EXTENT, FOREST_LANDMARKS, FOREST_PATHS } from "./config.js";
import { sampleTerrainHeight, sampleTerrainNormal } from "./terrain.js";

const BULK_TREE_URL =
  "https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/fir_sapling/fir_sapling_1k.gltf";
const HERO_TREE_URL = "./assets/models/tree_small_02/tree_small_02_1k.gltf";

const LANDMARK_POSITIONS = new Map(
  FOREST_LANDMARKS.map((landmark) => [landmark.label, landmark.position])
);

const FOREST_GROVES = [
  { center: { x: -236, z: 190 }, radius: 56, target: 15 },
  { center: { x: -154, z: 116 }, radius: 70, target: 18 },
  { center: { x: -170, z: 12 }, radius: 88, target: 20 },
  { center: { x: -226, z: -64 }, radius: 84, target: 16 },
  { center: { x: -48, z: 136 }, radius: 96, target: 20 },
  { center: { x: 82, z: 222 }, radius: 92, target: 18 },
  { center: { x: 172, z: 116 }, radius: 82, target: 18 },
  { center: { x: 186, z: -112 }, radius: 96, target: 20 },
  { center: { x: 18, z: -176 }, radius: 92, target: 16 },
  { center: { x: -82, z: -236 }, radius: 102, target: 16 }
];

const loadContainerAsset = (app, url) =>
  new Promise((resolve, reject) => {
    app.assets.loadFromUrl(url, "container", (err, asset) => {
      if (err) {
        reject(new Error(`Failed to load forest model ${url}: ${err}`));
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

const getLandmarkPosition = (label) => {
  const position = LANDMARK_POSITIONS.get(label);

  if (!position) {
    throw new Error(`Unknown landmark: ${label}`);
  }

  return position;
};

const offsetFromLandmark = (label, dx, dz) => {
  const base = getLandmarkPosition(label);

  return {
    x: base.x + dx,
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

const getRenderComponents = (entity) => {
  const renders = entity.findComponents("render");

  if (entity.render && !renders.includes(entity.render)) {
    renders.unshift(entity.render);
  }

  return renders;
};

const getMeshInstances = (entity) =>
  getRenderComponents(entity).flatMap((render) => render.meshInstances ?? []);

const configureRenderHierarchy = (entity, castShadows, receiveShadows) => {
  for (const render of getRenderComponents(entity)) {
    render.castShadows = castShadows;
    render.receiveShadows = receiveShadows;
  }
};

const extractRenderableTemplates = (root) => {
  const sourceRoots = root.children.length > 0 ? [...root.children] : [root];
  const templates = sourceRoots
    .filter((entity) => getRenderComponents(entity).length > 0)
    .map((entity, index) => {
      const template = entity.clone();
      template.name = entity.name || `tree-template-${index + 1}`;
      template.setLocalPosition(0, 0, 0);
      template.setLocalEulerAngles(0, 0, 0);
      template.setLocalScale(1, 1, 1);
      configureRenderHierarchy(template, true, false);
      return template;
    });

  root.destroy();
  return templates;
};

const createMaterialLibrary = (template, customizeMaterial) => {
  const materials = new Map();

  for (const meshInstance of getMeshInstances(template)) {
    const baseMaterial = meshInstance.material;

    if (!baseMaterial || materials.has(baseMaterial.name)) {
      continue;
    }

    const variantMaterial = baseMaterial.clone();
    customizeMaterial(baseMaterial.name, variantMaterial);
    variantMaterial.update();
    materials.set(baseMaterial.name, variantMaterial);
  }

  return materials;
};

const createBulkTreeVariants = (template) => ({
  sunlit: {
    materials: createMaterialLibrary(template, (materialName, material) => {
      material.gloss = Math.min(material.gloss ?? 0.14, 0.14);

      if (materialName.includes("branches")) {
        material.diffuse = new pc.Color(0.2, 0.12, 0.06);
        material.emissive = new pc.Color(0.06, 0.03, 0.01);
        material.emissiveIntensity = 0.08;
        return;
      }

      material.diffuse = new pc.Color(0.2, 0.25, 0.14);
      material.emissive = new pc.Color(0.09, 0.05, 0.02);
      material.emissiveIntensity = 0.12;
      material.alphaTest = Math.max(material.alphaTest ?? 0, 0.32);
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
    }),
    hiddenMaterials: new Set()
  },
  shadow: {
    materials: createMaterialLibrary(template, (materialName, material) => {
      material.gloss = Math.min(material.gloss ?? 0.1, 0.1);

      if (materialName.includes("branches")) {
        material.diffuse = new pc.Color(0.12, 0.08, 0.04);
        material.emissive = new pc.Color(0.03, 0.015, 0.008);
        material.emissiveIntensity = 0.04;
        return;
      }

      material.diffuse = new pc.Color(0.1, 0.13, 0.08);
      material.emissive = new pc.Color(0.03, 0.02, 0.01);
      material.emissiveIntensity = 0.05;
      material.alphaTest = Math.max(material.alphaTest ?? 0, 0.32);
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
    }),
    hiddenMaterials: new Set()
  }
});

const createHeroTreeVariants = (template) => ({
  living: {
    materials: createMaterialLibrary(template, (materialName, material) => {
      material.gloss = Math.min(material.gloss ?? 0.14, 0.14);

      if (materialName.includes("trunk") || materialName.includes("branches")) {
        material.diffuse = materialName.includes("trunk")
          ? new pc.Color(0.26, 0.13, 0.07)
          : new pc.Color(0.22, 0.11, 0.06);
        material.emissive = new pc.Color(0.06, 0.025, 0.01);
        material.emissiveIntensity = 0.06;
        return;
      }

      material.diffuse = new pc.Color(0.36, 0.28, 0.14);
      material.emissive = new pc.Color(0.1, 0.05, 0.02);
      material.emissiveIntensity = 0.14;
      material.alphaTest = Math.max(material.alphaTest ?? 0, 0.38);
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
    }),
    hiddenMaterials: new Set()
  },
  shadow: {
    materials: createMaterialLibrary(template, (materialName, material) => {
      material.gloss = Math.min(material.gloss ?? 0.1, 0.1);

      if (materialName.includes("trunk") || materialName.includes("branches")) {
        material.diffuse = new pc.Color(0.12, 0.07, 0.04);
        material.emissive = new pc.Color(0.025, 0.012, 0.006);
        material.emissiveIntensity = 0.03;
        return;
      }

      material.diffuse = new pc.Color(0.12, 0.09, 0.05);
      material.emissive = new pc.Color(0.025, 0.014, 0.008);
      material.emissiveIntensity = 0.04;
      material.alphaTest = Math.max(material.alphaTest ?? 0, 0.38);
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
    }),
    hiddenMaterials: new Set()
  },
  dead: {
    materials: createMaterialLibrary(template, (materialName, material) => {
      material.gloss = Math.min(material.gloss ?? 0.08, 0.08);

      if (materialName.includes("trunk") || materialName.includes("branches")) {
        material.diffuse = new pc.Color(0.1, 0.06, 0.035);
        material.emissive = new pc.Color(0.015, 0.008, 0.004);
        material.emissiveIntensity = 0.02;
        return;
      }

      material.diffuse = new pc.Color(0.04, 0.03, 0.02);
      material.emissive = new pc.Color(0, 0, 0);
      material.emissiveIntensity = 0;
      material.alphaTest = 0.99;
      material.opacity = 0.01;
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
    }),
    hiddenMaterials: new Set(["tree_small_02_leaves"])
  }
});

const applyVariantToEntity = (entity, variant) => {
  for (const meshInstance of getMeshInstances(entity)) {
    const materialName = meshInstance.material?.name ?? "";

    if (variant.hiddenMaterials.has(materialName)) {
      meshInstance.visible = false;
      continue;
    }

    meshInstance.visible = true;

    const variantMaterial = variant.materials.get(materialName);

    if (variantMaterial) {
      meshInstance.material = variantMaterial;
    }
  }
};

const getVisibleBounds = (entity) => {
  let bounds = null;

  for (const meshInstance of getMeshInstances(entity)) {
    if (!meshInstance.visible) {
      continue;
    }

    if (!bounds) {
      bounds = meshInstance.aabb.clone();
      continue;
    }

    bounds.add(meshInstance.aabb);
  }

  return bounds;
};

const getBoundsBottom = (bounds) => bounds.center.y - bounds.halfExtents.y;

const placeTreeTemplate = (template, parent, placement, variant) => {
  const entity = template.clone();
  entity.name = placement.name;
  parent.addChild(entity);
  configureRenderHierarchy(
    entity,
    placement.castShadows ?? true,
    placement.receiveShadows ?? false
  );

  if (variant) {
    applyVariantToEntity(entity, variant);
  }

  const scaleX = placement.scaleX ?? placement.scale ?? 1;
  const scaleY = placement.scaleY ?? placement.scale ?? 1;
  const scaleZ = placement.scaleZ ?? placement.scale ?? 1;
  const slopeNormal = sampleTerrainNormal(placement.x, placement.z);
  const alignToSlope = placement.alignToSlope ?? true;
  const tiltStrength = placement.tiltStrength ?? 1.35;
  const tiltX = (placement.tiltX ?? 0) + (alignToSlope ? slopeNormal.z * tiltStrength : 0);
  const tiltZ = (placement.tiltZ ?? 0) - (alignToSlope ? slopeNormal.x * tiltStrength : 0);
  const terrainHeight = sampleTerrainHeight(placement.x, placement.z) + (placement.y ?? 0);

  entity.setLocalScale(scaleX, scaleY, scaleZ);
  entity.setLocalEulerAngles(tiltX, placement.rotationY ?? 0, tiltZ);
  entity.setLocalPosition(placement.x, terrainHeight, placement.z);
  entity.syncHierarchy();

  const bounds = getVisibleBounds(entity);

  if (bounds) {
    const desiredBottom = terrainHeight - (placement.groundSink ?? 0);
    const offsetY = desiredBottom - getBoundsBottom(bounds);
    entity.setLocalPosition(placement.x, terrainHeight + offsetY, placement.z);
    entity.syncHierarchy();
  }

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

const placeBulkPathTrees = (root, templates, variants, rng, helpers) => {
  let placed = 0;

  for (const path of FOREST_PATHS) {
    const dx = path.end.x - path.start.x;
    const dz = path.end.z - path.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const nx = -dz / length;
    const nz = dx / length;
    let distance = randomRange(rng, 10, 18);

    while (distance < length - 8) {
      const t = distance / length;
      const anchorX = path.start.x + dx * t;
      const anchorZ = path.start.z + dz * t;
      const sideOffset = path.width * 0.5 + randomRange(rng, 4.8, 8.4);

      for (const side of [-1, 1]) {
        if (rng() < 0.12) {
          continue;
        }

        const point = {
          x: anchorX + nx * side * sideOffset + randomRange(rng, -1.4, 1.4),
          z: anchorZ + nz * side * sideOffset + randomRange(rng, -1.4, 1.4)
        };

        if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 2, 1.6)) {
          continue;
        }

        if (!helpers.claim(point, 4.8)) {
          continue;
        }

        placeTreeTemplate(
          templates[Math.floor(rng() * templates.length)],
          root,
          {
            name: `bulk-path-tree-${placed + 1}`,
            x: point.x,
            z: point.z,
            scale: randomRange(rng, 4.4, 6.8),
            rotationY: randomRange(rng, 0, 360),
            tiltX: randomRange(rng, -1.2, 1.2),
            tiltZ: randomRange(rng, -1.2, 1.2),
            tiltStrength: 1.5,
            groundSink: 0.06
          },
          rng() < 0.32 ? variants.shadow : variants.sunlit
        );
        placed += 1;
      }

      distance += randomRange(rng, 11, 19);
    }
  }
};

const placeBulkGroveTrees = (root, templates, variants, rng, helpers) => {
  let placed = 0;

  for (const grove of FOREST_GROVES) {
    let created = 0;

    for (let attempts = 0; attempts < grove.target * 10 && created < grove.target; attempts += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * grove.radius;
      const point = {
        x: grove.center.x + Math.cos(angle) * radius,
        z: grove.center.z + Math.sin(angle) * radius
      };

      if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 5.5, 2.9)) {
        continue;
      }

      if (!helpers.claim(point, randomRange(rng, 4.8, 6.6))) {
        continue;
      }

      placeTreeTemplate(
        templates[Math.floor(rng() * templates.length)],
        root,
        {
          name: `bulk-grove-tree-${placed + 1}`,
          x: point.x,
          z: point.z,
          scale: randomRange(rng, 4.1, 7.1),
          rotationY: randomRange(rng, 0, 360),
          tiltX: randomRange(rng, -1.4, 1.4),
          tiltZ: randomRange(rng, -1.4, 1.4),
          tiltStrength: 1.45,
          groundSink: 0.06
        },
        rng() < 0.38 ? variants.shadow : variants.sunlit
      );

      created += 1;
      placed += 1;
    }
  }
};

const placePerimeterTrees = (root, templates, variants, rng, helpers) => {
  let placed = 0;

  for (let attempts = 0; attempts < 260; attempts += 1) {
    const axis = rng() < 0.5 ? "x" : "z";
    const sign = rng() < 0.5 ? -1 : 1;
    const point = {
      x:
        axis === "x"
          ? sign * randomRange(rng, FOREST_HALF_EXTENT - 44, FOREST_HALF_EXTENT - 12)
          : randomRange(rng, -FOREST_HALF_EXTENT + 16, FOREST_HALF_EXTENT - 16),
      z:
        axis === "z"
          ? sign * randomRange(rng, FOREST_HALF_EXTENT - 44, FOREST_HALF_EXTENT - 12)
          : randomRange(rng, -FOREST_HALF_EXTENT + 16, FOREST_HALF_EXTENT - 16)
    };

    if (!helpers.isInsideMap(point) || helpers.isNearClearing(point, 8, 3.8)) {
      continue;
    }

    if (!helpers.claim(point, 5.8)) {
      continue;
    }

    placeTreeTemplate(
      templates[Math.floor(rng() * templates.length)],
      root,
      {
        name: `bulk-perimeter-tree-${placed + 1}`,
        x: point.x,
        z: point.z,
        scale: randomRange(rng, 5.2, 8.2),
        rotationY: randomRange(rng, 0, 360),
        tiltX: randomRange(rng, -1.1, 1.1),
        tiltZ: randomRange(rng, -1.1, 1.1),
        tiltStrength: 1.1,
        groundSink: 0.07
      },
      variants.shadow
    );

    placed += 1;

    if (placed >= 72) {
      break;
    }
  }
};

const placeHeroTrees = (root, template, variants) => {
  const heroPlacements = [
    {
      name: "hero-trailhead-broadleaf",
      ...offsetFromLandmark("Trailhead Lantern", -14.2, -14.8),
      scale: 1.46,
      rotationY: 34,
      variant: variants.living
    },
    {
      name: "hero-ash-camp-broadleaf",
      ...offsetFromLandmark("Ash Camp", 12.8, -10.6),
      scale: 1.54,
      rotationY: 118,
      variant: variants.shadow
    },
    {
      name: "hero-split-creek-broadleaf",
      ...offsetFromLandmark("Split Creek", -13.4, 8.4),
      scale: 1.42,
      rotationY: 206,
      variant: variants.living
    },
    {
      name: "hero-grave-path-broadleaf",
      ...offsetFromLandmark("Grave Path", 14.8, -8.2),
      scale: 1.48,
      rotationY: 148,
      variant: variants.shadow
    },
    {
      name: "hero-hanging-tree",
      ...getLandmarkPosition("Hanging Tree"),
      scale: 1.94,
      rotationY: 24,
      tiltZ: -1.8,
      variant: variants.dead
    },
    {
      name: "hero-black-water-tree-1",
      ...offsetFromLandmark("Black Water", -10.6, 8.2),
      scale: 1.6,
      rotationY: 212,
      variant: variants.dead
    },
    {
      name: "hero-black-water-tree-2",
      ...offsetFromLandmark("Black Water", 9.8, -11.6),
      scale: 1.48,
      rotationY: 82,
      variant: variants.dead
    },
    {
      name: "hero-witch-stones-broadleaf",
      ...offsetFromLandmark("Witch Stones", 14.2, -12.6),
      scale: 1.72,
      rotationY: 302,
      variant: variants.shadow
    },
    {
      name: "hero-hunter-blind-broadleaf",
      ...offsetFromLandmark("Hunter's Blind", -14.6, 12.2),
      scale: 1.52,
      rotationY: 262,
      variant: variants.living
    },
    {
      name: "hero-shack-broadleaf",
      ...offsetFromLandmark("Boarded Shack", 14.2, 10.6),
      scale: 1.62,
      rotationY: 152,
      variant: variants.shadow
    },
    {
      name: "hero-bridge-broadleaf",
      ...offsetFromLandmark("Collapsed Bridge", -16.2, 7.8),
      scale: 1.46,
      rotationY: 322,
      variant: variants.shadow
    },
    {
      name: "hero-tower-broadleaf",
      ...offsetFromLandmark("Radio Tower Base", 13.8, 15.8),
      scale: 1.7,
      rotationY: 74,
      variant: variants.shadow
    }
  ];

  for (const placement of heroPlacements) {
    placeTreeTemplate(
      template,
      root,
      {
        ...placement,
        alignToSlope: false,
        groundSink: 0.08,
        receiveShadows: false
      },
      placement.variant
    );
  }
};

export const addRealisticForestModels = async (app, parent) => {
  const [bulkTreeAsset, heroTreeAsset] = await Promise.all([
    loadContainerAsset(app, BULK_TREE_URL),
    loadContainerAsset(app, HERO_TREE_URL)
  ]);

  const bulkTemplates = extractRenderableTemplates(
    bulkTreeAsset.resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: false
    })
  );
  const heroTemplates = extractRenderableTemplates(
    heroTreeAsset.resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: false
    })
  );

  if (bulkTemplates.length === 0 || heroTemplates.length === 0) {
    throw new Error("Forest tree templates were empty after loading model assets.");
  }

  const bulkVariants = createBulkTreeVariants(bulkTemplates[0]);
  const heroVariants = createHeroTreeVariants(heroTemplates[0]);
  const forestRoot = new pc.Entity("realistic-forest-models");
  parent.addChild(forestRoot);

  const rng = createRng(24891);
  const helpers = createTreePlacementHelpers();

  placeBulkGroveTrees(forestRoot, bulkTemplates, bulkVariants, rng, helpers);
  placeBulkPathTrees(forestRoot, bulkTemplates, bulkVariants, rng, helpers);
  placePerimeterTrees(forestRoot, bulkTemplates, bulkVariants, rng, helpers);
  placeHeroTrees(forestRoot, heroTemplates[0], heroVariants);

  return forestRoot;
};
