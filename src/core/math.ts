export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

export const inverseLerp = (start: number, end: number, value: number): number => {
  if (start === end) {
    return 0;
  }

  return clamp((value - start) / (end - start), 0, 1);
};

export const smoothstep = (start: number, end: number, value: number): number => {
  const t = inverseLerp(start, end, value);
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (value: number): number =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

export const damp = (current: number, target: number, smoothing: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-smoothing * dt));

export const pingPong = (time: number, length: number): number => {
  const cycle = Math.floor(time / length);
  const progress = time - cycle * length;
  return cycle % 2 === 0 ? progress : length - progress;
};

export const fract = (value: number): number => value - Math.floor(value);

export const hashNoise = (seed: number): number =>
  fract(Math.sin(seed * 12.9898 + 78.233) * 43758.5453123);
