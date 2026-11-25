import './play.css';
import { el, renderTemplate } from '../../utils/dom.js';
import { displayTitle } from '../../models/game.js';
import {
  closeTile,
  isFinished,
  isFirstTurn,
  markCorrect,
  markNobody,
  markWrong,
  selectTile,
  showQuestion,
  undoLastAttempt,
} from '../../models/session.js';
import { clearSession, getSession, saveSession } from '../../storage/sessionRepository.js';
import { navigate } from '../../router.js';
import { renderBoard } from './Board.js';
import { renderScoreboard } from './Scoreboard.js';
import { renderHostQuestion } from './HostQuestionPanel.js';

// The host's view. Every change is saved to the session in localStorage,
// which is also how the players' screen (#/screen) stays in sync.

const SCREEN_WINDOW_NAME = 'trivia-screen';

const template = `
  <section class="page">
    <div class="play-header">
      <h1 data-ref="title"></h1>
      <div class="toolbar-actions">
        <button class="btn primary small" type="button" data-ref="openScreen">Open players' screen</button>
        <button class="btn secondary small" type="button" data-ref="quit">Quit game</button>
      </div>
    </div>
    <p class="msg warn" data-ref="popupBlocked" hidden></p>
    <p class="picker-banner" data-ref="banner"></p>
    <div class="board" data-ref="board"></div>
    <div data-ref="question"></div>
    <div class="scoreboard" data-ref="scoreboard"></div>
  </section>
`;

export function PlayPage(container) {
  let session = getSession();
  if (!session) {
    navigate('/', { replace: true });
    return;
  }
  if (isFinished(session)) {
    navigate('/results', { replace: true });
    return;
  }

  const refs = renderTemplate(container, template);
  refs.title.textContent = displayTitle(session.game);

  function update(change) {
    session = change(session);
    saveSession(session);
    if (isFinished(session)) navigate('/results');
    else render();
  }

  const questionActions = {
    onShowQuestion: () => update(showQuestion),
    onCorrect: (i) => update((s) => markCorrect(s, i)),
    onWrong: (i) => update((s) => markWrong(s, i)),
    onNobody: () => update(markNobody),
    onUndo: () => update(undoLastAttempt),
    onClose: () => update(closeTile),
  };

  function render() {
    const hasQuestion = !!session.currentTile;
    refs.board.hidden = hasQuestion;
    refs.banner.hidden = hasQuestion;
    refs.question.hidden = !hasQuestion;

    if (hasQuestion) {
      renderHostQuestion(refs.question, session, questionActions);
    } else {
      refs.banner.replaceChildren(
        isFirstTurn(session) ? 'Randomly chosen to start: ' : 'Next pick: ',
        el('strong', { text: session.players[session.pickerIndex].name }),
        ' — choose a category and value.',
      );
      renderBoard(refs.board, session, { onPick: (ci, qi) => update((s) => selectTile(s, ci, qi)) });
    }
    renderScoreboard(refs.scoreboard, session.players, session.pickerIndex);
  }

  refs.openScreen.addEventListener('click', () => {
    const url = `${location.pathname}${location.search}#/screen`;
    const win = window.open(url, SCREEN_WINDOW_NAME, 'popup,width=1280,height=720');
    refs.popupBlocked.hidden = !!win;
    if (!win) {
      refs.popupBlocked.textContent =
        `The browser blocked the new window. Allow pop-ups for this site, or open ${location.origin}${url} in a new window.`;
    }
  });

  refs.quit.addEventListener('click', () => {
    if (!confirm('Quit this game? Scores will be lost.')) return;
    clearSession();
    navigate('/');
  });

  render();
}
