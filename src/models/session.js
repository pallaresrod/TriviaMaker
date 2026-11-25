// A game being played. All functions are pure: they return a new session
// instead of changing the one passed in.
//
// {
//   game,                       // snapshot of the game when it started
//   players: [{ name, score }], // scores can go negative
//   pickerIndex,                // who picks the next question
//   usedTiles: ['ci-qi', ...],
//   currentTile: null | {
//     ci, qi,
//     questionShown,            // is the question text on the players' screen?
//     attempts: [{ playerIndex, correct, delta }],
//     status: 'open' | 'closed',
//     closedBy: null | 'correct' | 'allWrong' | 'nobody',
//     winnerIndex,              // who got it right (null if nobody)
//     pickerBefore,             // picker when the tile was chosen (for undo)
//   },
// }
//
// Question flow: selectTile → (showQuestion) → markWrong* → markCorrect | markNobody
// (or everyone misses) → closeTile.

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

function currentPoints(session) {
  return getTile(session, session.currentTile).question.points;
}

function requireOpen(session) {
  if (session.currentTile?.status !== 'open') throw new Error('No question is open.');
}

function withScore(players, playerIndex, delta) {
  return players.map((player, i) => (i === playerIndex ? { ...player, score: player.score + delta } : player));
}

/* ---------- Choosing and showing ---------- */

export function selectTile(session, ci, qi) {
  if (session.currentTile) throw new Error('Finish the open question first.');
  if (isTileUsed(session, ci, qi)) throw new Error('That question was already played.');
  return {
    ...session,
    currentTile: {
      ci,
      qi,
      questionShown: false,
      attempts: [],
      status: 'open',
      closedBy: null,
      winnerIndex: null,
      pickerBefore: session.pickerIndex,
    },
  };
}

export function showQuestion(session) {
  requireOpen(session);
  return { ...session, currentTile: { ...session.currentTile, questionShown: true } };
}

/* ---------- Answering ---------- */

export function hasAttempted(session, playerIndex) {
  return !!session.currentTile?.attempts.some((a) => a.playerIndex === playerIndex);
}

export function canAnswer(session, playerIndex) {
  return session.currentTile?.status === 'open' && !hasAttempted(session, playerIndex);
}

function requireCanAnswer(session, playerIndex) {
  requireOpen(session);
  if (!session.players[playerIndex]) throw new Error('Unknown player.');
  if (hasAttempted(session, playerIndex)) throw new Error('That player already answered this question.');
}

/** Wrong answer: lose the points. If everyone has now missed, the question closes. */
export function markWrong(session, playerIndex) {
  requireCanAnswer(session, playerIndex);
  const delta = -currentPoints(session);
  const attempts = [...session.currentTile.attempts, { playerIndex, correct: false, delta }];
  const everyoneMissed = attempts.length === session.players.length;
  return {
    ...session,
    players: withScore(session.players, playerIndex, delta),
    currentTile: {
      ...session.currentTile,
      attempts,
      status: everyoneMissed ? 'closed' : 'open',
      closedBy: everyoneMissed ? 'allWrong' : null,
    },
  };
}

/** Right answer: win the points and pick next. Closes the question. */
export function markCorrect(session, playerIndex) {
  requireCanAnswer(session, playerIndex);
  const delta = currentPoints(session);
  return {
    ...session,
    players: withScore(session.players, playerIndex, delta),
    pickerIndex: playerIndex,
    currentTile: {
      ...session.currentTile,
      attempts: [...session.currentTile.attempts, { playerIndex, correct: true, delta }],
      status: 'closed',
      closedBy: 'correct',
      winnerIndex: playerIndex,
    },
  };
}

/** Nobody gets it: no points change, same picker. Closes the question. */
export function markNobody(session) {
  requireOpen(session);
  return { ...session, currentTile: { ...session.currentTile, status: 'closed', closedBy: 'nobody' } };
}

/* ---------- Fixing mistakes ---------- */

export function canUndo(session) {
  const tile = session.currentTile;
  return !!tile && (tile.closedBy === 'nobody' || tile.attempts.length > 0);
}

/** Reverses the last Correct / Wrong / Nobody on the current question and reopens it. */
export function undoLastAttempt(session) {
  if (!canUndo(session)) throw new Error('Nothing to undo.');
  const tile = session.currentTile;
  const reopened = { ...tile, status: 'open', closedBy: null, winnerIndex: null };

  if (tile.closedBy === 'nobody') {
    return { ...session, currentTile: reopened };
  }

  const last = tile.attempts[tile.attempts.length - 1];
  return {
    ...session,
    players: withScore(session.players, last.playerIndex, -last.delta),
    pickerIndex: tile.pickerBefore,
    currentTile: { ...reopened, attempts: tile.attempts.slice(0, -1) },
  };
}

/* ---------- Finishing ---------- */

/** Back to the board: the tile is used up. */
export function closeTile(session) {
  if (session.currentTile?.status !== 'closed') throw new Error('The question is still open.');
  const { ci, qi } = session.currentTile;
  return {
    ...session,
    usedTiles: [...session.usedTiles, tileKey(ci, qi)],
    currentTile: null,
  };
}

export function isLastTile(session) {
  return session.usedTiles.length === TILE_COUNT - 1;
}

export function isFirstTurn(session) {
  return session.usedTiles.length === 0 && !session.currentTile;
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

/* ---------- Validation (for sessions loaded from storage) ---------- */

function isValidCurrentTile(tile, playerCount) {
  if (tile === null) return true;
  return (
    !!tile && typeof tile === 'object' &&
    Number.isInteger(tile.ci) && Number.isInteger(tile.qi) &&
    typeof tile.questionShown === 'boolean' &&
    (tile.status === 'open' || tile.status === 'closed') &&
    Number.isInteger(tile.pickerBefore) &&
    Array.isArray(tile.attempts) &&
    tile.attempts.every((a) =>
      Number.isInteger(a?.playerIndex) && a.playerIndex >= 0 && a.playerIndex < playerCount &&
      typeof a.correct === 'boolean' && Number.isFinite(a.delta))
  );
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
    isValidCurrentTile(currentTile ?? null, players.length)
  );
}
