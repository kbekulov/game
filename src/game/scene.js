import * as pc from "playcanvas";

import { COVER_LAYOUT, PLAYER_START } from "./config.js";

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

const createPrimitive = (app, name, type, position, scale, material) => {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    type,
    castShadows: true,
    receiveShadows: true
  });
  entity.setPosition(position[0], position[1], position[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  applyMaterial(entity, material);
  app.root.addChild(entity);
  return entity;
};

export const buildScene = (app) => {
  app.scene.ambientLight = new pc.Color(0.22, 0.24, 0.3);

  const materials = {
    floor: createMaterial(new pc.Color(0.14, 0.18, 0.22), {
      metalness: 0.08,
      gloss: 0.22
    }),
    wall: createMaterial(new pc.Color(0.17, 0.21, 0.27), {
      metalness: 0.12,
      gloss: 0.28
    }),
    cover: createMaterial(new pc.Color(0.29, 0.31, 0.34), {
      metalness: 0.15,
      gloss: 0.32
    }),
    accent: createMaterial(new pc.Color(0.34, 0.44, 0.5), {
      emissive: new pc.Color(0.06, 0.18, 0.23),
      emissiveIntensity: 1.6,
      gloss: 0.5
    }),
    targetShell: createMaterial(new pc.Color(0.92, 0.66, 0.24), {
      emissive: new pc.Color(0.15, 0.08, 0.01),
      emissiveIntensity: 2.4,
      gloss: 0.6
    }),
    targetCore: createMaterial(new pc.Color(0.56, 0.96, 1), {
      emissive: new pc.Color(0.2, 0.9, 1),
      emissiveIntensity: 4,
      gloss: 0.8
    })
  };

  const playerRig = new pc.Entity("player-rig");
  playerRig.setPosition(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);

  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.03, 0.05, 0.08),
    farClip: 220,
    fov: 75
  });
  playerRig.addChild(camera);
  app.root.addChild(playerRig);

  const keyLight = new pc.Entity("key-light");
  keyLight.addComponent("light", {
    type: "directional",
    color: new pc.Color(1, 0.94, 0.82),
    intensity: 2.6,
    castShadows: true
  });
  keyLight.setEulerAngles(46, 32, 0);
  app.root.addChild(keyLight);

  const fillLight = new pc.Entity("fill-light");
  fillLight.addComponent("light", {
    type: "omni",
    color: new pc.Color(0.36, 0.6, 0.78),
    intensity: 0.5,
    range: 40
  });
  fillLight.setPosition(0, 12, -4);
  app.root.addChild(fillLight);

  createPrimitive(app, "floor", "box", [0, -0.5, -2], [46, 1, 46], materials.floor);
  createPrimitive(app, "north-wall", "box", [0, 4, -25], [50, 8, 2], materials.wall);
  createPrimitive(app, "south-wall", "box", [0, 4, 21], [50, 8, 2], materials.wall);
  createPrimitive(app, "west-wall", "box", [-25, 4, -2], [2, 8, 46], materials.wall);
  createPrimitive(app, "east-wall", "box", [25, 4, -2], [2, 8, 46], materials.wall);

  createPrimitive(app, "back-platform", "box", [0, 0.75, -18], [12, 1.5, 4], materials.accent);
  createPrimitive(app, "center-runway", "box", [0, 0.05, -2], [8, 0.1, 36], materials.accent);

  for (const [index, block] of COVER_LAYOUT.entries()) {
    createPrimitive(
      app,
      `cover-${index + 1}`,
      "box",
      block.position,
      block.scale,
      materials.cover
    );
  }

  createPrimitive(app, "left-pillar", "box", [-18, 5, -18], [2.4, 10, 2.4], materials.accent);
  createPrimitive(app, "right-pillar", "box", [18, 5, -18], [2.4, 10, 2.4], materials.accent);

  return {
    playerRig,
    camera,
    materials
  };
};
