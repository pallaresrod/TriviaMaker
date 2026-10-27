export const CATEGORY_COUNT = 6;
export const POINTS = [50, 100, 150, 200];
export const TILE_COUNT = CATEGORY_COUNT * POINTS.length;

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

export const LIMITS = {
  title: 80,
  categoryName: 40,
  playerName: 20,
};

// Games are saved as files in trivias/ (see server/). The browser only keeps
// the game in progress.
export const STORAGE_KEYS = {
  session: 'triviaMaker.session',
  legacyGames: 'triviaMaker.games', // old browser-only saves, migrated on load
};
