import { interpolate } from 'remotion';

// Opacity that fades in over the first `len` frames and out over the last `len`.
export const fade = (frame, total, len = 10) =>
  interpolate(frame, [0, len, total - len, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
