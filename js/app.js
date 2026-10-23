(() => {
  const questionPools = {
    baseline: [
      { target: 2, known: 1, form: 'sum-first' },
      { target: 3, known: 1, form: 'sum-first' },
      { target: 4, known: 3, form: 'ten-first' },
      { target: 5, known: 2, form: 'sum-first' },
      { target: 6, known: 4, form: 'ten-first' },
      { target: 7, known: 3, form: 'sum-first' },
      { target: 8, known: 5, form: 'ten-first' },
      { target: 9, known: 2, form: 'sum-first' },
      { target: 10, known: 6, form: 'ten-first' }
    ],
    practice: [
      { target: 2, known: 1, form: 'sum-first' }, { target: 2, known: 1, form: 'ten-first' },
      { target: 3, known: 1, form: 'sum-first' }, { target: 3, known: 2, form: 'ten-first' },
      { target: 4, known: 1, form: 'sum-first' }, { target: 4, known: 3, form: 'ten-first' },
      { target: 5, known: 1, form: 'sum-first' }, { target: 5, known: 4, form: 'ten-first' },
      { target: 6, known: 1, form: 'sum-first' }, { target: 6, known: 5, form: 'ten-first' },
      { target: 7, known: 1, form: 'sum-first' }, { target: 7, known: 6, form: 'ten-first' },
      { target: 8, known: 1, form: 'sum-first' }, { target: 8, known: 7, form: 'ten-first' },
      { target: 9, known: 1, form: 'sum-first' }, { target: 9, known: 8, form: 'ten-first' },
      { target: 10, known: 1, form: 'sum-first' }, { target: 10, known: 9, form: 'ten-first' }
    ],
    final: [
      { target: 2, known: 1, form: 'sum-first' }, { target: 2, known: 1, form: 'ten-first' },
      { target: 3, known: 1, form: 'ten-first' }, { target: 3, known: 2, form: 'sum-first' },
      { target: 4, known: 1, form: 'ten-first' }, { target: 4, known: 3, form: 'sum-first' },
      { target: 5, known: 1, form: 'ten-first' }, { target: 5, known: 4, form: 'sum-first' },
      { target: 6, known: 1, form: 'ten-first' }, { target: 6, known: 5, form: 'sum-first' },
      { target: 7, known: 1, form: 'ten-first' }, { target: 7, known: 6, form: 'sum-first' },
      { target: 8, known: 1, form: 'ten-first' }, { target: 8, known: 7, form: 'sum-first' },
      { target: 9, known: 1, form: 'ten-first' }, { target: 9, known: 8, form: 'sum-first' },
      { target: 10, known: 1, form: 'ten-first' }, { target: 10, known: 9, form: 'sum-first' }
    ]
  };

  const state = {
    screen: 'welcome',
    indexes: { baseline: 0, practice: 0, final: 0 },
    activeQuestions: { baseline: [], practice: [], final: [] },
    stats: { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 },
    practiceAttempts: [],
    answerLocked: false,
    timeoutId: null
  };

  const screens = [...document.querySelectorAll('[data-screen]')];
  const answerValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function questionKey(question) {
    return `${question.target}:${question.known}:${question.form}`;
  }

  function pickMixedQuestions(pool, count, excluded = new Set()) {
    const byTarget = new Map();
    pool.forEach((question) => {
      if (excluded.has(questionKey(question))) return;
      if (!byTarget.has(question.target)) byTarget.set(question.target, []);
      byTarget.get(question.target).push(question);
    });

    return shuffle([...byTarget.values()])
      .map((questionsForTarget) => shuffle(questionsForTarget)[0])
      .slice(0, count);
  }

  function prepareQuestions() {
    const baseline = pickMixedQuestions(questionPools.baseline, 3);
    const practice = pickMixedQuestions(questionPools.practice, 6);
    const practiceKeys = new Set(practice.map(questionKey));
    const final = pickMixedQuestions(questionPools.final, 3, practiceKeys);
    return { baseline, practice, final };
  }

  function showScreen(name) {
    state.screen = name;
    screens.forEach((screen) => {
      const isActive = screen.dataset.screen === name;
      screen.hidden = !isActive;
      screen.setAttribute('aria-hidden', String(!isActive));
    });
    const activeScreen = document.querySelector(`[data-screen="${name}"]`);
    activeScreen?.querySelector('h1')?.focus?.({ preventScroll: true });
  }

  function schedule(callback, delay) {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = window.setTimeout(callback, delay);
  }

  function currentQuestion() {
    return state.activeQuestions[state.screen]?.[state.indexes[state.screen]];
  }

  function correctAnswer(question) {
    return question.target - question.known;
  }

  function renderEquation(container, question) {
    const pieces = question.form === 'ten-first'
      ? [[String(question.target), 'number'], ['=', 'operator'], [String(question.known), 'number'], ['+', 'operator'], ['?', 'missing']]
      : [[String(question.known), 'number'], ['+', 'operator'], ['?', 'missing'], ['=', 'operator'], [String(question.target), 'number']];

    container.setAttribute('aria-label', pieces.map(([text]) => text === '?' ? 'пропуск' : text).join(' '));

    container.replaceChildren(...pieces.map(([text, type]) => {
      const piece = document.createElement('span');
      piece.className = `game__equation-part game__equation-part--${type}`;
      piece.textContent = text;
      if (type === 'missing') piece.setAttribute('aria-label', 'пропущенное число');
      return piece;
    }));
  }

  function createAnswerButtons(container) {
    container.replaceChildren(...answerValues.map((value) => {
      const button = document.createElement('button');
      button.className = 'game__answer';
      button.type = 'button';
      button.textContent = String(value);
      button.setAttribute('aria-label', `Ответ ${value}`);
      button.addEventListener('click', () => handleAnswer(value, button));
      return button;
    }));
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;

    const activeScreen = document.querySelector(`[data-screen="${state.screen}"]`);
    activeScreen.querySelectorAll('[data-equation]').forEach((container) => renderEquation(container, question));
    activeScreen.querySelectorAll('[data-answers]').forEach(createAnswerButtons);
    activeScreen.querySelectorAll('[data-feedback]').forEach((feedback) => {
      feedback.textContent = '';
      feedback.className = 'game__feedback';
    });
    activeScreen.querySelectorAll('[data-question-count]').forEach((count) => {
      count.textContent = `Задание ${state.indexes[state.screen] + 1} из ${state.activeQuestions[state.screen].length}`;
    });

    const hint = activeScreen.querySelector('[data-hint]');
    if (hint) {
      hint.hidden = true;
      activeScreen.querySelector('[data-ten-frame]').replaceChildren();
      activeScreen.querySelector('[data-hint-copy]').textContent = '';
    }
  }

  function updateProgress(completedCount = state.indexes.practice) {
    const rocket = document.querySelector('[data-rocket]');
    const practiceCount = state.activeQuestions.practice.length;
    rocket.style.left = `${Math.min(93, (completedCount / practiceCount) * 93)}%`;
    document.querySelector('[data-progress-label]').textContent = `Энергия: ${completedCount} из ${practiceCount}`;
  }

  function showHint(question, screen) {
    const hint = screen.querySelector('[data-hint]');
    const frame = screen.querySelector('[data-ten-frame]');
    const missingCount = correctAnswer(question);
    hint.hidden = false;
    screen.querySelector('[data-hint-copy]').textContent = `В модели числа ${question.target} уже закрашено ${question.known}. Сколько ещё пустых клеток?`;
    frame.setAttribute('aria-label', `У числа ${question.target}: закрашено ${question.known}, осталось пустыми ${missingCount}`);
    frame.replaceChildren(...Array.from({ length: question.target }, (_, index) => {
      const cell = document.createElement('span');
      const filled = index < question.known;
      cell.className = `game__ten-cell ${filled ? 'game__ten-cell--filled' : 'game__ten-cell--empty'}`;
      cell.setAttribute('aria-hidden', 'true');
      return cell;
    }));
  }

  function setAnswerButtonsDisabled(screen, disabled, selectedButton = null) {
    screen.querySelectorAll('.game__answer').forEach((button) => {
      button.disabled = disabled;
      button.classList.toggle('game__answer--selected', button === selectedButton);
    });
  }

  function nextQuestion() {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = null;
    state.answerLocked = false;
    state.indexes[state.screen] += 1;

    if (state.indexes[state.screen] < state.activeQuestions[state.screen].length) {
      renderQuestion();
      if (state.screen === 'practice') updateProgress();
      return;
    }

    if (state.screen === 'baseline') {
      state.screen = 'practice';
      state.indexes.practice = 0;
      showScreen('practice');
      renderQuestion();
      updateProgress();
    } else if (state.screen === 'practice') {
      state.screen = 'final';
      state.indexes.final = 0;
      showScreen('final');
      renderQuestion();
    } else {
      showResults();
    }
  }

  function handleAnswer(value, button) {
    if (state.answerLocked) return;

    const question = currentQuestion();
    const isCorrect = value === correctAnswer(question);
    const activeScreen = document.querySelector(`[data-screen="${state.screen}"]`);
    const feedback = activeScreen.querySelector('[data-feedback]');

    if (state.screen === 'baseline' || state.screen === 'final') {
      state.answerLocked = true;
      setAnswerButtonsDisabled(activeScreen, true, button);
      if (isCorrect) {
        if (state.screen === 'baseline') state.stats.baselineCorrect += 1;
        else state.stats.finalCorrect += 1;
      }
      feedback.textContent = 'Спасибо! Готово.';
      feedback.classList.add('game__feedback--gentle');
      schedule(nextQuestion, 480);
      return;
    }

    if (isCorrect) {
      state.answerLocked = true;
      setAnswerButtonsDisabled(activeScreen, true, button);
      feedback.textContent = 'Отлично! Энергия для ракеты готова!';
      feedback.classList.add('game__feedback--success');
      if (state.practiceAttempts[state.indexes.practice] === 0) state.stats.practiceFirstTry += 1;
      updateProgress(state.indexes.practice + 1);
      schedule(nextQuestion, 760);
      return;
    }

    state.stats.practiceErrors += 1;
    state.practiceAttempts[state.indexes.practice] += 1;
    state.answerLocked = true;
    setAnswerButtonsDisabled(activeScreen, true, button);
    feedback.textContent = 'Почти! Давай посмотрим на клетки и попробуем ещё.';
    feedback.classList.add('game__feedback--gentle');

    if (state.practiceAttempts[state.indexes.practice] === 1) {
      state.stats.hintsUsed += 1;
      showHint(question, activeScreen);
    }

    schedule(() => {
      state.answerLocked = false;
      setAnswerButtonsDisabled(activeScreen, false);
      const nextButton = activeScreen.querySelector('.game__answer');
      nextButton?.focus({ preventScroll: true });
    }, 380);
  }

  function showResults() {
    document.querySelector('[data-stat="baseline"]').textContent = `${state.stats.baselineCorrect} из ${state.activeQuestions.baseline.length}`;
    document.querySelector('[data-stat="final"]').textContent = `${state.stats.finalCorrect} из ${state.activeQuestions.final.length}`;
    document.querySelector('[data-stat="errors"]').textContent = String(state.stats.practiceErrors);
    document.querySelector('[data-stat="hints"]').textContent = String(state.stats.hintsUsed);
    document.querySelector('[data-stat="first-try"]').textContent = `${state.stats.practiceFirstTry} из ${state.activeQuestions.practice.length}`;
    state.answerLocked = false;
    showScreen('result');
  }

  function resetGame() {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = null;
    state.indexes = { baseline: 0, practice: 0, final: 0 };
    state.activeQuestions = { baseline: [], practice: [], final: [] };
    state.stats = { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 };
    state.practiceAttempts = [];
    state.answerLocked = false;
    showScreen('welcome');
  }

  document.querySelector('[data-action="start"]').addEventListener('click', () => {
    state.indexes.baseline = 0;
    state.activeQuestions = prepareQuestions();
    state.stats = { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 };
    state.practiceAttempts = state.activeQuestions.practice.map(() => 0);
    showScreen('baseline');
    renderQuestion();
  });

  document.querySelector('[data-action="restart"]').addEventListener('click', resetGame);

  showScreen('welcome');
})();
