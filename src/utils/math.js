export const clamp01 = (value) => Math.min(1, Math.max(0, value));

export const remap = (value, inMin, inMax, outMin = 0, outMax = 1) => {
  if (inMax === inMin) return outMin;
  const t = clamp01((value - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * t;
};

export const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export const smootherstep = (value) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const damp = (current, target, lambda, delta) =>
  current + (target - current) * (1 - Math.exp(-lambda * delta));

export const bell = (value, center, width) => {
  const distance = Math.abs(value - center);
  return smoothstep(1 - distance / width);
};
