export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, alpha: number): number => a + (b - a) * alpha;

export const damp = (current: number, target: number, smoothing: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-smoothing * dt));

const wrapDegrees = (angle: number): number => {
  let wrapped = angle % 360;

  if (wrapped > 180) {
    wrapped -= 360;
  } else if (wrapped < -180) {
    wrapped += 360;
  }

  return wrapped;
};

export const dampAngle = (current: number, target: number, smoothing: number, dt: number): number => {
  const delta = wrapDegrees(target - current);
  return current + delta * (1 - Math.exp(-smoothing * dt));
};
