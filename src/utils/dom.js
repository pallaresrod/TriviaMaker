/**
 * Create an element. Text is always set with textContent, so user-written
 * content can never inject HTML.
 *
 *   el('button', { class: 'btn', text: 'Play', onclick: fn }, [child])
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key.startsWith('aria-') || key.startsWith('data-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children);
  return node;
}

/**
 * Render static markup (never user data) into `container` and return every
 * element marked with `data-ref="name"` as `refs.name`.
 */
export function renderTemplate(container, markup) {
  container.innerHTML = markup.trim();
  const refs = {};
  for (const node of container.querySelectorAll('[data-ref]')) {
    refs[node.dataset.ref] = node;
  }
  return refs;
}
