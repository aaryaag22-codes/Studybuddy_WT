// Tiny helpers for building HTML safely. textContent is used for all user text,
// so a note titled <script> can never run code (this prevents XSS).
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// Static, trusted SVG strings only (never user data)
export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstChild;
}

// Dates are stored as UTC midnight, so show them in UTC to avoid "one day early" bugs
export function fmtDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(value));
}
export function fmtDateTime(value) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const dayKeyUTC = (value) => new Date(value).toISOString().slice(0, 10);

// The built-in replaceChildren() would print the word "null" for a missing child.
// This small wrapper ignores null/false so code like  cond ? element : null  just works.
const nativeReplaceChildren = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...nodes) {
  return nativeReplaceChildren.apply(this, nodes.flat().filter((n) => n !== null && n !== undefined && n !== false));
};
