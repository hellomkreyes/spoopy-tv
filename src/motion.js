/**
 * Motion preferences and the global pause. The only module that imports GSAP.
 *
 * Functions
 *   gsap                       re-exported; import it from here, never from 'gsap'
 *   isPaused(), isReduced()    current preferences
 *   setPaused(bool)            global pause: gsap.globalTimeline, plus .is-paused on <html>
 *   togglePaused()
 *   onMotionChange(fn)         fn({ paused, reduced }); returns an unsubscribe function
 *
 * Gotcha: plugins (SplitText, DrawSVGPlugin) are registered here, once, when the first
 * channel needs them. Transition timing in the controller uses setTimeout, not GSAP,
 * so pausing motion can never freeze a half-finished channel change.
 */
import { gsap } from 'gsap';

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();
let paused = false;
let reduced = reducedQuery.matches;

const emit = () => listeners.forEach((fn) => fn({ paused, reduced }));

reducedQuery.addEventListener('change', (event) => {
  reduced = event.matches;
  emit();
});

export { gsap };
export const isPaused = () => paused;
export const isReduced = () => reduced;

export function setPaused(next) {
  if (next === paused) return;
  paused = next;
  if (paused) gsap.globalTimeline.pause();
  else gsap.globalTimeline.resume();
  document.documentElement.classList.toggle('is-paused', paused);
  emit();
}

export const togglePaused = () => setPaused(!paused);

export function onMotionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
