export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const saturate = (value: number): number => clamp(value, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, value: number): number => {
  if (a === b) {
    return 0;
  }

  return saturate((value - a) / (b - a));
};

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = inverseLerp(edge0, edge1, value);
  return t * t * (3 - 2 * t);
};

export const damp = (current: number, target: number, smoothing: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-smoothing * dt));

export const approach = (
  current: number,
  target: number,
  delta: number
): number => {
  if (current < target) {
    return Math.min(current + delta, target);
  }

  return Math.max(current - delta, target);
};

export const remap = (
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  value: number
): number => lerp(outMin, outMax, inverseLerp(inMin, inMax, value));

export const randRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(randRange(min, max + 1));

export const length2d = (x: number, z: number): number => Math.hypot(x, z);

export const distanceToSegment2d = (
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number => {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const lengthSquared = abx * abx + abz * abz;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, pz - az);
  }

  const t = saturate((apx * abx + apz * abz) / lengthSquared);
  const closestX = ax + abx * t;
  const closestZ = az + abz * t;

  return Math.hypot(px - closestX, pz - closestZ);
};

export const trianglePulse = (
  value: number,
  start: number,
  peak: number,
  end: number
): number => {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value < peak) {
    return inverseLerp(start, peak, value);
  }

  return inverseLerp(end, peak, value);
};

export const easeInOutCubic = (value: number): number =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

export const degrees = (radians: number): number => radians * (180 / Math.PI);

export const radians = (degreesValue: number): number => degreesValue * (Math.PI / 180);
