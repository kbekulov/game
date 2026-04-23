import * as pc from "playcanvas";

import { clamp, lerp } from "../core/math";

export interface AabbObstacle {
  readonly min: pc.Vec3;
  readonly max: pc.Vec3;
}

export class CollisionWorld {
  readonly obstacles: AabbObstacle[] = [];

  addAabb(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void {
    this.obstacles.push({
      min: new pc.Vec3(minX, minY, minZ),
      max: new pc.Vec3(maxX, maxY, maxZ)
    });
  }

  resolveHorizontal(
    start: pc.Vec3,
    desired: pc.Vec3,
    radius: number,
    feetY: number,
    height: number
  ): pc.Vec3 {
    const result = start.clone();
    let blockedX = false;

    if (desired.x !== start.x) {
      const candidateX = desired.x;

      if (!this.collidesAt(candidateX, result.z, radius, feetY, height)) {
        result.x = candidateX;
      } else {
        blockedX = true;
        result.x = this.findAllowedX(start.x, candidateX, result.z, radius, feetY, height);
      }
    }

    if (desired.z !== start.z) {
      const candidateZ = desired.z;

      if (!this.collidesAt(result.x, candidateZ, radius, feetY, height)) {
        result.z = candidateZ;
      } else {
        result.z = this.findAllowedZ(result.x, start.z, candidateZ, radius, feetY, height);
      }
    }

    if (blockedX && this.collidesAt(result.x, result.z, radius, feetY, height)) {
      result.x = start.x;
    }

    return result;
  }

  isLineBlocked(
    start: pc.Vec3,
    end: pc.Vec3,
    terrainHeightAt?: (x: number, z: number) => number
  ): boolean {
    if (terrainHeightAt) {
      const terrainDistance = start.distance(end);
      const terrainSamples = Math.max(4, Math.ceil(terrainDistance / 1.3));

      for (let sample = 1; sample < terrainSamples; sample += 1) {
        const t = sample / terrainSamples;
        const x = lerp(start.x, end.x, t);
        const y = lerp(start.y, end.y, t);
        const z = lerp(start.z, end.z, t);

        if (y <= terrainHeightAt(x, z) + 0.18) {
          return true;
        }
      }
    }

    return this.obstacles.some((obstacle) => this.segmentIntersectsAabb(start, end, obstacle));
  }

  raycastWorld(
    origin: pc.Vec3,
    direction: pc.Vec3,
    maxDistance: number,
    terrainHeightAt?: (x: number, z: number, preferredY?: number) => number
  ): pc.Vec3 {
    let bestDistance = maxDistance;

    for (const obstacle of this.obstacles) {
      const hitDistance = this.intersectRayAabb(origin, direction, maxDistance, obstacle);

      if (hitDistance !== null && hitDistance < bestDistance) {
        bestDistance = hitDistance;
      }
    }

    if (terrainHeightAt) {
      const terrainStep = 0.35;

      for (let distance = terrainStep; distance <= bestDistance; distance += terrainStep) {
        const point = origin.clone().add(direction.clone().mulScalar(distance));

        if (point.y <= terrainHeightAt(point.x, point.z, point.y) + 0.05) {
          bestDistance = distance;
          break;
        }
      }
    }

    return origin.clone().add(direction.clone().mulScalar(bestDistance));
  }

  private collidesAt(
    x: number,
    z: number,
    radius: number,
    feetY: number,
    height: number
  ): boolean {
    return this.obstacles.some((obstacle) => {
      if (feetY >= obstacle.max.y || feetY + height <= obstacle.min.y) {
        return false;
      }

      return (
        x + radius > obstacle.min.x &&
        x - radius < obstacle.max.x &&
        z + radius > obstacle.min.z &&
        z - radius < obstacle.max.z
      );
    });
  }

  private findAllowedX(
    startX: number,
    targetX: number,
    z: number,
    radius: number,
    feetY: number,
    height: number
  ): number {
    let resolved = targetX;
    const movingPositive = targetX > startX;

    for (const obstacle of this.obstacles) {
      if (feetY >= obstacle.max.y || feetY + height <= obstacle.min.y) {
        continue;
      }

      if (z + radius <= obstacle.min.z || z - radius >= obstacle.max.z) {
        continue;
      }

      if (movingPositive && startX + radius <= obstacle.min.x && targetX + radius > obstacle.min.x) {
        resolved = Math.min(resolved, obstacle.min.x - radius - 0.001);
      }

      if (!movingPositive && startX - radius >= obstacle.max.x && targetX - radius < obstacle.max.x) {
        resolved = Math.max(resolved, obstacle.max.x + radius + 0.001);
      }
    }

    return resolved;
  }

  private findAllowedZ(
    x: number,
    startZ: number,
    targetZ: number,
    radius: number,
    feetY: number,
    height: number
  ): number {
    let resolved = targetZ;
    const movingPositive = targetZ > startZ;

    for (const obstacle of this.obstacles) {
      if (feetY >= obstacle.max.y || feetY + height <= obstacle.min.y) {
        continue;
      }

      if (x + radius <= obstacle.min.x || x - radius >= obstacle.max.x) {
        continue;
      }

      if (movingPositive && startZ + radius <= obstacle.min.z && targetZ + radius > obstacle.min.z) {
        resolved = Math.min(resolved, obstacle.min.z - radius - 0.001);
      }

      if (!movingPositive && startZ - radius >= obstacle.max.z && targetZ - radius < obstacle.max.z) {
        resolved = Math.max(resolved, obstacle.max.z + radius + 0.001);
      }
    }

    return resolved;
  }

  private segmentIntersectsAabb(start: pc.Vec3, end: pc.Vec3, obstacle: AabbObstacle): boolean {
    const direction = end.clone().sub(start);
    let tMin = 0;
    let tMax = 1;

    const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];

    for (const axis of axes) {
      const origin = start[axis];
      const delta = direction[axis];
      const min = obstacle.min[axis];
      const max = obstacle.max[axis];

      if (Math.abs(delta) < 1e-6) {
        if (origin < min || origin > max) {
          return false;
        }

        continue;
      }

      const invDelta = 1 / delta;
      let t1 = (min - origin) * invDelta;
      let t2 = (max - origin) * invDelta;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }

      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);

      if (tMin > tMax) {
        return false;
      }
    }

    return tMax >= 0 && tMin <= 1;
  }

  private intersectRayAabb(
    origin: pc.Vec3,
    direction: pc.Vec3,
    maxDistance: number,
    obstacle: AabbObstacle
  ): number | null {
    let tMin = 0;
    let tMax = maxDistance;

    const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];

    for (const axis of axes) {
      const dir = direction[axis];
      const start = origin[axis];
      const min = obstacle.min[axis];
      const max = obstacle.max[axis];

      if (Math.abs(dir) < 1e-6) {
        if (start < min || start > max) {
          return null;
        }

        continue;
      }

      const invDir = 1 / dir;
      let t1 = (min - start) * invDir;
      let t2 = (max - start) * invDir;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }

      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);

      if (tMin > tMax) {
        return null;
      }
    }

    return clamp(tMin, 0, maxDistance);
  }
}
