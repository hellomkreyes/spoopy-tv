/**
 * The one canvas and the one requestAnimationFrame loop: the static burst between channels.
 *
 * Functions
 *   createFx({ layer, canvas })  returns { burst(ms), stop(), running }
 *     burst(ms)  shows the layer, cycles the pre-levelled noise frames, resolves when done
 *
 * Gotchas
 *   - 160x120 buffer scaled up with image-rendering: pixelated (set in CSS). The six
 *     frames are generated once at load; nothing random runs per frame.
 *   - The loop stops on a hidden tab. The burst still ends on a timer, because rAF
 *     doesn't run in the background.
 *   - The controller skips the burst under reduced motion and while paused.
 *   - TODO (PR 10): the Sky Watch starfield reuses this canvas (cap DPR at 2 there).
 */
import { NOISE_HEIGHT, NOISE_WIDTH, generateNoiseFrames } from './noise.js';

const FRAME_MS = 70;

function toImageData(grey) {
  const rgba = new Uint8ClampedArray(grey.length * 4);
  for (let i = 0; i < grey.length; i++) {
    rgba.set([grey[i], grey[i], grey[i], 255], i * 4);
  }
  return new ImageData(rgba, NOISE_WIDTH, NOISE_HEIGHT);
}

export function createFx({ layer, canvas }) {
  canvas.width = NOISE_WIDTH;
  canvas.height = NOISE_HEIGHT;
  const ctx = canvas.getContext('2d');
  const frames = generateNoiseFrames().map(toImageData);
  let raf = 0;
  let running = false;

  function draw(time) {
    ctx.putImageData(frames[Math.floor(time / FRAME_MS) % frames.length], 0, 0);
    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    ctx.putImageData(frames[0], 0, 0);
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    cancelAnimationFrame(raf);
    running = false;
    layer.classList.remove('is-on');
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) raf = requestAnimationFrame(draw);
  });

  return {
    burst(ms) {
      layer.classList.add('is-on');
      start();
      return new Promise((resolve) =>
        setTimeout(() => {
          stop();
          resolve();
        }, ms),
      );
    },
    stop,
    get running() {
      return running;
    },
  };
}
