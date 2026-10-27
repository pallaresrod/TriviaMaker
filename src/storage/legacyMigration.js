// Earlier versions kept games in the browser (localStorage). Move any that are
// still there into the trivias/ folder, once.

import { STORAGE_KEYS } from '../constants.js';
import { isValidGame } from '../models/game.js';
import { createGame } from '../api/gamesApi.js';
import { readJson, removeKey, writeJson } from './storage.js';

/** Returns how many games were moved. */
export async function migrateBrowserGames() {
  const stored = readJson(STORAGE_KEYS.legacyGames, null);
  if (!Array.isArray(stored)) return 0;

  const games = stored.filter(isValidGame);
  for (let i = 0; i < games.length; i++) {
    await createGame(games[i]);
    // Drop each one as it's saved, so a failure halfway never creates duplicates on retry.
    writeJson(STORAGE_KEYS.legacyGames, games.slice(i + 1));
  }
  removeKey(STORAGE_KEYS.legacyGames);
  return games.length;
}
