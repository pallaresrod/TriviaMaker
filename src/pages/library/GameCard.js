import { el } from '../../utils/dom.js';
import { countMissingFields, displayTitle } from '../../models/game.js';

function actionButton(label, variant, onClick, extra = {}) {
  return el('button', { type: 'button', class: `btn ${variant} small`, text: label, onclick: onClick, ...extra });
}

export function GameCard(game, actions) {
  const missing = countMissingFields(game);
  const complete = missing === 0;

  const meta = el('p', { class: 'game-card-meta' }, [
    game.categories.map((category) => category.name.trim() || '—').join(' · '),
  ]);
  if (!complete) {
    meta.prepend(el('span', { class: 'badge', text: `Draft · ${missing} empty` }));
  }

  return el('li', { class: 'game-card' }, [
    el('div', { class: 'game-card-info' }, [
      el('h2', { text: displayTitle(game) }),
      meta,
    ]),
    el('div', { class: 'game-card-actions' }, [
      actionButton('Play', 'primary', () => actions.onPlay(game), {
        disabled: !complete,
        title: complete ? undefined : 'Fill in every question and answer to play',
      }),
      actionButton('Edit', 'secondary', () => actions.onEdit(game)),
      actionButton('Duplicate', 'secondary', () => actions.onDuplicate(game)),
      actionButton('Export', 'secondary', () => actions.onExport(game)),
      actionButton('Delete', 'danger', () => actions.onDelete(game)),
    ]),
  ]);
}
