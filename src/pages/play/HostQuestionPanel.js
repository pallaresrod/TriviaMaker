import { el } from '../../utils/dom.js';
import { canAnswer, canUndo, getTile, isLastTile } from '../../models/session.js';
import { formatDelta, formatScore } from './Scoreboard.js';

// What the host sees while a question is open: the question to read aloud,
// the answer (host only), and buttons to score each player.
//
// actions: { onShowQuestion, onCorrect(i), onWrong(i), onNobody, onUndo, onClose }
export function renderHostQuestion(container, session, actions) {
  const tile = session.currentTile;
  const { category, question } = getTile(session, tile);
  const isOpen = tile.status === 'open';

  const screenStatus = !isOpen
    ? el('p', { class: 'screen-status is-shown', text: "Players' screen: answer and result" })
    : tile.questionShown
      ? el('p', { class: 'screen-status is-shown', text: "Players' screen: question is showing" })
      : el('p', { class: 'screen-status', text: "Players' screen: category only. Read the question aloud." });

  const showButton = isOpen && !tile.questionShown
    ? el('button', {
      type: 'button', class: 'btn primary', text: 'Show question on screen', onclick: actions.onShowQuestion,
    })
    : null;

  const answer = el('div', { class: 'host-answer' }, [
    el('span', { class: 'host-answer-label', text: isOpen ? 'Answer (only you can see this)' : 'Answer' }),
    el('span', { class: 'host-answer-text', text: question.answer }),
  ]);

  const rows = session.players.map((player, i) => {
    const attempt = tile.attempts.find((a) => a.playerIndex === i);
    let status;
    if (attempt) {
      status = el('span', {
        class: `host-player-result ${attempt.correct ? 'is-correct' : 'is-wrong'}`,
        text: `${attempt.correct ? '✓' : '✗'} ${formatDelta(attempt.delta)}`,
      });
    } else if (canAnswer(session, i)) {
      status = el('div', { class: 'host-player-actions' }, [
        el('button', { type: 'button', class: 'btn ok small', text: '✓ Correct', onclick: () => actions.onCorrect(i) }),
        el('button', { type: 'button', class: 'btn wrong small', text: '✗ Wrong', onclick: () => actions.onWrong(i) }),
      ]);
    } else {
      status = el('span', { class: 'host-player-result', text: '—' });
    }
    return el('li', { class: `host-player${attempt ? (attempt.correct ? ' is-correct' : ' is-wrong') : ''}` }, [
      el('span', { class: 'host-player-name', text: player.name }),
      el('span', { class: 'host-player-score', text: formatScore(player.score) }),
      status,
    ]);
  });

  const undo = el('button', {
    type: 'button', class: 'btn secondary', text: 'Undo last', disabled: !canUndo(session), onclick: actions.onUndo,
  });

  let footer;
  if (isOpen) {
    footer = [undo, el('button', { type: 'button', class: 'btn secondary', text: 'Nobody got it', onclick: actions.onNobody })];
  } else {
    const result = tile.closedBy === 'correct'
      ? `${session.players[tile.winnerIndex].name} got it! ${formatDelta(tile.attempts.at(-1).delta)}`
      : 'Nobody got it.';
    footer = [
      el('p', { class: `host-result${tile.closedBy === 'correct' ? ' is-correct' : ''}`, text: result }),
      el('div', { class: 'host-footer-actions' }, [
        undo,
        el('button', {
          type: 'button', class: 'btn primary', text: isLastTile(session) ? 'See final results' : 'Back to board',
          onclick: actions.onClose,
        }),
      ]),
    ];
  }

  container.replaceChildren(el('div', { class: 'host-question' }, [
    el('div', { class: 'host-question-top' }, [
      el('p', { class: 'host-question-meta', text: `${category.name} · ${question.points} pts` }),
      screenStatus,
    ]),
    el('p', { class: 'host-question-text', text: question.question }),
    answer,
    ...(showButton ? [showButton] : []),
    el('ul', { class: 'host-players' }, rows),
    el('div', { class: 'host-footer' }, footer),
  ]));
}
