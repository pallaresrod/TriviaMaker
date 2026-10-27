import { el } from '../../utils/dom.js';
import { displayTitle } from '../../models/game.js';
import { isFinished } from '../../models/session.js';

export function ResumeBanner(session, { onResume, onDiscard }) {
  const finished = isFinished(session);
  return el('div', { class: 'resume-banner' }, [
    el('p', {}, [
      finished ? 'Finished game: ' : 'Game in progress: ',
      el('strong', { text: displayTitle(session.game) }),
      ` (${session.players.map((p) => p.name).join(', ')})`,
    ]),
    el('div', { class: 'resume-actions' }, [
      el('button', { type: 'button', class: 'btn secondary small', text: 'Discard', onclick: onDiscard }),
      el('button', {
        type: 'button', class: 'btn primary small',
        text: finished ? 'See results' : 'Resume', onclick: onResume,
      }),
    ]),
  ]);
}
