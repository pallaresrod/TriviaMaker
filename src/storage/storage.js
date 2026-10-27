// Thin wrapper around localStorage that never throws on read.

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}
