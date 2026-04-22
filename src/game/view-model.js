import * as pc from "playcanvas";

const REMOTE_GUN_MODEL_URL = "https://crudblobs.blob.core.windows.net/models/m1911-handgun.glb";
const REMOTE_GUN_MODEL_FILENAME = "m1911-handgun.glb";

const applyMaterial = (entity, material) => {
  if (!entity.render) {
    return;
  }

  for (const meshInstance of entity.render.meshInstances) {
    meshInstance.material = material;
  }
};

const getRenderComponents = (entity) => {
  const renders = entity.findComponents("render");

  if (entity.render && !renders.includes(entity.render)) {
    renders.unshift(entity.render);
  }

  return renders;
};

const configureRenderHierarchy = (entity, castShadows = false, receiveShadows = false) => {
  for (const render of getRenderComponents(entity)) {
    render.castShadows = castShadows;
    render.receiveShadows = receiveShadows;
  }
};

const createMaterial = (color, options = {}) => {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.metalness = options.metalness ?? 0.08;
  material.gloss = options.gloss ?? 0.3;
  material.emissive = options.emissive ?? new pc.Color(0, 0, 0);
  material.emissiveIntensity = options.emissiveIntensity ?? 1;
  material.update();
  return material;
};

const createPrimitive = (
  parent,
  {
    name,
    type,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    material
  }
) => {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    type,
    castShadows: false,
    receiveShadows: false
  });
  parent.addChild(entity);
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  applyMaterial(entity, material);
  return entity;
};

const loadContainerAsset = (app, url, filename) =>
  new Promise((resolve, reject) => {
    app.assets.loadFromUrlAndFilename(url, filename, "container", (err, asset) => {
      if (err) {
        reject(new Error(`Failed to load ${filename}: ${err}`));
        return;
      }

      resolve(asset);
    });
  });

const computeCombinedAabb = (entity) => {
  let combined = null;

  for (const render of getRenderComponents(entity)) {
    for (const meshInstance of render.meshInstances) {
      if (!combined) {
        combined = meshInstance.aabb.clone();
      } else {
        combined.add(meshInstance.aabb);
      }
    }
  }

  return combined;
};

const fitModelToMount = (mount, entity) => {
  const bounds = computeCombinedAabb(entity);

  if (!bounds) {
    return;
  }

  const size = bounds.halfExtents.clone().mulScalar(2);
  const axisLengths = [size.x, size.y, size.z];
  const dominantAxis = axisLengths.indexOf(Math.max(...axisLengths));
  let mountRotation = [0, 180, 0];

  if (dominantAxis === 0) {
    mountRotation = [0, 90, 0];
  } else if (dominantAxis === 1) {
    mountRotation = [-90, 0, 0];
  }

  mount.setLocalEulerAngles(mountRotation[0], mountRotation[1], mountRotation[2]);

  const targetLength = 0.62;
  const scale = targetLength / Math.max(axisLengths[dominantAxis], 0.0001);
  const localCenter = bounds.center.clone().sub(mount.getPosition());
  entity.setLocalScale(scale, scale, scale);
  entity.setLocalPosition(
    -localCenter.x * scale,
    -localCenter.y * scale - size.y * scale * 0.2,
    -localCenter.z * scale + targetLength * 0.08
  );
};

const createFallbackGun = (parent, materials) => {
  const fallback = new pc.Entity("fallback-gun");
  parent.addChild(fallback);

  createPrimitive(fallback, {
    name: "slide",
    type: "box",
    position: [0, 0.12, -0.12],
    scale: [0.16, 0.11, 0.62],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "frame",
    type: "box",
    position: [0, 0.03, -0.03],
    scale: [0.17, 0.09, 0.47],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "barrel",
    type: "box",
    position: [0, 0.11, -0.41],
    scale: [0.055, 0.055, 0.19],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "bushing",
    type: "cylinder",
    position: [0, 0.11, -0.5],
    rotation: [90, 0, 0],
    scale: [0.03, 0.025, 0.03],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "rear-sight",
    type: "box",
    position: [0, 0.185, 0.07],
    scale: [0.055, 0.025, 0.045],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "front-sight",
    type: "box",
    position: [0, 0.18, -0.31],
    scale: [0.022, 0.024, 0.03],
    material: materials.accent
  });

  createPrimitive(fallback, {
    name: "trigger-guard",
    type: "box",
    position: [0, -0.025, 0.06],
    rotation: [20, 0, 0],
    scale: [0.095, 0.08, 0.13],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "grip",
    type: "box",
    position: [0.01, -0.16, 0.14],
    rotation: [19, 0, 0],
    scale: [0.11, 0.3, 0.15],
    material: materials.gunGrip
  });

  createPrimitive(fallback, {
    name: "beavertail",
    type: "box",
    position: [0, 0.1, 0.22],
    rotation: [18, 0, 0],
    scale: [0.08, 0.05, 0.08],
    material: materials.gunMetal
  });

  createPrimitive(fallback, {
    name: "mag-plate",
    type: "box",
    position: [0, -0.325, 0.18],
    scale: [0.12, 0.02, 0.08],
    material: materials.gunMetal
  });

  return fallback;
};

const tintLoadedModel = (entity) => {
  for (const render of getRenderComponents(entity)) {
    for (const meshInstance of render.meshInstances) {
      const material = meshInstance.material?.clone?.() ?? meshInstance.material;

      if (!material) {
        continue;
      }

      material.useFog = false;
      material.gloss = Math.max(material.gloss ?? 0.12, 0.14);
      material.metalness = Math.max(material.metalness ?? 0, 0.18);
      material.update();
      meshInstance.material = material;
    }
  }
};

const createHandSetup = (root, materials) => {
  const rightArm = new pc.Entity("right-arm");
  rightArm.setLocalPosition(0.14, -0.09, 0.08);
  rightArm.setLocalEulerAngles(16, -4, -2);
  root.addChild(rightArm);

  createPrimitive(rightArm, {
    name: "right-forearm",
    type: "box",
    position: [-0.2, -0.06, 0.16],
    rotation: [2, 0, -12],
    scale: [0.34, 0.13, 0.19],
    material: materials.sleeve
  });

  createPrimitive(rightArm, {
    name: "right-wrist",
    type: "box",
    position: [-0.02, -0.03, 0.09],
    rotation: [4, 0, -8],
    scale: [0.12, 0.11, 0.12],
    material: materials.glove
  });

  createPrimitive(rightArm, {
    name: "right-palm",
    type: "box",
    position: [0.11, 0.01, 0.03],
    rotation: [10, 0, -7],
    scale: [0.16, 0.15, 0.1],
    material: materials.glove
  });

  createPrimitive(rightArm, {
    name: "right-thumb",
    type: "box",
    position: [0.11, -0.025, 0.1],
    rotation: [9, 24, 30],
    scale: [0.055, 0.1, 0.045],
    material: materials.glove
  });

  createPrimitive(rightArm, {
    name: "trigger-finger",
    type: "box",
    position: [0.19, 0.045, -0.1],
    rotation: [5, 0, -10],
    scale: [0.14, 0.026, 0.036],
    material: materials.glove
  });

  const gripFingerOffsets = [
    { x: 0.17, y: 0.03, z: -0.01, rot: -11, length: 0.094 },
    { x: 0.17, y: 0.03, z: 0.025, rot: -8, length: 0.088 },
    { x: 0.165, y: 0.03, z: 0.055, rot: -5, length: 0.082 }
  ];

  for (const [index, finger] of gripFingerOffsets.entries()) {
    createPrimitive(rightArm, {
      name: `grip-finger-${index + 1}`,
      type: "box",
      position: [finger.x, finger.y, finger.z],
      rotation: [20, 0, finger.rot],
      scale: [finger.length, 0.036, 0.038],
      material: materials.glove
    });
  }

  const leftArm = new pc.Entity("left-arm");
  leftArm.setLocalPosition(-0.02, -0.1, -0.04);
  leftArm.setLocalEulerAngles(22, 18, 10);
  root.addChild(leftArm);

  createPrimitive(leftArm, {
    name: "left-forearm",
    type: "box",
    position: [-0.22, -0.05, 0.15],
    rotation: [0, 0, 14],
    scale: [0.34, 0.12, 0.18],
    material: materials.sleeve
  });

  createPrimitive(leftArm, {
    name: "left-palm",
    type: "box",
    position: [0.02, 0.01, 0.03],
    rotation: [8, 0, 12],
    scale: [0.15, 0.13, 0.095],
    material: materials.glove
  });

  const supportFingerOffsets = [
    { x: 0.12, y: 0.05, z: -0.05, rot: 22, length: 0.09 },
    { x: 0.125, y: 0.045, z: -0.015, rot: 18, length: 0.086 },
    { x: 0.13, y: 0.04, z: 0.02, rot: 14, length: 0.082 },
    { x: 0.13, y: 0.035, z: 0.055, rot: 10, length: 0.076 }
  ];

  for (const [index, finger] of supportFingerOffsets.entries()) {
    createPrimitive(leftArm, {
      name: `support-finger-${index + 1}`,
      type: "box",
      position: [finger.x, finger.y, finger.z],
      rotation: [18, 0, finger.rot],
      scale: [finger.length, 0.034, 0.034],
      material: materials.glove
    });
  }

  createPrimitive(leftArm, {
    name: "support-thumb",
    type: "box",
    position: [0.05, -0.01, 0.095],
    rotation: [6, -24, 20],
    scale: [0.07, 0.095, 0.04],
    material: materials.glove
  });
};

const loadRemoteGunModel = async (app, gunModelRoot, fallbackGun) => {
  const asset = await loadContainerAsset(app, REMOTE_GUN_MODEL_URL, REMOTE_GUN_MODEL_FILENAME);
  const fitRoot = new pc.Entity("loaded-gun-fit");
  gunModelRoot.addChild(fitRoot);

  const entity = asset.resource.instantiateRenderEntity({
    castShadows: false,
    receiveShadows: false
  });
  fitRoot.addChild(entity);
  configureRenderHierarchy(entity, false, false);
  tintLoadedModel(entity);
  fitModelToMount(fitRoot, entity);
  fallbackGun.enabled = false;

  return {
    failedCount: 0
  };
};

export const createViewModel = (app, camera) => {
  const materials = {
    sleeve: createMaterial(new pc.Color(0.08, 0.08, 0.09), {
      metalness: 0.04,
      gloss: 0.16
    }),
    glove: createMaterial(new pc.Color(0.16, 0.14, 0.12), {
      metalness: 0.02,
      gloss: 0.18
    }),
    gunMetal: createMaterial(new pc.Color(0.11, 0.11, 0.12), {
      metalness: 0.76,
      gloss: 0.54
    }),
    gunGrip: createMaterial(new pc.Color(0.18, 0.13, 0.1), {
      metalness: 0.04,
      gloss: 0.2
    }),
    accent: createMaterial(new pc.Color(0.66, 0.22, 0.12), {
      metalness: 0.22,
      gloss: 0.44,
      emissive: new pc.Color(0.18, 0.05, 0.02),
      emissiveIntensity: 0.4
    })
  };

  const root = new pc.Entity("view-model-root");
  root.setLocalPosition(0.16, -0.21, -0.31);
  root.setLocalEulerAngles(1.2, -1.2, -0.2);
  camera.addChild(root);

  const combatRoot = new pc.Entity("combat-root");
  combatRoot.setLocalPosition(0.01, -0.01, 0);
  combatRoot.setLocalEulerAngles(0, 0, 0);
  root.addChild(combatRoot);

  createHandSetup(combatRoot, materials);

  const gunRoot = new pc.Entity("gun-root");
  gunRoot.setLocalPosition(0.035, 0.015, -0.11);
  gunRoot.setLocalEulerAngles(2, 0, 0);
  combatRoot.addChild(gunRoot);

  const fallbackGun = createFallbackGun(gunRoot, materials);
  const gunModelRoot = new pc.Entity("gun-model-root");
  gunModelRoot.setLocalPosition(0, 0.01, -0.01);
  gunRoot.addChild(gunModelRoot);

  root.readyPromise = loadRemoteGunModel(app, gunModelRoot, fallbackGun).catch((error) => {
    console.warn(error);
    fallbackGun.enabled = true;
    return {
      failedCount: 1
    };
  });

  return root;
};
