import './editor.css';
import { LIMITS } from '../../constants.js';
import { renderTemplate } from '../../utils/dom.js';
import { countMissingFields, createBlankGame, getMissingFields } from '../../models/game.js';
import { createGame, getGame, isAbortError, updateGame } from '../../api/gamesApi.js';
import { navigate, pathTo, setPathSilently } from '../../router.js';
import { CategoryColumn } from './CategoryColumn.js';

const template = `
  <section class="page">
    <div class="toolbar">
      <input class="title-input" type="text" placeholder="Game title" data-ref="title" disabled>
      <div class="toolbar-actions">
        <button class="btn secondary" type="button" data-ref="back">Back</button>
        <a class="btn secondary" data-ref="play" hidden>Play now</a>
        <button class="btn primary" type="button" data-ref="save" disabled>Save</button>
      </div>
    </div>
    <p class="msg" data-ref="message" hidden></p>
    <div class="editor-grid" data-ref="grid"></div>
  </section>
`;

export function EditorPage(container, { id } = {}, { signal }) {
  const refs = renderTemplate(container, template);
  let draft = null;
  let columns = [];
  let dirty = false;
  const markDirty = () => { dirty = true; };

  function showMessage(kind, text) {
    refs.message.className = `msg ${kind}`;
    refs.message.textContent = text;
    refs.message.hidden = false;
  }

  function updatePlayLink() {
    const playable = draft.id && countMissingFields(draft) === 0;
    refs.play.hidden = !playable;
    if (playable) refs.play.href = `#${pathTo('setup', draft.id)}`;
  }

  function showMissing() {
    const missing = getMissingFields(draft);
    refs.title.classList.toggle('invalid', missing.title);
    columns.forEach((column, i) => column.showMissing(missing.categories[i]));
  }

  function build() {
    refs.title.maxLength = LIMITS.title;
    refs.title.value = draft.title;
    refs.title.disabled = false;
    refs.save.disabled = false;
    refs.title.addEventListener('input', () => {
      draft.title = refs.title.value;
      refs.title.classList.remove('invalid');
      markDirty();
    });

    columns = draft.categories.map((category, index) => CategoryColumn(category, index, markDirty));
    refs.grid.append(...columns.map((column) => column.element));
    updatePlayLink();
    refs.title.focus();
  }

  async function save() {
    refs.save.disabled = true;
    try {
      // Not cancelled on navigation: a save that started should finish.
      const saved = draft.id ? await updateGame(draft) : await createGame(draft);
      draft.id = saved.id;
      draft.updatedAt = saved.updatedAt;
      dirty = false;
      if (signal.aborted) return;

      setPathSilently(pathTo('edit', saved.id));
      const missing = countMissingFields(draft);
      const where = `Saved to trivias/${saved.id}.json.`;
      if (missing === 0) {
        showMessage('ok', `${where} This game is ready to play!`);
      } else {
        showMessage('warn',
          `${where} It's a draft: ${missing} field${missing === 1 ? ' is' : 's are'} still empty (outlined below).`);
      }
      showMissing();
      updatePlayLink();
    } catch (err) {
      showMessage('warn', `Couldn't save: ${err.message}`);
    } finally {
      refs.save.disabled = false;
    }
  }

  refs.save.addEventListener('click', save);
  refs.back.addEventListener('click', () => {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/');
  });

  async function init() {
    if (!id) {
      draft = createBlankGame();
      build();
      return;
    }
    showMessage('ok', 'Loading…');
    try {
      draft = await getGame(id, { signal });
    } catch (err) {
      if (!isAbortError(err)) showMessage('warn', err.message);
      return;
    }
    if (!draft) {
      navigate('/', { replace: true });
      return;
    }
    refs.message.hidden = true;
    build();
  }

  init();
}
