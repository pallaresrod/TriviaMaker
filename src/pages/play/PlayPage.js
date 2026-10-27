import './play.css';
import { el, renderTemplate } from '../../utils/dom.js';
import { displayTitle } from '../../models/game.js';
import { getTile, isFinished, isFirstTurn, resolveTile, selectTile } from '../../models/session.js';
import { clearSession, getSession, saveSession } from '../../storage/sessionRepository.js';
import { navigate } from '../../router.js';
import { renderBoard } from './Board.js';
import { renderScoreboard } from './Scoreboard.js';
import { createQuestionModal } from './QuestionModal.js';

const template = `
  <section class="page">
    <div class="play-header">
      <h1 data-ref="title"></h1>
      <button class="btn secondary small" type="button" data-ref="quit">Quit game</button>
    </div>
    <p class="picker-banner" data-ref="banner"></p>
    <div class="board" data-ref="board"></div>
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

  const modal = createQuestionModal({ onResolve: answerQuestion });

  function update(next) {
    session = next;
    saveSession(session);
  }

  function render() {
    const picker = session.players[session.pickerIndex];
    refs.banner.replaceChildren(
      isFirstTurn(session) ? 'Randomly chosen to start: ' : 'Next pick: ',
      el('strong', { text: picker.name }),
      ' — choose a category and value.',
    );
    renderBoard(refs.board, session, openQuestion);
    renderScoreboard(refs.scoreboard, session.players, session.pickerIndex);
  }

  function showCurrentQuestion() {
    const { category, question } = getTile(session, session.currentTile);
    modal.open({ category, question, players: session.players });
  }

  function openQuestion(ci, qi) {
    update(selectTile(session, ci, qi));
    showCurrentQuestion();
  }

  function answerQuestion(winnerIndex) {
    update(resolveTile(session, winnerIndex));
    modal.close();
    if (isFinished(session)) navigate('/results');
    else render();
  }

  refs.quit.addEventListener('click', () => {
    if (!confirm('Quit this game? Scores will be lost.')) return;
    clearSession();
    navigate('/');
  });

  render();
  // Re-open the question that was on screen before a refresh.
  if (session.currentTile) showCurrentQuestion();

  return () => modal.destroy();
}
