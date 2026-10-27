import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankGame, toExportData } from '../src/models/game.js';
import { createGamesStore, isValidId, slugify } from './gamesStore.js';

let root;
let dir;
let store;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'trivia-test-'));
  dir = path.join(root, 'trivias'); // does not exist yet
  store = createGamesStore(dir);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function game(title) {
  return { ...createBlankGame(), title };
}

describe('gamesStore', () => {
  it('lists nothing when the folder does not exist', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('creates the folder and a file named after the title', async () => {
    const saved = await store.create(game('Movie Night!'));
    expect(saved.id).toBe('movie-night');
    expect(await readdir(dir)).toEqual(['movie-night.json']);

    const onDisk = JSON.parse(await readFile(path.join(dir, 'movie-night.json'), 'utf8'));
    expect(onDisk.title).toBe('Movie Night!');
    expect(onDisk.id).toBeUndefined(); // the id is the file name
  });

  it('never overwrites another game with the same title', async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await store.create(game('Quiz'))).id);
    expect(ids).toEqual(['quiz', 'quiz-2', 'quiz-3']);
  });

  it('updates in place and keeps the file name when the title changes', async () => {
    const { id } = await store.create(game('Original'));
    await store.update(id, game('Renamed'));
    expect(await readdir(dir)).toEqual(['original.json']);
    expect((await store.get(id)).title).toBe('Renamed');
  });

  it('deletes files', async () => {
    const { id } = await store.create(game('Gone'));
    expect(await store.remove(id)).toBe(true);
    expect(await store.get(id)).toBeNull();
    expect(await store.remove(id)).toBe(false);
  });

  it('loads files added by hand (e.g. an exported game) and skips broken ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mkdir(dir);
    await writeFile(path.join(dir, 'From a friend.json'), JSON.stringify(toExportData(game('Shared'))));
    await writeFile(path.join(dir, 'broken.json'), '{ not json');
    await writeFile(path.join(dir, 'notes.txt'), 'ignore me');

    const games = await store.list();
    expect(games.map((g) => g.id)).toEqual(['From a friend']);
    expect(games[0].updatedAt).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe('ids', () => {
  it('slugifies titles', () => {
    expect(slugify('Café Trivia: Round 2')).toBe('cafe-trivia-round-2');
    expect(slugify('   ')).toBe('untitled-game');
  });

  it('rejects ids that could escape the folder', () => {
    expect(isValidId('movie-night')).toBe(true);
    expect(isValidId('../secret')).toBe(false);
    expect(isValidId('a/b')).toBe(false);
    expect(isValidId('a\\b')).toBe(false);
    expect(isValidId('.hidden')).toBe(false);
    expect(isValidId('')).toBe(false);
  });
});
