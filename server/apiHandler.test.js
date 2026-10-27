import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBlankGame } from '../src/models/game.js';
import { createApiHandler } from './apiHandler.js';
import { createGamesStore } from './gamesStore.js';

let root;
let server;
let baseUrl;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'trivia-api-'));
  const handler = createApiHandler(createGamesStore(path.join(root, 'trivias')));
  server = createServer((req, res) => handler(req, res, () => {
    res.statusCode = 404;
    res.end('not api');
  }));
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

const api = (pathname, init) => fetch(baseUrl + pathname, init);
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

describe('games API', () => {
  it('runs a full create → read → update → delete cycle', async () => {
    expect(await (await api('/api/games')).json()).toEqual([]);

    const created = await api('/api/games', json('POST', { ...createBlankGame(), title: 'Movie Night' }));
    expect(created.status).toBe(201);
    const { id } = await created.json();
    expect(id).toBe('movie-night');

    const updated = await api(`/api/games/${id}`, json('PUT', { ...createBlankGame(), title: 'Movie Night 2' }));
    expect((await updated.json()).title).toBe('Movie Night 2');

    const list = await (await api('/api/games')).json();
    expect(list.map((g) => g.title)).toEqual(['Movie Night 2']);

    expect((await api(`/api/games/${id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await api(`/api/games/${id}`)).status).toBe(404);
  });

  it('rejects invalid games and bad JSON', async () => {
    expect((await api('/api/games', json('POST', { title: 'x', categories: [] }))).status).toBe(400);
    expect((await api('/api/games', json('POST', '{nope'))).status).toBe(400);
  });

  it('rejects ids that try to leave the folder', async () => {
    expect((await api(`/api/games/${encodeURIComponent('../package')}`)).status).toBe(400);
  });

  it('passes non-API requests through', async () => {
    expect(await (await api('/index.html')).text()).toBe('not api');
  });
});
