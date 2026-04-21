import * as pc from "playcanvas";

const applyMaterial = (entity, material) => {
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

export const createViewModel = (camera) => {
  const materials = {
    sleeve: createMaterial(new pc.Color(0.16, 0.17, 0.18), {
      metalness: 0.05,
      gloss: 0.16
    }),
    glove: createMaterial(new pc.Color(0.31, 0.26, 0.22), {
      metalness: 0.02,
      gloss: 0.24
    }),
    gunMetal: createMaterial(new pc.Color(0.17, 0.18, 0.19), {
      metalness: 0.58,
      gloss: 0.44
    }),
    gunGrip: createMaterial(new pc.Color(0.22, 0.19, 0.16), {
      metalness: 0.04,
      gloss: 0.18
    }),
    accent: createMaterial(new pc.Color(0.48, 0.09, 0.08), {
      metalness: 0.38,
      gloss: 0.5,
      emissive: new pc.Color(0.1, 0.02, 0.02),
      emissiveIntensity: 0.4
    })
  };

  const root = new pc.Entity("view-model-root");
  root.setLocalPosition(0.3, -0.28, -0.54);
  root.setLocalEulerAngles(3, -7, -1.2);
  camera.addChild(root);

  const handRoot = new pc.Entity("hand-root");
  handRoot.setLocalPosition(0.02, -0.05, 0.03);
  handRoot.setLocalEulerAngles(18, 6, -4);
  root.addChild(handRoot);

  createPrimitive(handRoot, {
    name: "forearm",
    type: "box",
    position: [-0.18, -0.06, 0.1],
    rotation: [2, 0, -12],
    scale: [0.3, 0.14, 0.18],
    material: materials.sleeve
  });

  createPrimitive(handRoot, {
    name: "wrist",
    type: "box",
    position: [-0.02, -0.03, 0.06],
    rotation: [4, 0, -8],
    scale: [0.12, 0.12, 0.13],
    material: materials.glove
  });

  createPrimitive(handRoot, {
    name: "palm",
    type: "box",
    position: [0.08, 0.01, 0.02],
    rotation: [8, 0, -6],
    scale: [0.16, 0.16, 0.1],
    material: materials.glove
  });

  createPrimitive(handRoot, {
    name: "thumb",
    type: "box",
    position: [0.12, -0.02, 0.09],
    rotation: [10, 26, 34],
    scale: [0.06, 0.11, 0.045],
    material: materials.glove
  });

  const fingerOffsets = [
    { x: 0.18, y: 0.03, z: -0.03, rot: -12, scale: 0.05 },
    { x: 0.19, y: 0.03, z: 0.0, rot: -8, scale: 0.048 },
    { x: 0.185, y: 0.03, z: 0.03, rot: -4, scale: 0.046 }
  ];

  for (const [index, finger] of fingerOffsets.entries()) {
    createPrimitive(handRoot, {
      name: `finger-${index + 1}`,
      type: "box",
      position: [finger.x, finger.y, finger.z],
      rotation: [16, 0, finger.rot],
      scale: [0.085, 0.04, finger.scale],
      material: materials.glove
    });
  }

  const gunRoot = new pc.Entity("gun-root");
  gunRoot.setLocalPosition(0.11, 0.02, -0.06);
  gunRoot.setLocalEulerAngles(4, 0, 0);
  root.addChild(gunRoot);

  createPrimitive(gunRoot, {
    name: "slide",
    type: "box",
    position: [0, 0.12, -0.08],
    scale: [0.16, 0.12, 0.54],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "frame",
    type: "box",
    position: [0, 0.03, -0.02],
    scale: [0.17, 0.1, 0.4],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "barrel",
    type: "box",
    position: [0, 0.1, -0.36],
    scale: [0.07, 0.07, 0.18],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "front-sight",
    type: "box",
    position: [0, 0.19, -0.29],
    scale: [0.025, 0.03, 0.03],
    material: materials.accent
  });

  createPrimitive(gunRoot, {
    name: "rear-sight",
    type: "box",
    position: [0, 0.19, 0.08],
    scale: [0.055, 0.03, 0.04],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "trigger-guard",
    type: "box",
    position: [0, -0.03, 0.04],
    rotation: [18, 0, 0],
    scale: [0.1, 0.09, 0.12],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "grip",
    type: "box",
    position: [0.01, -0.14, 0.1],
    rotation: [18, 0, 0],
    scale: [0.11, 0.28, 0.15],
    material: materials.gunGrip
  });

  createPrimitive(gunRoot, {
    name: "hammer-block",
    type: "box",
    position: [0, 0.14, 0.18],
    scale: [0.08, 0.07, 0.08],
    material: materials.gunMetal
  });

  createPrimitive(gunRoot, {
    name: "mag-plate",
    type: "box",
    position: [0, -0.3, 0.15],
    scale: [0.12, 0.03, 0.08],
    material: materials.gunMetal
  });

  createPrimitive(root, {
    name: "support-hand",
    type: "box",
    position: [0.08, -0.06, 0.02],
    rotation: [18, 12, 8],
    scale: [0.11, 0.09, 0.1],
    material: materials.glove
  });

  return root;
};
