// REST API for games, as a connect-style middleware (works inside Vite's server).
//
//   GET    /api/games        → list
//   GET    /api/games/:id    → one game
//   POST   /api/games        → create (server picks the id from the title)
//   PUT    /api/games/:id    → save
//   DELETE /api/games/:id    → delete

import { isValidGame } from '../src/models/game.js';
import { isValidId } from './gamesStore.js';

const MAX_BODY_BYTES = 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  res.statusCode = status;
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readGameBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Game is too large.');
    chunks.push(chunk);
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Body must be JSON.');
  }
  if (!isValidGame(data)) throw new HttpError(400, 'Not a valid Trivia Maker game.');
  return data;
}

export function createApiHandler(store) {
  return async function apiHandler(req, res, next) {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!pathname.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const [, resource, rawId, ...rest] = pathname.split('/').filter(Boolean);
      if (resource !== 'games' || rest.length > 0) throw new HttpError(404, 'Not found.');

      let id = null;
      if (rawId !== undefined) {
        try {
          id = decodeURIComponent(rawId);
        } catch {
          throw new HttpError(400, 'Invalid game id.');
        }
        if (!isValidId(id)) throw new HttpError(400, 'Invalid game id.');
      }

      const route = `${req.method} ${id === null ? 'collection' : 'item'}`;
      switch (route) {
        case 'GET collection':
          send(res, 200, await store.list());
          return;
        case 'POST collection':
          send(res, 201, await store.create(await readGameBody(req)));
          return;
        case 'GET item': {
          const game = await store.get(id);
          if (!game) throw new HttpError(404, 'Game not found.');
          send(res, 200, game);
          return;
        }
        case 'PUT item':
          send(res, 200, await store.update(id, await readGameBody(req)));
          return;
        case 'DELETE item':
          if (!(await store.remove(id))) throw new HttpError(404, 'Game not found.');
          send(res, 204);
          return;
        default:
          throw new HttpError(405, 'Method not allowed.');
      }
    } catch (err) {
      if (err instanceof HttpError) {
        send(res, err.status, { error: err.message });
      } else {
        console.error('[trivias]', err);
        send(res, 500, { error: 'Something went wrong saving or loading games.' });
      }
    }
  };
}
