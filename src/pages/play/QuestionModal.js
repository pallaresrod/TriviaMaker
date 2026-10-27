import { el, renderTemplate } from '../../utils/dom.js';

const template = `
  <div class="question-modal-inner" role="dialog" aria-modal="true">
    <p class="question-meta" data-ref="meta"></p>
    <p class="question-text" data-ref="question"></p>
    <p class="question-answer" data-ref="answer" hidden></p>
    <button class="btn secondary" type="button" data-ref="reveal">Show answer</button>
    <p class="question-who">Who got it right?</p>
    <div class="question-players" data-ref="players"></div>
  </div>
`;

// Full-screen question view. Lives on <body> so it covers the whole page.
export function createQuestionModal({ onResolve }) {
  const root = el('div', { class: 'question-modal', hidden: true });
  const refs = renderTemplate(root, template);
  document.body.append(root);

  refs.reveal.addEventListener('click', () => {
    refs.answer.hidden = false;
    refs.reveal.hidden = true;
  });

  return {
    open({ category, question, players }) {
      refs.meta.textContent = `${category.name} · ${question.points} pts`;
      refs.question.textContent = question.question;
      refs.answer.textContent = question.answer;
      refs.answer.hidden = true;
      refs.reveal.hidden = false;

      refs.players.replaceChildren(
        ...players.map((player, i) => el('button', {
          type: 'button', class: 'btn primary', text: player.name, onclick: () => onResolve(i),
        })),
        el('button', { type: 'button', class: 'btn secondary', text: 'Nobody', onclick: () => onResolve(null) }),
      );

      root.hidden = false;
      refs.reveal.focus();
    },

    close() {
      root.hidden = true;
    },

    destroy() {
      root.remove();
    },
  };
}
