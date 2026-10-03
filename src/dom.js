/**
 * dom: a tiny element builder so views never build HTML strings.
 *
 * Functions
 *   el(tag, props, ...children)
 *
 * Use
 *   el('button', { type: 'button', class: 'tape', onclick: fn }, 'Play', icon)
 *   Props: `class` sets className, `on*` adds a listener, null/false props are skipped,
 *   `true` becomes an empty attribute. Children may be nodes, strings or arrays;
 *   null/false children are dropped.
 *
 * Gotchas
 *   - Strings become text nodes, so copy is never parsed as HTML.
 *   - The CSP blocks inline style attributes. Use classes, not `style` props.
 *   - No SVG support (createElement only); add createElementNS if a view needs it.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}
