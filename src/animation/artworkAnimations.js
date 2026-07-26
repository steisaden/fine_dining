import { clamp01, smoothstep, smootherstep } from "../utils/math.js";

const localProgress = (progress, start, end) =>
  clamp01((progress - start) / Math.max(0.0001, end - start));

export const getArtworkState = (item, progress) => {
  const raw = localProgress(progress, item.start, item.end);
  const t = smootherstep(raw);
  const active = smoothstep(clamp01((progress - item.start + 0.025) / 0.07));
  const state = {
    t,
    active,
    opacity: Math.min(1, t * 1.35),
    scale: 0.985 + t * 0.015,
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    glow: 0.08 + active * 0.72,
    shutter: 1 - t,
    fragment: 1 - t
  };

  switch (item.animation) {
    case "wallRise":
      state.y = (1 - t) * -1.05;
      state.rotationX = (1 - t) * -0.035;
      break;
    case "sideReveal":
      state.x = (1 - t) * -0.72;
      state.rotationY = (1 - t) * 0.08;
      break;
    case "proximityGlow":
      state.opacity = 0.38 + active * 0.62;
      state.glow = 0.12 + active * 1.05;
      break;
    case "hingeSettle":
      state.rotationY = (1 - t) * 0.19;
      state.x = (1 - t) * -0.16;
      break;
    case "apertureReveal":
      state.opacity = 0.72 + t * 0.28;
      state.glow = 0.2 + t * 0.55;
      break;
    case "fragmentedAssemble":
      state.opacity = 0.52 + t * 0.48;
      state.glow = 0.16 + t * 0.6;
      break;
    case "depthResolve":
      state.z = (1 - t) * -1.5;
      state.scale = 0.955 + t * 0.045;
      state.opacity = 0.62 + t * 0.38;
      state.glow = 0.12 + t * 0.82;
      break;
    default:
      break;
  }

  return state;
};
