import { POINTS } from '../../constants.js';
import { el } from '../../utils/dom.js';
import { isTileUsed } from '../../models/session.js';

// The 6×4 grid: a header row of categories, then one row per point value.
// The host's board is clickable; the players' screen shows the same board read-only.
export function renderBoard(container, session, { onPick = null } = {}) {
  const { categories } = session.game;
  const interactive = typeof onPick === 'function';

  const headers = categories.map((category) => el('div', { class: 'board-category', text: category.name }));

  const tiles = POINTS.flatMap((points, qi) =>
    categories.map((category, ci) => {
      const used = isTileUsed(session, ci, qi);
      if (!interactive) {
        return el('div', { class: `board-tile${used ? ' is-used' : ''}`, text: used ? '' : String(points) });
      }
      return el('button', {
        type: 'button',
        class: 'board-tile',
        text: String(points),
        disabled: used,
        'aria-label': `${category.name} for ${points}`,
        onclick: () => onPick(ci, qi),
      });
    }));

  container.replaceChildren(...headers, ...tiles);
}
