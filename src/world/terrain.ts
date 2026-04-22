import * as pc from "playcanvas";

import { GAME_CONFIG } from "../app/config";
import { distanceToSegment2d, length2d, smoothstep } from "../core/math";

export interface PathNode {
  readonly x: number;
  readonly z: number;
  readonly width: number;
}

export class Terrain {
  readonly size = GAME_CONFIG.world.terrainSize;
  readonly halfSize = this.size * 0.5;
  readonly pathNodes: PathNode[] = [
    { x: -30, z: 24, width: 3.4 },
    { x: -20, z: 14, width: 3.2 },
    { x: -8, z: 6, width: 3.5 },
    { x: 5, z: -4, width: 3.7 },
    { x: 13, z: -12, width: 3.2 },
    { x: 24, z: -18, width: 2.9 }
  ];

  readonly entity: pc.Entity;

  constructor(app: pc.Application, root: pc.Entity, material: pc.Material) {
    this.entity = this.createTerrainEntity(app, material);
    root.addChild(this.entity);
  }

  heightAt(x: number, z: number): number {
    const broadWaves =
      Math.sin(x * 0.12) * 1.6 +
      Math.cos(z * 0.15) * 1.2 +
      Math.sin((x + z) * 0.08) * 1.7 +
      Math.cos((x - z) * 0.05) * 1.35;
    const fineWaves =
      Math.sin(x * 0.42) * 0.18 +
      Math.cos(z * 0.46) * 0.16 +
      Math.sin((x * 0.55) + (z * 0.31)) * 0.12;
    const distanceFromCenter = length2d(x * 0.78, z * 0.78);
    const centerLift = 0.7 * (1 - smoothstep(0, this.halfSize * 0.95, distanceFromCenter));
    const pathFlatten = this.pathBlend(x, z) * 0.95;
    const ruinFlatten = this.zoneFlatten(x, z, 6, -7, 7.2, 0.8);
    const spawnFlatten = this.zoneFlatten(x, z, -27.5, 21.5, 7.6, 0.6);

    return broadWaves * 0.42 + fineWaves + centerLift - pathFlatten - ruinFlatten - spawnFlatten;
  }

  normalAt(x: number, z: number): pc.Vec3 {
    const sample = 0.45;
    const left = this.heightAt(x - sample, z);
    const right = this.heightAt(x + sample, z);
    const back = this.heightAt(x, z - sample);
    const front = this.heightAt(x, z + sample);

    return new pc.Vec3(left - right, sample * 2, back - front).normalize();
  }

  private createTerrainEntity(app: pc.Application, material: pc.Material): pc.Entity {
    const resolution = GAME_CONFIG.world.terrainResolution;
    const geometry = new pc.Geometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let row = 0; row <= resolution; row += 1) {
      for (let column = 0; column <= resolution; column += 1) {
        const u = column / resolution;
        const v = row / resolution;
        const x = (u - 0.5) * this.size;
        const z = (v - 0.5) * this.size;
        const y = this.heightAt(x, z);
        const normal = this.normalAt(x, z);

        positions.push(x, y, z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u * 8, v * 8);
      }
    }

    for (let row = 0; row < resolution; row += 1) {
      for (let column = 0; column < resolution; column += 1) {
        const index = row * (resolution + 1) + column;
        const next = index + resolution + 1;

        indices.push(index, next, index + 1);
        indices.push(index + 1, next, next + 1);
      }
    }

    geometry.positions = positions;
    geometry.normals = normals;
    geometry.uvs = uvs;
    geometry.indices = indices;

    const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);
    const meshInstance = new pc.MeshInstance(mesh, material);
    meshInstance.castShadow = true;

    const entity = new pc.Entity("terrain");
    entity.addComponent("render", {
      meshInstances: [meshInstance],
      castShadows: true,
      receiveShadows: true
    });

    return entity;
  }

  private pathBlend(x: number, z: number): number {
    let distance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.pathNodes.length - 1; index += 1) {
      const current = this.pathNodes[index];
      const next = this.pathNodes[index + 1];
      const segmentDistance = distanceToSegment2d(x, z, current.x, current.z, next.x, next.z);

      if (segmentDistance < distance) {
        distance = segmentDistance;
      }
    }

    return smoothstep(3.9, 0, distance);
  }

  private zoneFlatten(
    x: number,
    z: number,
    centerX: number,
    centerZ: number,
    radius: number,
    amount: number
  ): number {
    const distance = Math.hypot(x - centerX, z - centerZ);
    return smoothstep(radius, 0, distance) * amount;
  }
}
