import * as pc from "playcanvas";

export interface PrimitiveOptions {
  name: string;
  type: "box" | "plane" | "sphere" | "cylinder" | "capsule";
  parent: pc.Entity;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  material?: pc.Material;
  castShadows?: boolean;
  receiveShadows?: boolean;
}

export const setEntityMaterial = (entity: pc.Entity, material: pc.Material): void => {
  const render = entity.render;

  if (!render) {
    return;
  }

  for (const meshInstance of render.meshInstances) {
    meshInstance.material = material;
  }
};

export const createPrimitive = ({
  name,
  type,
  parent,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  material,
  castShadows = true,
  receiveShadows = true
}: PrimitiveOptions): pc.Entity => {
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

  if (material) {
    setEntityMaterial(entity, material);
  }

  return entity;
};

export const createPivot = (
  parent: pc.Entity,
  name: string,
  position: [number, number, number] = [0, 0, 0]
): pc.Entity => {
  const entity = new pc.Entity(name);
  parent.addChild(entity);
  entity.setLocalPosition(position[0], position[1], position[2]);
  return entity;
};
