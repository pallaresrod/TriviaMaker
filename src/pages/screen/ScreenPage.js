import '../play/play.css';
import './screen.css';
import { STORAGE_KEYS } from '../../constants.js';
import { el, renderTemplate } from '../../utils/dom.js';
import { displayTitle } from '../../models/game.js';
import { getTile, getWinners, isFinished, rankPlayers } from '../../models/session.js';
import { getSession } from '../../storage/sessionRepository.js';
import { renderBoard } from '../play/Board.js';
import { formatDelta, formatScore, renderScoreboard } from '../play/Scoreboard.js';

// The players' screen (#/screen): a read-only view for the projector or TV.
// The host's window saves every change to localStorage; the browser fires a
// `storage` event in this window, and we redraw from the saved session.

const template = `
  <section class="screen">
    <button class="btn secondary small screen-fullscreen" type="button" data-ref="fullscreen">Full screen</button>
    <div class="screen-stage" data-ref="stage"></div>
    <div class="scoreboard screen-scores" data-ref="scores"></div>
  </section>
`;

function waitingView() {
  return el('div', { class: 'screen-waiting' }, [
    el('h1', { text: 'Trivia Maker' }),
    el('p', { text: 'Waiting for the host to start a game…' }),
  ]);
}

function boardView(session) {
  const board = el('div', { class: 'board' });
  renderBoard(board, session);
  return el('div', { class: 'screen-board' }, [
    el('p', { class: 'screen-picker' }, [
      el('strong', { text: session.players[session.pickerIndex].name }),
      ' is picking',
    ]),
    board,
  ]);
}

function attemptsView(session) {
  const wrong = session.currentTile.attempts.filter((a) => !a.correct);
  return el('div', { class: 'screen-attempts' }, wrong.map((a) =>
    el('span', { class: 'attempt-chip', text: `${session.players[a.playerIndex].name} ✗ ${formatDelta(a.delta)}` })));
}

function questionView(session) {
  const tile = session.currentTile;
  const { category, question } = getTile(session, tile);
  const meta = el('p', { class: 'screen-meta', text: `${category.name} · ${question.points}` });

  if (tile.status === 'closed') {
    const winner = tile.closedBy === 'correct' ? session.players[tile.winnerIndex] : null;
    return el('div', { class: 'screen-question' }, [
      meta,
      el('p', { class: 'screen-question-text is-small', text: question.question }),
      el('p', { class: 'screen-answer', text: question.answer }),
      winner
        ? el('p', { class: 'screen-result is-correct', text: `${winner.name} ✓ ${formatDelta(question.points)}` })
        : el('p', { class: 'screen-result', text: 'Nobody got it' }),
      attemptsView(session),
    ]);
  }

  return el('div', { class: 'screen-question' }, [
    meta,
    tile.questionShown
      ? el('p', { class: 'screen-question-text', text: question.question })
      : el('p', { class: 'screen-listen', text: 'Listen…' }),
    attemptsView(session),
  ]);
}

function resultsView(session) {
  const winners = getWinners(session.players).map((p) => p.name);
  return el('div', { class: 'screen-results' }, [
    el('p', { class: 'screen-meta', text: `${displayTitle(session.game)} · Game over` }),
    el('h1', { text: winners.length > 1 ? `It's a tie: ${winners.join(' & ')}!` : `${winners[0]} wins!` }),
    el('ol', { class: 'screen-ranking' }, rankPlayers(session.players).map((p) =>
      el('li', { class: p.rank === 1 ? 'is-winner' : '' }, [
        el('span', { class: 'ranking-place', text: `#${p.rank}` }),
        el('span', { text: p.name }),
        el('span', { class: `ranking-score${p.score < 0 ? ' is-negative' : ''}`, text: formatScore(p.score) }),
      ]))),
  ]);
}

export function ScreenPage(container) {
  document.body.classList.add('is-screen');
  const refs = renderTemplate(container, template);

  function render() {
    const session = getSession();
    refs.scores.hidden = !session || (isFinished(session) && !session.currentTile);

    if (!session) {
      refs.stage.replaceChildren(waitingView());
      return;
    }
    if (session.currentTile) {
      refs.stage.replaceChildren(questionView(session));
    } else if (isFinished(session)) {
      refs.stage.replaceChildren(resultsView(session));
    } else {
      refs.stage.replaceChildren(boardView(session));
    }
    renderScoreboard(refs.scores, session.players, session.currentTile ? -1 : session.pickerIndex);
  }

  function onStorage(event) {
    // key is null when all storage was cleared.
    if (event.key === null || event.key === STORAGE_KEYS.session) render();
  }

  function updateFullscreenButton() {
    refs.fullscreen.hidden = !!document.fullscreenElement || !document.fullscreenEnabled;
  }

  refs.fullscreen.addEventListener('click', () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  });

  window.addEventListener('storage', onStorage);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  updateFullscreenButton();
  render();

  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('fullscreenchange', updateFullscreenButton);
    document.body.classList.remove('is-screen');
  };
}
