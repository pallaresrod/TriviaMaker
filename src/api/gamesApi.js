// Talks to the local server (server/apiHandler.js), which saves games in trivias/.

const BASE_URL = '/api/games';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export function isAbortError(err) {
  return err?.name === 'AbortError';
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError("Can't reach the Trivia Maker server. Is `npm run dev` still running?");
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed (${response.status}).`, response.status);
  }
  return data;
}

const itemPath = (id) => `/${encodeURIComponent(id)}`;
const toPayload = ({ title, categories }) => ({ title, categories });

export function listGames({ signal } = {}) {
  return request('', { signal });
}

/** Returns null if the game doesn't exist. */
export async function getGame(id, { signal } = {}) {
  try {
    return await request(itemPath(id), { signal });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/** Saves a new game; the server picks its id (file name) from the title. */
export function createGame(game) {
  return request('', { method: 'POST', body: toPayload(game) });
}

export function updateGame(game) {
  return request(itemPath(game.id), { method: 'PUT', body: toPayload(game) });
}

export function deleteGame(id) {
  return request(itemPath(id), { method: 'DELETE' });
}
