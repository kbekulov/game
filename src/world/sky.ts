import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { createSkyTextureLibrary, TextureSet } from "../core/procedural-textures";

export class SkyDome {
  readonly root: pc.Entity;

  private readonly nearClouds: pc.Entity;
  private readonly farClouds: pc.Entity;
  private time = 0;

  constructor(app: pc.Application, parent: pc.Entity) {
    const textures = createSkyTextureLibrary(app.graphicsDevice);
    this.root = new pc.Entity("sky-dome");
    parent.addChild(this.root);

    this.addLayer(
      "atmosphere",
      textures.atmosphere,
      GAME_CONFIG.sky.domeRadius,
      1,
      1,
      false
    );
    this.farClouds = this.addLayer(
      "far-clouds",
      textures.farClouds,
      GAME_CONFIG.sky.domeRadius - 1.5,
      GAME_CONFIG.sky.farCloudOpacity,
      1.12,
      true
    );
    this.nearClouds = this.addLayer(
      "near-clouds",
      textures.nearClouds,
      GAME_CONFIG.sky.domeRadius - 3,
      GAME_CONFIG.sky.nearCloudOpacity,
      1.22,
      true
    );
  }

  update(dt: number, focus: pc.Vec3): void {
    this.time += dt;
    this.root.setPosition(
      focus.x,
      focus.y + GAME_CONFIG.sky.heightOffset,
      focus.z
    );
    this.farClouds.setLocalEulerAngles(
      -8,
      this.time * GAME_CONFIG.sky.farCloudSpeed,
      0
    );
    this.nearClouds.setLocalEulerAngles(
      10,
      this.time * GAME_CONFIG.sky.nearCloudSpeed,
      0
    );
  }

  private addLayer(
    name: string,
    textureSet: TextureSet,
    radius: number,
    opacity: number,
    emissiveIntensity: number,
    transparent: boolean
  ): pc.Entity {
    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.useFog = false;
    material.diffuse.set(transparent ? 1 : 0, transparent ? 1 : 0, transparent ? 1 : 0);
    material.emissive.set(1, 1, 1);
    material.emissiveIntensity = emissiveIntensity;
    material.opacity = opacity;
    material.blendType = transparent ? pc.BLEND_NORMAL : pc.BLEND_NONE;
    material.depthWrite = !transparent;
    material.cull = pc.CULLFACE_FRONT;

    if (textureSet.emissiveMap) {
      material.emissiveMap = textureSet.emissiveMap;
    }

    if (textureSet.opacityMap) {
      material.opacityMap = textureSet.opacityMap;
      material.opacityMapChannel = textureSet.opacityMapChannel ?? "a";
    }

    if (textureSet.emissiveMapTiling) {
      material.emissiveMapTiling = textureSet.emissiveMapTiling.clone();
    }

    if (textureSet.opacityMapTiling) {
      material.opacityMapTiling = textureSet.opacityMapTiling.clone();
    }

    material.update();

    const entity = new pc.Entity(name);
    entity.addComponent("render", {
      type: "sphere",
      castShadows: false,
      receiveShadows: false
    });
    entity.render!.material = material;
    entity.setLocalScale(radius, radius, radius);
    this.root.addChild(entity);
    return entity;
  }
}
