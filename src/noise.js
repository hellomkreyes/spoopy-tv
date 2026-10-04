/**
 * Pre-generated static frames, levelled so every frame has the same average brightness.
 *
 * Functions
 *   generateNoiseFrames(options)  array of Uint8ClampedArray (one grey byte per pixel)
 *   frameMean(frame)              average brightness 0-255
 *
 * Gotcha: equal averages are what keep the static from flashing (WCAG 2.3.1), so
 * keep the contrast low enough that levelling never clamps. Seeded, so tests are stable.
 */
export const NOISE_WIDTH = 160;
export const NOISE_HEIGHT = 120;
export const NOISE_FRAMES = 6;
export const NOISE_MEAN = 120;
const CONTRAST = 0.4;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const frameMean = (frame) => {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i];
  return sum / frame.length;
};

export function generateNoiseFrames({
  count = NOISE_FRAMES,
  width = NOISE_WIDTH,
  height = NOISE_HEIGHT,
  mean = NOISE_MEAN,
  seed = 0x4b41494e,
} = {}) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const raw = new Float32Array(width * height);
    let total = 0;
    for (let i = 0; i < raw.length; i++) {
      raw[i] = rand() * 255;
      total += raw[i];
    }
    const rawMean = total / raw.length;
    const frame = new Uint8ClampedArray(raw.length);
    for (let i = 0; i < raw.length; i++) {
      frame[i] = Math.round((raw[i] - rawMean) * CONTRAST + mean);
    }
    return frame;
  });
}
