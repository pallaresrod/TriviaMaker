import { LIMITS } from '../../constants.js';
import { el } from '../../utils/dom.js';

// One editor column: the category name plus its 4 question cards.
// Edits are written straight into `category` (the editor's draft copy).
export function CategoryColumn(category, index, onChange) {
  function bind(input, onValue) {
    input.addEventListener('input', () => {
      onValue(input.value);
      input.classList.remove('invalid');
      onChange();
    });
    return input;
  }

  const nameInput = bind(
    el('input', {
      class: 'category-name', type: 'text', value: category.name,
      placeholder: `Category ${index + 1}`, maxLength: LIMITS.categoryName,
    }),
    (value) => { category.name = value; },
  );

  const cards = category.questions.map((q) => {
    const questionInput = bind(
      el('textarea', { rows: 3, placeholder: 'Question', value: q.question }),
      (value) => { q.question = value; },
    );
    const answerInput = bind(
      el('input', { type: 'text', placeholder: 'Answer', value: q.answer }),
      (value) => { q.answer = value; },
    );
    const element = el('div', { class: 'question-card' }, [
      el('span', { class: 'question-points', text: `${q.points} pts` }),
      questionInput,
      answerInput,
    ]);
    return { element, questionInput, answerInput };
  });

  return {
    element: el('div', { class: 'category-column' }, [nameInput, ...cards.map((card) => card.element)]),

    showMissing(missing) {
      nameInput.classList.toggle('invalid', missing.name);
      cards.forEach((card, i) => {
        card.questionInput.classList.toggle('invalid', missing.questions[i].question);
        card.answerInput.classList.toggle('invalid', missing.questions[i].answer);
      });
    },
  };
}
