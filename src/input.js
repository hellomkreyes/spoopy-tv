/**
 * Keyboard and touch input for the TV.
 *
 * Functions
 *   bindInput({ controller, swipeTarget })  returns an unbind function
 *
 * Keys: ArrowUp/ArrowDown change channel, 0-9 jump to a channel, Space pauses motion.
 * Touch: a vertical swipe on the screen changes channel.
 *
 * Gotchas
 *   - Ignored inside inputs, dialogs, and with Ctrl/Meta/Alt held. Space on a focused
 *     button or link still activates it (and Tab reaches the MOTION button).
 *   - Holding an arrow key is safe: the controller's flip queue caps flips at 3 a second.
 *   - The screen sets touch-action: pan-x pinch-zoom so a vertical swipe on it reaches us
 *     instead of scrolling the page.
 *   - TODO (PR 11): the Konami code counts swipes separately from flips.
 */
const BLOCKED = 'input, select, textarea, [contenteditable], dialog[open]';
const SWIPE_MIN_PX = 40;

export function bindInput({ controller, swipeTarget }) {
  function onKey(event) {
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target.closest?.(BLOCKED)) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      controller.flip(+1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      controller.flip(-1);
    } else if (/^[0-9]$/.test(event.key)) {
      controller.tuneDigit(Number(event.key));
    } else if (event.key === ' ' && !target.closest?.('button, a, summary')) {
      event.preventDefault();
      controller.togglePaused();
    }
  }

  let start = null;
  const onDown = (event) => {
    if (event.pointerType === 'mouse') return;
    start = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dy) >= SWIPE_MIN_PX && Math.abs(dy) > Math.abs(dx)) {
      controller.flip(dy < 0 ? +1 : -1);
    }
  };
  const onCancel = () => {
    start = null;
  };

  document.addEventListener('keydown', onKey);
  swipeTarget.addEventListener('pointerdown', onDown);
  swipeTarget.addEventListener('pointerup', onUp);
  swipeTarget.addEventListener('pointercancel', onCancel);
  return () => {
    document.removeEventListener('keydown', onKey);
    swipeTarget.removeEventListener('pointerdown', onDown);
    swipeTarget.removeEventListener('pointerup', onUp);
    swipeTarget.removeEventListener('pointercancel', onCancel);
  };
}
