import { describe, expect, it } from 'vitest';
import { createBlankGame } from './game.js';
import {
  createSession,
  getWinners,
  isFinished,
  isTileUsed,
  isValidSession,
  rankPlayers,
  resolveTile,
  selectTile,
} from './session.js';

const names = ['Ana', 'Bo', 'Cy'];

describe('session model', () => {
  it('picks a random first player', () => {
    expect(createSession(createBlankGame(), names, () => 0).pickerIndex).toBe(0);
    expect(createSession(createBlankGame(), names, () => 0.99).pickerIndex).toBe(2);
  });

  it('only allows 1 to 4 players', () => {
    expect(() => createSession(createBlankGame(), [])).toThrow();
    expect(() => createSession(createBlankGame(), ['a', 'b', 'c', 'd', 'e'])).toThrow();
  });

  it('gives points to the winner and makes them the picker', () => {
    let session = createSession(createBlankGame(), names, () => 0);
    session = selectTile(session, 5, 1); // category 6, 100 pts
    session = resolveTile(session, 1);
    expect(session.players.map((p) => p.score)).toEqual([0, 100, 0]);
    expect(session.pickerIndex).toBe(1);
    expect(isTileUsed(session, 5, 1)).toBe(true);
    expect(session.currentTile).toBeNull();
  });

  it('keeps the same picker when nobody answers', () => {
    let session = createSession(createBlankGame(), names, () => 0.5);
    session = resolveTile(selectTile(session, 0, 0), null);
    expect(session.pickerIndex).toBe(1);
    expect(session.players.every((p) => p.score === 0)).toBe(true);
  });

  it('does not let a used tile be picked again', () => {
    const session = resolveTile(selectTile(createSession(createBlankGame(), names), 0, 0), 0);
    expect(() => selectTile(session, 0, 0)).toThrow();
  });

  it('does not change the original session', () => {
    const original = createSession(createBlankGame(), names, () => 0);
    resolveTile(selectTile(original, 0, 0), 0);
    expect(original.players[0].score).toBe(0);
    expect(original.usedTiles).toEqual([]);
  });

  it('finishes after all 24 tiles', () => {
    let session = createSession(createBlankGame(), names);
    for (let ci = 0; ci < 6; ci++) {
      for (let qi = 0; qi < 4; qi++) {
        expect(isFinished(session)).toBe(false);
        session = resolveTile(selectTile(session, ci, qi), 0);
      }
    }
    expect(isFinished(session)).toBe(true);
    expect(session.players[0].score).toBe(6 * (50 + 100 + 150 + 200));
  });

  it('ranks players with shared places for ties', () => {
    const players = [
      { name: 'Ana', score: 100 },
      { name: 'Bo', score: 300 },
      { name: 'Cy', score: 300 },
      { name: 'Di', score: 50 },
    ];
    expect(rankPlayers(players).map((p) => [p.name, p.rank])).toEqual([
      ['Bo', 1], ['Cy', 1], ['Ana', 3], ['Di', 4],
    ]);
    expect(getWinners(players).map((p) => p.name)).toEqual(['Bo', 'Cy']);
  });

  it('validates stored sessions', () => {
    expect(isValidSession(createSession(createBlankGame(), names))).toBe(true);
    expect(isValidSession(null)).toBe(false);
    expect(isValidSession({ ...createSession(createBlankGame(), names), pickerIndex: 7 })).toBe(false);
  });
});
