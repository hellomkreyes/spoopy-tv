/**
 * Builds DOM without HTML strings, so copy is always text.
 *
 * Functions
 *   el(tag, props, ...children)   props: `class`, `on*` listeners, plain attributes
 *   svg(tag, attrs, ...children)  same idea for SVG elements (icons); attrs only
 *
 * Gotcha: the CSP blocks inline `style`; use classes.
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

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, value);
  node.append(...children);
  return node;
}
