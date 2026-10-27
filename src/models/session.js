// A game being played. All functions are pure: they return a new session
// instead of changing the one passed in.
//
// {
//   game,                       // snapshot of the game when it started
//   players: [{ name, score }],
//   pickerIndex,                // who picks the next question
//   usedTiles: ['ci-qi', ...],
//   currentTile: { ci, qi } | null,
// }

import { MAX_PLAYERS, MIN_PLAYERS, TILE_COUNT } from '../constants.js';
import { cloneGame, isValidGame } from './game.js';

export function tileKey(ci, qi) {
  return `${ci}-${qi}`;
}

export function createSession(game, playerNames, random = Math.random) {
  if (playerNames.length < MIN_PLAYERS || playerNames.length > MAX_PLAYERS) {
    throw new Error(`A game needs ${MIN_PLAYERS}–${MAX_PLAYERS} players.`);
  }
  return {
    game: cloneGame(game),
    players: playerNames.map((name) => ({ name, score: 0 })),
    pickerIndex: Math.floor(random() * playerNames.length),
    usedTiles: [],
    currentTile: null,
  };
}

export function isTileUsed(session, ci, qi) {
  return session.usedTiles.includes(tileKey(ci, qi));
}

export function getTile(session, { ci, qi }) {
  const category = session.game.categories[ci];
  return { category, question: category.questions[qi] };
}

export function selectTile(session, ci, qi) {
  if (isTileUsed(session, ci, qi)) throw new Error('That question was already played.');
  return { ...session, currentTile: { ci, qi } };
}

/** `winnerIndex` is the player who answered correctly, or null for nobody. */
export function resolveTile(session, winnerIndex) {
  if (!session.currentTile) throw new Error('No question is open.');
  const { ci, qi } = session.currentTile;
  const { points } = session.game.categories[ci].questions[qi];

  const players = session.players.map((player, i) =>
    i === winnerIndex ? { ...player, score: player.score + points } : player);

  return {
    ...session,
    players,
    // A correct answer passes the pick to the winner; nobody → same picker again.
    pickerIndex: winnerIndex ?? session.pickerIndex,
    usedTiles: [...session.usedTiles, tileKey(ci, qi)],
    currentTile: null,
  };
}

export function isFirstTurn(session) {
  return session.usedTiles.length === 0;
}

export function isFinished(session) {
  return session.usedTiles.length >= TILE_COUNT;
}

/** Players sorted by score. Tied players share a rank (1, 1, 3...). */
export function rankPlayers(players) {
  return players
    .map((player, index) => ({
      ...player,
      rank: 1 + players.filter((other) => other.score > player.score).length,
      index,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
}

export function getWinners(players) {
  return rankPlayers(players).filter((player) => player.rank === 1);
}

export function isValidSession(session) {
  if (!session || typeof session !== 'object' || !isValidGame(session.game)) return false;
  const { players, pickerIndex, usedTiles, currentTile } = session;
  return (
    Array.isArray(players) &&
    players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS &&
    players.every((p) => typeof p?.name === 'string' && Number.isFinite(p.score)) &&
    Number.isInteger(pickerIndex) && pickerIndex >= 0 && pickerIndex < players.length &&
    Array.isArray(usedTiles) &&
    (currentTile === null || (Number.isInteger(currentTile?.ci) && Number.isInteger(currentTile?.qi)))
  );
}
