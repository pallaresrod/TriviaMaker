// A trivia game: a title plus 6 categories × 4 questions.
//
// {
//   id,          // file name in trivias/ (null until first saved)
//   title, updatedAt,
//   categories: [{ name, questions: [{ points, question, answer }] }]
// }
//
// Shared by the browser and the server, so no DOM or Node APIs here.

import { CATEGORY_COUNT, POINTS } from '../constants.js';

const isBlank = (text) => text.trim() === '';

export function createBlankGame() {
  return {
    id: null,
    title: '',
    categories: Array.from({ length: CATEGORY_COUNT }, () => ({
      name: '',
      questions: POINTS.map((points) => ({ points, question: '', answer: '' })),
    })),
    updatedAt: Date.now(),
  };
}

export function cloneGame(game) {
  return structuredClone(game);
}

/** Checks the title/categories structure (not the id, so it works for imported files). */
export function isValidGame(game) {
  return (
    !!game && typeof game === 'object' &&
    typeof game.title === 'string' &&
    Array.isArray(game.categories) &&
    game.categories.length === CATEGORY_COUNT &&
    game.categories.every((category) =>
      !!category && typeof category.name === 'string' &&
      Array.isArray(category.questions) &&
      category.questions.length === POINTS.length &&
      category.questions.every((q, i) =>
        !!q && q.points === POINTS[i] &&
        typeof q.question === 'string' &&
        typeof q.answer === 'string'))
  );
}

/** Which fields are still empty, in the same shape as the game. */
export function getMissingFields(game) {
  return {
    title: isBlank(game.title),
    categories: game.categories.map((category) => ({
      name: isBlank(category.name),
      questions: category.questions.map((q) => ({
        question: isBlank(q.question),
        answer: isBlank(q.answer),
      })),
    })),
  };
}

export function countMissingFields(game) {
  const missing = getMissingFields(game);
  let count = missing.title ? 1 : 0;
  for (const category of missing.categories) {
    if (category.name) count++;
    for (const q of category.questions) {
      if (q.question) count++;
      if (q.answer) count++;
    }
  }
  return count;
}

export function isGameComplete(game) {
  return countMissingFields(game) === 0;
}

export function displayTitle(game) {
  return game.title.trim() || 'Untitled game';
}

/** A copy to save as a new game (no id: the server assigns one). */
export function duplicateGame(game) {
  return {
    title: `${displayTitle(game)} (copy)`,
    categories: cloneGame(game.categories),
  };
}

export function toExportData(game) {
  return { title: game.title, categories: cloneGame(game.categories) };
}

export function fromImportData(data) {
  if (!isValidGame(data)) {
    throw new Error('That file is not a valid Trivia Maker game.');
  }
  return { title: data.title, categories: cloneGame(data.categories) };
}
