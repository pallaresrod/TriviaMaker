import './results.css';
import { el, renderTemplate } from '../../utils/dom.js';
import { getWinners, isFinished, rankPlayers } from '../../models/session.js';
import { clearSession, getSession } from '../../storage/sessionRepository.js';
import { navigate, pathTo } from '../../router.js';

const template = `
  <section class="page">
    <div class="panel">
      <h1>Game over</h1>
      <p class="winner-line" data-ref="winner"></p>
      <ol class="ranking" data-ref="ranking"></ol>
      <div class="panel-actions">
        <button class="btn secondary" type="button" data-ref="library">Back to library</button>
        <button class="btn primary" type="button" data-ref="again">Play again</button>
      </div>
    </div>
  </section>
`;

export function ResultsPage(container) {
  const session = getSession();
  if (!session || !isFinished(session)) {
    navigate(session ? '/play' : '/', { replace: true });
    return;
  }

  const refs = renderTemplate(container, template);

  const winners = getWinners(session.players).map((p) => p.name);
  refs.winner.textContent = winners.length > 1
    ? `It's a tie: ${winners.join(' & ')}!`
    : `${winners[0]} wins!`;

  refs.ranking.replaceChildren(...rankPlayers(session.players).map((player) =>
    el('li', { class: `ranking-row${player.rank === 1 ? ' is-winner' : ''}` }, [
      el('span', { class: 'ranking-place', text: `#${player.rank}` }),
      el('span', { class: 'ranking-name', text: player.name }),
      el('span', { class: 'ranking-score', text: `${player.score} pts` }),
    ])));

  refs.library.addEventListener('click', () => {
    clearSession();
    navigate('/');
  });

  refs.again.addEventListener('click', () => {
    // Setup loads the latest saved version, or returns to the library if it was deleted.
    clearSession();
    navigate(session.game.id ? pathTo('setup', session.game.id) : '/');
  });
}
