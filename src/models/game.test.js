import { describe, expect, it } from 'vitest';
import {
  countMissingFields,
  createBlankGame,
  duplicateGame,
  fromImportData,
  isGameComplete,
  isValidGame,
  toExportData,
} from './game.js';

function filledGame() {
  const game = createBlankGame();
  game.title = 'Test';
  game.categories.forEach((category, ci) => {
    category.name = `Category ${ci}`;
    category.questions.forEach((q, qi) => {
      q.question = `Q${ci}-${qi}`;
      q.answer = `A${ci}-${qi}`;
    });
  });
  return game;
}

describe('game model', () => {
  it('creates a blank game with 6 categories of 50/100/150/200', () => {
    const game = createBlankGame();
    expect(game.categories).toHaveLength(6);
    expect(game.categories[0].questions.map((q) => q.points)).toEqual([50, 100, 150, 200]);
    expect(isValidGame(game)).toBe(true);
  });

  it('counts every empty field', () => {
    // title + 6 names + 24 questions + 24 answers
    expect(countMissingFields(createBlankGame())).toBe(55);
    expect(isGameComplete(filledGame())).toBe(true);
  });

  it('treats whitespace-only fields as empty', () => {
    const game = filledGame();
    game.categories[2].questions[3].answer = '   ';
    expect(countMissingFields(game)).toBe(1);
    expect(isGameComplete(game)).toBe(false);
  });

  it('duplicates without an id and does not share data', () => {
    const game = filledGame();
    const copy = duplicateGame(game);
    expect(copy.id).toBeUndefined();
    expect(copy.title).toBe('Test (copy)');
    copy.categories[0].name = 'Changed';
    expect(game.categories[0].name).toBe('Category 0');
  });

  it('round-trips through export and import', () => {
    const game = filledGame();
    const imported = fromImportData(JSON.parse(JSON.stringify(toExportData(game))));
    expect(imported.title).toBe('Test');
    expect(imported.categories).toEqual(game.categories);
  });

  it('rejects malformed imports', () => {
    expect(() => fromImportData({ title: 'x', categories: [] })).toThrow();
    expect(() => fromImportData(null)).toThrow();
    const wrongPoints = toExportData(filledGame());
    wrongPoints.categories[0].questions[0].points = 999;
    expect(() => fromImportData(wrongPoints)).toThrow();
  });
});
