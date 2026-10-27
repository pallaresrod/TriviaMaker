import { POINTS } from '../../constants.js';
import { el } from '../../utils/dom.js';
import { isTileUsed } from '../../models/session.js';

// The 6×4 grid: a header row of categories, then one row per point value.
export function renderBoard(container, session, onPick) {
  const { categories } = session.game;

  const headers = categories.map((category) => el('div', { class: 'board-category', text: category.name }));

  const tiles = POINTS.flatMap((points, qi) =>
    categories.map((category, ci) => el('button', {
      type: 'button',
      class: 'board-tile',
      text: String(points),
      disabled: isTileUsed(session, ci, qi),
      'aria-label': `${category.name} for ${points}`,
      onclick: () => onPick(ci, qi),
    })));

  container.replaceChildren(...headers, ...tiles);
}
