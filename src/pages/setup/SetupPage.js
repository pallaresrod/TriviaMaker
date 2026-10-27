import './setup.css';
import { LIMITS, MAX_PLAYERS, MIN_PLAYERS } from '../../constants.js';
import { el, renderTemplate } from '../../utils/dom.js';
import { displayTitle, isGameComplete } from '../../models/game.js';
import { createSession } from '../../models/session.js';
import { getGame, isAbortError } from '../../api/gamesApi.js';
import { getSession, saveSession } from '../../storage/sessionRepository.js';
import { navigate } from '../../router.js';

const DEFAULT_PLAYERS = 2;

const template = `
  <section class="page">
    <div class="panel">
      <h1 data-ref="title">Loading…</h1>
      <p class="msg warn" data-ref="error" hidden></p>
      <label class="field">
        Number of players
        <select data-ref="count"></select>
      </label>
      <div class="player-names" data-ref="names"></div>
      <div class="panel-actions">
        <a class="btn secondary" href="#/">Back</a>
        <button class="btn primary" type="button" data-ref="start" disabled>Start game</button>
      </div>
    </div>
  </section>
`;

export function SetupPage(container, { id }, { signal }) {
  const refs = renderTemplate(container, template);
  let game = null;

  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    refs.count.append(el('option', { value: String(n), text: String(n), selected: n === DEFAULT_PLAYERS }));
  }

  // Keep typed names when the player count changes.
  const typedNames = [];

  function renderNameInputs() {
    const count = Number(refs.count.value);
    refs.names.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const input = el('input', {
        type: 'text', maxLength: LIMITS.playerName,
        placeholder: `Player ${i + 1}`, value: typedNames[i] ?? '',
        oninput: (event) => { typedNames[i] = event.target.value; },
      });
      return el('label', { class: 'field' }, [`Player ${i + 1}`, input]);
    }));
  }

  function start() {
    if (!game) return;
    const count = Number(refs.count.value);
    const names = Array.from({ length: count }, (_, i) => typedNames[i]?.trim() || `Player ${i + 1}`);

    if (getSession() && !confirm('Another game is in progress. Start a new one and discard it?')) return;
    saveSession(createSession(game, names));
    navigate('/play');
  }

  refs.count.addEventListener('change', renderNameInputs);
  refs.start.addEventListener('click', start);
  renderNameInputs();

  async function init() {
    try {
      game = await getGame(id, { signal });
    } catch (err) {
      if (isAbortError(err)) return;
      refs.title.textContent = 'Could not load this game';
      refs.error.textContent = err.message;
      refs.error.hidden = false;
      return;
    }
    if (!game || !isGameComplete(game)) {
      navigate('/', { replace: true });
      return;
    }
    refs.title.textContent = displayTitle(game);
    refs.start.disabled = false;
  }

  init();
}
