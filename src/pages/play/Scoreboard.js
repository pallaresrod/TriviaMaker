import { el } from '../../utils/dom.js';

export function renderScoreboard(container, players, pickerIndex) {
  container.replaceChildren(...players.map((player, i) =>
    el('div', { class: `score${i === pickerIndex ? ' is-picker' : ''}` }, [
      el('div', { class: 'score-name', text: player.name }),
      el('div', {
        class: `score-points${player.score < 0 ? ' is-negative' : ''}`,
        text: formatScore(player.score),
      }),
    ])));
}

/** Uses a real minus sign so negative scores read clearly on a projector. */
export function formatScore(score) {
  return score < 0 ? `−${Math.abs(score)}` : String(score);
}

/** "+100" / "−100" for a single answer. */
export function formatDelta(delta) {
  return delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`;
}
