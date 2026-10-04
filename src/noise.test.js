import { describe, expect, it } from 'vitest';
import {
  NOISE_FRAMES,
  NOISE_MEAN,
  frameMean,
  generateNoiseFrames,
} from './noise.js';

describe('static frames', () => {
  it('are levelled (each within 8% of the average), distinct, and the same every run', () => {
    const frames = generateNoiseFrames();
    const means = frames.map(frameMean);
    const overall = means.reduce((a, b) => a + b) / means.length;
    expect(frames).toHaveLength(NOISE_FRAMES);
    for (const m of means) {
      expect(Math.abs(m - overall) / overall).toBeLessThan(0.08);
    }
    expect(overall).toBeCloseTo(NOISE_MEAN, 0);
    expect(frames[0]).not.toEqual(frames[1]);
    expect(generateNoiseFrames()[0]).toEqual(frames[0]);
  });
});
