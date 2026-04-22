import * as pc from "playcanvas";

import type { SurfaceType } from "@/core/config.ts";

export interface ColliderOptions {
  name: string;
  surface: SurfaceType;
  blocksPlayer?: boolean;
  shootable?: boolean;
}

export interface Collider extends ColliderOptions {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface GroundHit {
  height: number;
  surface: SurfaceType;
}

export interface RayHit {
  point: pc.Vec3;
  normal: pc.Vec3;
  distance: number;
  surface: SurfaceType;
  collider: Collider;
}

export class CollisionWorld {
  private readonly colliders: Collider[] = [];

  addBox(
    center: pc.Vec3,
    size: pc.Vec3,
    { name, surface, blocksPlayer = true, shootable = true }: ColliderOptions
  ): Collider {
    const halfX = size.x * 0.5;
    const halfY = size.y * 0.5;
    const halfZ = size.z * 0.5;

    const collider: Collider = {
      name,
      surface,
      blocksPlayer,
      shootable,
      minX: center.x - halfX,
      minY: center.y - halfY,
      minZ: center.z - halfZ,
      maxX: center.x + halfX,
      maxY: center.y + halfY,
      maxZ: center.z + halfZ
    };

    this.colliders.push(collider);
    return collider;
  }

  canOccupy(x: number, feetY: number, z: number, radius: number, height: number): boolean {
    const minX = x - radius;
    const maxX = x + radius;
    const minY = feetY + 0.02;
    const maxY = feetY + height - 0.02;
    const minZ = z - radius;
    const maxZ = z + radius;

    for (const collider of this.colliders) {
      if (!collider.blocksPlayer) {
        continue;
      }

      if (
        maxX <= collider.minX ||
        minX >= collider.maxX ||
        maxY <= collider.minY ||
        minY >= collider.maxY ||
        maxZ <= collider.minZ ||
        minZ >= collider.maxZ
      ) {
        continue;
      }

      return false;
    }

    return true;
  }

  findGround(
    x: number,
    z: number,
    currentFeetY: number,
    radius: number,
    maxDrop: number
  ): GroundHit | null {
    let best: GroundHit | null = null;
    const minX = x - radius;
    const maxX = x + radius;
    const minZ = z - radius;
    const maxZ = z + radius;

    for (const collider of this.colliders) {
      if (!collider.blocksPlayer) {
        continue;
      }

      if (maxX <= collider.minX || minX >= collider.maxX || maxZ <= collider.minZ || minZ >= collider.maxZ) {
        continue;
      }

      const top = collider.maxY;

      if (top > currentFeetY + 0.001 || top < currentFeetY - maxDrop) {
        continue;
      }

      if (!best || top > best.height) {
        best = {
          height: top,
          surface: collider.surface
        };
      }
    }

    return best;
  }

  findStepUp(
    x: number,
    z: number,
    currentFeetY: number,
    radius: number,
    maxStepHeight: number
  ): number | null {
    const minX = x - radius;
    const maxX = x + radius;
    const minZ = z - radius;
    const maxZ = z + radius;
    let highest: number | null = null;

    for (const collider of this.colliders) {
      if (!collider.blocksPlayer) {
        continue;
      }

      if (maxX <= collider.minX || minX >= collider.maxX || maxZ <= collider.minZ || minZ >= collider.maxZ) {
        continue;
      }

      const top = collider.maxY;

      if (top < currentFeetY - 0.02 || top > currentFeetY + maxStepHeight) {
        continue;
      }

      if (highest === null || top > highest) {
        highest = top;
      }
    }

    return highest;
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number): RayHit | null {
    let best: RayHit | null = null;

    for (const collider of this.colliders) {
      if (!collider.shootable) {
        continue;
      }

      const result = this.intersectRayAabb(origin, direction, maxDistance, collider);

      if (!result) {
        continue;
      }

      if (!best || result.distance < best.distance) {
        best = result;
      }
    }

    return best;
  }

  private intersectRayAabb(
    origin: pc.Vec3,
    direction: pc.Vec3,
    maxDistance: number,
    collider: Collider
  ): RayHit | null {
    let tMin = 0;
    let tMax = maxDistance;
    let hitNormal = new pc.Vec3();

    const axes: Array<["x" | "y" | "z", number, number]> = [
      ["x", collider.minX, collider.maxX],
      ["y", collider.minY, collider.maxY],
      ["z", collider.minZ, collider.maxZ]
    ];

    for (const [axis, minBound, maxBound] of axes) {
      const originValue = origin[axis];
      const directionValue = direction[axis];

      if (Math.abs(directionValue) < 0.00001) {
        if (originValue < minBound || originValue > maxBound) {
          return null;
        }

        continue;
      }

      const inverse = 1 / directionValue;
      let t1 = (minBound - originValue) * inverse;
      let t2 = (maxBound - originValue) * inverse;
      let axisNormal = new pc.Vec3();

      if (t1 > t2) {
        const swap = t1;
        t1 = t2;
        t2 = swap;
      }

      if (axis === "x") {
        axisNormal.set(directionValue > 0 ? -1 : 1, 0, 0);
      } else if (axis === "y") {
        axisNormal.set(0, directionValue > 0 ? -1 : 1, 0);
      } else {
        axisNormal.set(0, 0, directionValue > 0 ? -1 : 1);
      }

      if (t1 > tMin) {
        tMin = t1;
        hitNormal = axisNormal;
      }

      tMax = Math.min(tMax, t2);

      if (tMin > tMax) {
        return null;
      }
    }

    if (tMin < 0 || tMin > maxDistance) {
      return null;
    }

    return {
      distance: tMin,
      normal: hitNormal,
      point: origin.clone().add(direction.clone().mulScalar(tMin)),
      surface: collider.surface,
      collider
    };
  }
}
