import { describe, expect, it } from 'vitest';
import { createBlankGame } from './game.js';
import {
  canAnswer,
  canUndo,
  closeTile,
  createSession,
  getWinners,
  isFinished,
  isTileUsed,
  isValidSession,
  markCorrect,
  markNobody,
  markWrong,
  rankPlayers,
  selectTile,
  showQuestion,
  undoLastAttempt,
} from './session.js';

const names = ['Ana', 'Bo', 'Cy'];
const newSession = (random = () => 0) => createSession(createBlankGame(), names, random);
const scores = (session) => session.players.map((p) => p.score);

// Category 6, 100 pts
const open100 = (session = newSession()) => selectTile(session, 5, 1);

describe('starting', () => {
  it('picks a random first player', () => {
    expect(newSession(() => 0).pickerIndex).toBe(0);
    expect(newSession(() => 0.99).pickerIndex).toBe(2);
  });

  it('only allows 1 to 4 players', () => {
    expect(() => createSession(createBlankGame(), [])).toThrow();
    expect(() => createSession(createBlankGame(), ['a', 'b', 'c', 'd', 'e'])).toThrow();
  });
});

describe('a question', () => {
  it('starts hidden from players until the host shows it', () => {
    let session = open100();
    expect(session.currentTile.questionShown).toBe(false);
    session = showQuestion(session);
    expect(session.currentTile.questionShown).toBe(true);
  });

  it('cannot open another tile while one is open', () => {
    expect(() => selectTile(open100(), 0, 0)).toThrow();
  });

  it('gives points to a correct answer and makes them the picker', () => {
    const session = markCorrect(open100(), 1);
    expect(scores(session)).toEqual([0, 100, 0]);
    expect(session.pickerIndex).toBe(1);
    expect(session.currentTile.status).toBe('closed');
    expect(session.currentTile.winnerIndex).toBe(1);
  });

  it('takes points for a wrong answer, and scores can go negative', () => {
    const session = markWrong(open100(), 2);
    expect(scores(session)).toEqual([0, 0, -100]);
    expect(session.currentTile.status).toBe('open');
  });

  it('locks out a player who answered wrong, but others can still try', () => {
    let session = markWrong(open100(), 0);
    expect(canAnswer(session, 0)).toBe(false);
    expect(canAnswer(session, 1)).toBe(true);
    expect(() => markWrong(session, 0)).toThrow();
    expect(() => markCorrect(session, 0)).toThrow();

    session = markCorrect(session, 1);
    expect(scores(session)).toEqual([-100, 100, 0]);
    expect(session.pickerIndex).toBe(1);
  });

  it('closes on its own when everyone misses, keeping the same picker', () => {
    let session = open100(newSession(() => 0.5)); // Bo picks
    for (const i of [0, 1, 2]) session = markWrong(session, i);
    expect(session.currentTile.status).toBe('closed');
    expect(session.currentTile.closedBy).toBe('allWrong');
    expect(session.pickerIndex).toBe(1);
    expect(scores(session)).toEqual([-100, -100, -100]);
  });

  it('closes with nobody: no points change and the same picker', () => {
    const session = markNobody(markWrong(open100(newSession(() => 0.5)), 0));
    expect(session.currentTile.closedBy).toBe('nobody');
    expect(session.pickerIndex).toBe(1);
    expect(scores(session)).toEqual([-100, 0, 0]);
  });

  it('does not allow answers after it closes', () => {
    const session = markCorrect(open100(), 0);
    expect(canAnswer(session, 1)).toBe(false);
    expect(() => markWrong(session, 1)).toThrow();
  });

  it('is used up once closed', () => {
    let session = open100();
    expect(() => closeTile(session)).toThrow(); // still open
    session = closeTile(markNobody(session));
    expect(isTileUsed(session, 5, 1)).toBe(true);
    expect(session.currentTile).toBeNull();
    expect(() => selectTile(session, 5, 1)).toThrow();
  });
});

describe('undo', () => {
  it('reverses a wrong answer and unlocks the player', () => {
    let session = markWrong(open100(), 0);
    session = undoLastAttempt(session);
    expect(scores(session)).toEqual([0, 0, 0]);
    expect(canAnswer(session, 0)).toBe(true);
  });

  it('reverses a correct answer, the picker change, and reopens', () => {
    let session = markCorrect(open100(newSession(() => 0)), 2);
    session = undoLastAttempt(session);
    expect(scores(session)).toEqual([0, 0, 0]);
    expect(session.pickerIndex).toBe(0);
    expect(session.currentTile.status).toBe('open');
  });

  it('reopens after everyone missed (only the last miss is undone)', () => {
    let session = open100();
    for (const i of [0, 1, 2]) session = markWrong(session, i);
    session = undoLastAttempt(session);
    expect(session.currentTile.status).toBe('open');
    expect(scores(session)).toEqual([-100, -100, 0]);
  });

  it('reopens after nobody', () => {
    const session = undoLastAttempt(markNobody(open100()));
    expect(session.currentTile.status).toBe('open');
  });

  it('has nothing to undo on a fresh question', () => {
    expect(canUndo(open100())).toBe(false);
    expect(() => undoLastAttempt(open100())).toThrow();
  });
});

describe('the whole game', () => {
  it('finishes after all 24 tiles', () => {
    let session = newSession();
    for (let ci = 0; ci < 6; ci++) {
      for (let qi = 0; qi < 4; qi++) {
        expect(isFinished(session)).toBe(false);
        session = closeTile(markCorrect(selectTile(session, ci, qi), 0));
      }
    }
    expect(isFinished(session)).toBe(true);
    expect(session.players[0].score).toBe(6 * (50 + 100 + 150 + 200));
  });

  it('does not change the original session', () => {
    const original = newSession();
    markWrong(selectTile(original, 0, 0), 0);
    expect(original.players[0].score).toBe(0);
    expect(original.currentTile).toBeNull();
  });

  it('ranks players with shared places for ties, including negatives', () => {
    const players = [
      { name: 'Ana', score: 100 },
      { name: 'Bo', score: 300 },
      { name: 'Cy', score: 300 },
      { name: 'Di', score: -50 },
    ];
    expect(rankPlayers(players).map((p) => [p.name, p.rank])).toEqual([
      ['Bo', 1], ['Cy', 1], ['Ana', 3], ['Di', 4],
    ]);
    expect(getWinners(players).map((p) => p.name)).toEqual(['Bo', 'Cy']);
  });

  it('validates stored sessions', () => {
    expect(isValidSession(newSession())).toBe(true);
    expect(isValidSession(markWrong(open100(), 1))).toBe(true);
    expect(isValidSession(null)).toBe(false);
    expect(isValidSession({ ...newSession(), pickerIndex: 7 })).toBe(false);
    // A session saved by the previous version (currentTile without status) is rejected.
    expect(isValidSession({ ...newSession(), currentTile: { ci: 0, qi: 0 } })).toBe(false);
  });
});
