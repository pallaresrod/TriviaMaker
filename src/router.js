// Small hash router: URLs look like `#/edit/abc123`.
// A page is a function `(container, params, { signal }) => cleanup?` that renders
// into `container`. `signal` is aborted when the user leaves the page, so pages
// can cancel requests and skip updates that arrive too late.

let root = null;
let routeTable = [];
let cleanup = null;
let controller = null;

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function matchRoute(path) {
  const parts = path.split('/').filter(Boolean);
  for (const route of routeTable) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== parts.length) continue;

    const params = {};
    const matches = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return part === parts[i];
    });
    if (matches) return { route, params };
  }
  return null;
}

function renderCurrent() {
  const match = matchRoute(currentPath());
  if (!match) {
    navigate('/', { replace: true });
    return;
  }
  controller?.abort();
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  controller = new AbortController();
  root.replaceChildren();
  window.scrollTo(0, 0);
  cleanup = match.route.page(root, match.params, { signal: controller.signal }) ?? null;
}

/** Build a path with an id safely encoded, e.g. pathTo('edit', 'movie-night'). */
export function pathTo(page, id) {
  return `/${page}/${encodeURIComponent(id)}`;
}

export function navigate(path, { replace = false } = {}) {
  const hash = `#${path}`;
  if (replace || location.hash === hash) {
    history.replaceState(null, '', hash);
    renderCurrent();
  } else {
    location.hash = path; // fires `hashchange`, which renders
  }
}

// Update the URL without re-rendering (e.g. after saving a new game).
export function setPathSilently(path) {
  history.replaceState(null, '', `#${path}`);
}

export function startRouter(container, routes) {
  root = container;
  routeTable = routes;
  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}
