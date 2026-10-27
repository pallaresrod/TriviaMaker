// Saves each game as its own JSON file in a folder: `<dir>/<id>.json`.
// The id is the file name, so files added by hand show up too.
// The folder is created the first time a game is saved.

import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isValidGame } from '../src/models/game.js';

export function isValidId(id) {
  return (
    typeof id === 'string' &&
    id.length > 0 && id.length <= 100 &&
    !id.startsWith('.') &&
    !/[/\\\0]/.test(id)
  );
}

export function slugify(title) {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'untitled-game';
}

const isMissing = (err) => err?.code === 'ENOENT';

export function createGamesStore(dir) {
  const fileFor = (id) => path.join(dir, `${id}.json`);

  async function exists(id) {
    try {
      await stat(fileFor(id));
      return true;
    } catch (err) {
      if (isMissing(err)) return false;
      throw err;
    }
  }

  /** Returns the game, null if the file doesn't exist, or throws if the file is broken. */
  async function read(id) {
    const file = fileFor(id);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
    const data = JSON.parse(raw);
    if (!isValidGame(data)) throw new Error('not a valid Trivia Maker game');
    const updatedAt = Number.isFinite(data.updatedAt) ? data.updatedAt : (await stat(file)).mtimeMs;
    return { id, title: data.title, categories: data.categories, updatedAt };
  }

  async function write(id, game) {
    await mkdir(dir, { recursive: true });
    const data = { title: game.title, categories: game.categories, updatedAt: Date.now() };
    // Write to a temp file first so a crash never leaves a half-written game.
    const tmp = `${fileFor(id)}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, fileFor(id));
    return { id, ...data };
  }

  async function uniqueId(base) {
    let id = base;
    for (let n = 2; await exists(id); n++) id = `${base}-${n}`;
    return id;
  }

  return {
    async list() {
      let names;
      try {
        names = await readdir(dir);
      } catch (err) {
        if (isMissing(err)) return []; // no folder yet → no games yet
        throw err;
      }
      const ids = names
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length))
        .filter(isValidId);

      const games = await Promise.all(ids.map(async (id) => {
        try {
          return await read(id);
        } catch (err) {
          console.warn(`[trivias] Skipping ${id}.json: ${err.message}`);
          return null;
        }
      }));
      return games.filter(Boolean);
    },

    async get(id) {
      try {
        return await read(id);
      } catch {
        return null;
      }
    },

    async create(game) {
      return write(await uniqueId(slugify(game.title)), game);
    },

    /** Saves over an existing game, or recreates it if its file was removed. */
    async update(id, game) {
      return write(id, game);
    },

    async remove(id) {
      try {
        await unlink(fileFor(id));
        return true;
      } catch (err) {
        if (isMissing(err)) return false;
        throw err;
      }
    },
  };
}
