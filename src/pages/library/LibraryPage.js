import './library.css';
import { renderTemplate } from '../../utils/dom.js';
import { downloadJson, readJsonFile, toFileName } from '../../utils/files.js';
import { duplicateGame, displayTitle, fromImportData, toExportData } from '../../models/game.js';
import { isFinished } from '../../models/session.js';
import { createGame, deleteGame, isAbortError, listGames } from '../../api/gamesApi.js';
import { clearSession, getSession } from '../../storage/sessionRepository.js';
import { migrateBrowserGames } from '../../storage/legacyMigration.js';
import { navigate, pathTo } from '../../router.js';
import { GameCard } from './GameCard.js';
import { ResumeBanner } from './ResumeBanner.js';

const template = `
  <section class="page">
    <div class="toolbar">
      <h1>Your trivia games</h1>
      <div class="toolbar-actions">
        <label class="btn secondary">
          Import (.json)
          <input type="file" accept=".json,application/json" hidden data-ref="importInput">
        </label>
        <a class="btn primary" href="#/new">+ New game</a>
      </div>
    </div>
    <div data-ref="resume"></div>
    <p class="msg" data-ref="message" hidden></p>
    <p class="empty" data-ref="status">Loading games…</p>
    <ul class="game-list" data-ref="list"></ul>
  </section>
`;

export function LibraryPage(container, _params, { signal }) {
  const refs = renderTemplate(container, template);

  function showMessage(kind, text) {
    refs.message.className = `msg ${kind}`;
    refs.message.textContent = text;
    refs.message.hidden = false;
  }

  // Run an action and show any error on the page instead of failing silently.
  async function run(action) {
    try {
      await action();
    } catch (err) {
      if (!isAbortError(err)) showMessage('warn', err.message);
    }
  }

  const actions = {
    onPlay: (game) => navigate(pathTo('setup', game.id)),
    onEdit: (game) => navigate(pathTo('edit', game.id)),
    onDuplicate: (game) => run(async () => {
      await createGame(duplicateGame(game));
      await loadGames();
    }),
    onExport: (game) => downloadJson(toFileName(game.title), toExportData(game)),
    onDelete: (game) => run(async () => {
      if (!confirm(`Delete "${displayTitle(game)}"? Its file in trivias/ will be removed.`)) return;
      await deleteGame(game.id);
      await loadGames();
    }),
  };

  function renderResume() {
    const session = getSession();
    refs.resume.replaceChildren(...(session ? [ResumeBanner(session, {
      onResume: () => navigate(isFinished(session) ? '/results' : '/play'),
      onDiscard: () => {
        clearSession();
        renderResume();
      },
    })] : []));
  }

  async function loadGames() {
    const games = await listGames({ signal });
    games.sort((a, b) => b.updatedAt - a.updatedAt);
    refs.status.textContent = 'No games yet. Create your first one — it will be saved in the trivias/ folder.';
    refs.status.hidden = games.length > 0;
    refs.list.replaceChildren(...games.map((game) => GameCard(game, actions)));
  }

  refs.importInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    let game;
    try {
      game = fromImportData(await readJsonFile(file));
    } catch {
      showMessage('warn', `"${file.name}" is not a valid Trivia Maker game.`);
      return;
    }
    await run(async () => {
      const saved = await createGame(game);
      showMessage('ok', `Imported "${displayTitle(saved)}" into trivias/${saved.id}.json.`);
      await loadGames();
    });
  });

  async function init() {
    try {
      const moved = await migrateBrowserGames();
      if (moved > 0) {
        showMessage('ok', `Moved ${moved} game${moved === 1 ? '' : 's'} from the browser into the trivias/ folder.`);
      }
      await loadGames();
    } catch (err) {
      if (isAbortError(err)) return;
      refs.status.hidden = true;
      showMessage('warn', err.message);
    }
  }

  renderResume();
  init();
}
