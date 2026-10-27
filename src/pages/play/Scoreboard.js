import { el } from '../../utils/dom.js';

export function renderScoreboard(container, players, pickerIndex) {
  container.replaceChildren(...players.map((player, i) =>
    el('div', { class: `score${i === pickerIndex ? ' is-picker' : ''}` }, [
      el('div', { class: 'score-name', text: player.name }),
      el('div', { class: 'score-points', text: String(player.score) }),
    ])));
}
