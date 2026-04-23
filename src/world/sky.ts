import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { createSkyTextureLibrary, TextureSet } from "../core/procedural-textures";

interface SkyLayer {
  readonly entity: pc.Entity;
  readonly material: pc.StandardMaterial;
}

interface CloudSheet {
  readonly entity: pc.Entity;
  readonly material: pc.StandardMaterial;
  readonly anchor: pc.Vec3;
  readonly driftSpeed: pc.Vec2;
  readonly driftAmplitude: pc.Vec2;
  readonly phase: number;
}

export class SkyDome {
  readonly root: pc.Entity;

  private readonly nearClouds: SkyLayer;
  private readonly farClouds: SkyLayer;
  private readonly cloudSheets: CloudSheet[] = [];
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
    this.createCloudSheets(textures.nearClouds, textures.farClouds);
  }

  update(dt: number, focus: pc.Vec3): void {
    this.time += dt;
    this.root.setPosition(
      focus.x,
      focus.y + GAME_CONFIG.sky.heightOffset,
      focus.z
    );
    this.farClouds.entity.setLocalEulerAngles(-8, this.time * GAME_CONFIG.sky.farCloudSpeed, 0);
    this.nearClouds.entity.setLocalEulerAngles(10, this.time * GAME_CONFIG.sky.nearCloudSpeed, 0);
    this.updateSphereOffsets();
    this.updateCloudSheets();
  }

  private addLayer(
    name: string,
    textureSet: TextureSet,
    radius: number,
    opacity: number,
    emissiveIntensity: number,
    transparent: boolean
  ): SkyLayer {
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
    return { entity, material };
  }

  private createCloudSheets(nearTexture: TextureSet, farTexture: TextureSet): void {
    this.cloudSheets.push(
      this.addCloudSheet(
        "cloud-sheet-a",
        nearTexture,
        new pc.Vec3(-16, GAME_CONFIG.sky.sheetBaseHeight + 3, 12),
        new pc.Vec3(78, 1, 54),
        0.8,
        new pc.Vec2(0.05, 0.03),
        new pc.Vec2(1.6, 1.15),
        0.35
      ),
      this.addCloudSheet(
        "cloud-sheet-b",
        farTexture,
        new pc.Vec3(24, GAME_CONFIG.sky.sheetBaseHeight + 10, -18),
        new pc.Vec3(92, 1, 66),
        0.62,
        new pc.Vec2(-0.035, 0.025),
        new pc.Vec2(1.2, 1),
        1.15
      ),
      this.addCloudSheet(
        "cloud-sheet-c",
        nearTexture,
        new pc.Vec3(8, GAME_CONFIG.sky.sheetBaseHeight + 18, 26),
        new pc.Vec3(64, 1, 42),
        0.5,
        new pc.Vec2(0.028, -0.022),
        new pc.Vec2(1.45, 1.1),
        2.05
      )
    );
  }

  private addCloudSheet(
    name: string,
    textureSet: TextureSet,
    anchor: pc.Vec3,
    scale: pc.Vec3,
    opacity: number,
    driftSpeed: pc.Vec2,
    driftAmplitude: pc.Vec2,
    phase: number
  ): CloudSheet {
    const material = new pc.StandardMaterial();
    material.useLighting = false;
    material.useFog = false;
    material.emissive.set(1, 1, 1);
    material.emissiveIntensity = 1.2;
    material.opacity = opacity;
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;

    if (textureSet.emissiveMap) {
      material.emissiveMap = textureSet.emissiveMap;
    }

    if (textureSet.opacityMap) {
      material.opacityMap = textureSet.opacityMap;
      material.opacityMapChannel = textureSet.opacityMapChannel ?? "a";
    }

    material.emissiveMapTiling = textureSet.emissiveMapTiling?.clone() ?? new pc.Vec2(1, 1);
    material.opacityMapTiling = textureSet.opacityMapTiling?.clone() ?? new pc.Vec2(1, 1);
    material.update();

    const entity = new pc.Entity(name);
    entity.addComponent("render", {
      type: "plane",
      castShadows: false,
      receiveShadows: false
    });
    entity.render!.material = material;
    entity.setLocalScale(scale);
    entity.setLocalEulerAngles(0, phase * 48, 0);
    this.root.addChild(entity);

    return {
      entity,
      material,
      anchor,
      driftSpeed,
      driftAmplitude,
      phase
    };
  }

  private updateSphereOffsets(): void {
    this.setLayerOffset(
      this.farClouds.material,
      this.time * GAME_CONFIG.sky.farCloudSpeed * 0.0028,
      0.02
    );
    this.setLayerOffset(
      this.nearClouds.material,
      this.time * GAME_CONFIG.sky.nearCloudSpeed * 0.0038,
      0.04
    );
  }

  private updateCloudSheets(): void {
    for (const sheet of this.cloudSheets) {
      const offsetX = Math.sin(this.time * sheet.driftSpeed.x + sheet.phase) *
        GAME_CONFIG.sky.sheetDriftAmount *
        sheet.driftAmplitude.x;
      const offsetZ = Math.cos(this.time * sheet.driftSpeed.y + sheet.phase) *
        GAME_CONFIG.sky.sheetDriftAmount *
        sheet.driftAmplitude.y;
      const offsetY = Math.sin(this.time * 0.08 + sheet.phase) * 1.4;

      sheet.entity.setLocalPosition(
        sheet.anchor.x + offsetX,
        sheet.anchor.y + offsetY,
        sheet.anchor.z + offsetZ
      );
      this.setLayerOffset(
        sheet.material,
        this.time * sheet.driftSpeed.x * 0.012,
        this.time * sheet.driftSpeed.y * 0.01
      );
    }
  }

  private setLayerOffset(material: pc.StandardMaterial, offsetX: number, offsetY: number): void {
    const wrappedX = offsetX - Math.floor(offsetX);
    const wrappedY = offsetY - Math.floor(offsetY);
    material.emissiveMapOffset.set(wrappedX, wrappedY);
    material.opacityMapOffset.set(wrappedX, wrappedY);
    material.update();
  }
}
