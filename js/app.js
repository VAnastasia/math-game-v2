(() => {
  const questionPools = {
    baseline: [
      { target: 2, known: 1, form: 'sum-first' },
      { target: 3, known: 1, form: 'sum-first' },
      { target: 4, known: 2, form: 'ten-first' },
      { target: 5, known: 2, form: 'sum-first' },
      { target: 6, known: 3, form: 'ten-first' },
      { target: 7, known: 3, form: 'sum-first' },
      { target: 8, known: 4, form: 'ten-first' },
      { target: 9, known: 4, form: 'sum-first' },
      { target: 10, known: 5, form: 'ten-first' }
    ],
    practice: [
      { target: 2, known: 1, form: 'sum-first' }, { target: 2, known: 1, form: 'ten-first' },
      { target: 3, known: 1, form: 'sum-first' }, { target: 3, known: 2, form: 'ten-first' },
      { target: 4, known: 2, form: 'sum-first' }, { target: 4, known: 2, form: 'ten-first' },
      { target: 5, known: 2, form: 'sum-first' }, { target: 5, known: 3, form: 'ten-first' },
      { target: 6, known: 2, form: 'sum-first' }, { target: 6, known: 3, form: 'ten-first' },
      { target: 7, known: 2, form: 'sum-first' }, { target: 7, known: 3, form: 'ten-first' },
      { target: 8, known: 2, form: 'sum-first' }, { target: 8, known: 3, form: 'ten-first' }, { target: 8, known: 4, form: 'sum-first' },
      { target: 9, known: 3, form: 'sum-first' }, { target: 9, known: 4, form: 'ten-first' },
      { target: 10, known: 2, form: 'sum-first' }, { target: 10, known: 3, form: 'ten-first' }, { target: 10, known: 4, form: 'sum-first' }, { target: 10, known: 5, form: 'ten-first' }
    ],
    final: [
      { target: 2, known: 1, form: 'sum-first' }, { target: 2, known: 1, form: 'ten-first' },
      { target: 3, known: 1, form: 'ten-first' }, { target: 3, known: 2, form: 'sum-first' },
      { target: 4, known: 2, form: 'ten-first' }, { target: 4, known: 2, form: 'sum-first' },
      { target: 5, known: 2, form: 'ten-first' }, { target: 5, known: 3, form: 'sum-first' },
      { target: 6, known: 2, form: 'ten-first' }, { target: 6, known: 3, form: 'sum-first' },
      { target: 7, known: 2, form: 'ten-first' }, { target: 7, known: 3, form: 'sum-first' },
      { target: 8, known: 2, form: 'ten-first' }, { target: 8, known: 3, form: 'sum-first' }, { target: 8, known: 5, form: 'ten-first' },
      { target: 9, known: 3, form: 'ten-first' }, { target: 9, known: 4, form: 'sum-first' },
      { target: 10, known: 2, form: 'ten-first' }, { target: 10, known: 3, form: 'sum-first' }, { target: 10, known: 4, form: 'ten-first' }, { target: 10, known: 5, form: 'sum-first' }
    ]
  };

  const storageKey = 'cosmic-ten-data-v1';

  function loadSavedData() {
    try {
      const rawData = window.localStorage.getItem(storageKey);
      if (!rawData) return { playerName: '', lastReport: null, questionErrors: {} };
      const data = JSON.parse(rawData);
      const questionErrors = {};
      if (data.questionErrors && typeof data.questionErrors === 'object') {
        Object.entries(data.questionErrors).forEach(([key, count]) => {
          if (Number.isInteger(count) && count > 0) questionErrors[key] = count;
        });
      }
      return {
        playerName: typeof data.playerName === 'string' ? data.playerName.slice(0, 24) : '',
        lastReport: data.lastReport && typeof data.lastReport === 'object' ? data.lastReport : null,
        questionErrors
      };
    } catch {
      return { playerName: '', lastReport: null, questionErrors: {} };
    }
  }

  const savedData = loadSavedData();

  const state = {
    screen: 'welcome',
    playerName: savedData.playerName,
    lastReport: savedData.lastReport,
    questionErrors: savedData.questionErrors,
    sessionExamples: {},
    indexes: { baseline: 0, practice: 0, final: 0 },
    activeQuestions: { baseline: [], practice: [], final: [] },
    stats: { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 },
    practiceAttempts: [],
    answerLocked: false,
    timeoutId: null
  };

  const screens = [...document.querySelectorAll('[data-screen]')];
  const answerValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const nameForm = document.querySelector('[data-name-form]');
  const nameInput = document.querySelector('#player-name');

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

  function questionHistoryKey(question) {
    return `${state.playerName.toLocaleLowerCase('ru-RU')}|${questionKey(question)}`;
  }

  function exampleErrorCount(question) {
    return state.questionErrors[questionHistoryKey(question)] || 0;
  }

  function weightedPick(items, getWeight) {
    const totalWeight = items.reduce((total, item) => total + getWeight(item), 0);
    let choice = Math.random() * totalWeight;
    for (const item of items) {
      choice -= getWeight(item);
      if (choice < 0) return item;
    }
    return items[items.length - 1];
  }

  function pickWithoutReplacement(items, count, getWeight) {
    const available = [...items];
    const selected = [];
    while (selected.length < count && available.length) {
      const item = weightedPick(available, getWeight);
      selected.push(item);
      available.splice(available.indexOf(item), 1);
    }
    return selected;
  }

  function pickMixedQuestions(pool, count, excluded = new Set(), prioritizeErrors = false) {
    const byTarget = new Map();
    pool.forEach((question) => {
      if (excluded.has(questionKey(question))) return;
      if (!byTarget.has(question.target)) byTarget.set(question.target, []);
      byTarget.get(question.target).push(question);
    });

    const targetGroups = [...byTarget.values()];
    const selectedGroups = prioritizeErrors
      ? pickWithoutReplacement(targetGroups, count, (questionsForTarget) => {
        const averageErrors = questionsForTarget.reduce((sum, question) => sum + exampleErrorCount(question), 0) / questionsForTarget.length;
        return 1 + Math.min(averageErrors, 4);
      })
      : shuffle(targetGroups).slice(0, count);

    return selectedGroups.map((questionsForTarget) => prioritizeErrors
      ? weightedPick(questionsForTarget, (question) => 1 + Math.min(exampleErrorCount(question), 4))
      : shuffle(questionsForTarget)[0]);
  }

  function prepareQuestions() {
    const baseline = pickMixedQuestions(questionPools.baseline, 3);
    const practice = pickMixedQuestions(questionPools.practice, 6, new Set(), true);
    const practiceKeys = new Set(practice.map(questionKey));
    const final = pickMixedQuestions(questionPools.final, 3, practiceKeys);
    return { baseline, practice, final };
  }

  function saveData() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        playerName: state.playerName,
        lastReport: state.lastReport,
        questionErrors: state.questionErrors
      }));
      return true;
    } catch {
      return false;
    }
  }

  function personalizeTexts() {
    document.querySelectorAll('[data-player-text]').forEach((element) => {
      element.textContent = element.dataset.playerText.replace(/%name%/g, state.playerName);
    });
  }

  function startSession() {
    state.indexes = { baseline: 0, practice: 0, final: 0 };
    state.activeQuestions = prepareQuestions();
    state.stats = { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 };
    state.practiceAttempts = state.activeQuestions.practice.map(() => 0);
    state.sessionExamples = {};
    Object.values(state.activeQuestions).flat().forEach((question) => {
      const key = questionKey(question);
      if (!state.sessionExamples[key]) {
        state.sessionExamples[key] = { ...question, errors: 0 };
      }
    });
    personalizeTexts();
    showScreen('baseline');
    renderQuestion();
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

  function equationText(question) {
    return question.form === 'ten-first'
      ? `${question.target} = ${question.known} + ?`
      : `${question.known} + ? = ${question.target}`;
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

    if (!isCorrect) {
      const key = questionKey(question);
      const historyKey = questionHistoryKey(question);
      state.questionErrors[historyKey] = exampleErrorCount(question) + 1;
      state.sessionExamples[key].errors += 1;
      saveData();
    }

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

  function renderReport(report) {
    document.querySelector('[data-stat="baseline"]').textContent = `${report.baselineCorrect} из ${report.baselineTotal} заданий`;
    document.querySelector('[data-stat="final"]').textContent = `${report.finalCorrect} из ${report.finalTotal} заданий`;
    document.querySelector('[data-stat="errors"]').textContent = String(report.practiceErrors);
    document.querySelector('[data-stat="hints"]').textContent = String(report.hintsUsed);
    document.querySelector('[data-stat="first-try"]').textContent = `${report.practiceFirstTry} из ${report.practiceTotal} заданий`;
    document.querySelector('[data-stat="total"]').textContent = String(report.baselineTotal + report.practiceTotal + report.finalTotal);
    const exampleList = document.querySelector('[data-example-stats]');
    exampleList.replaceChildren(...report.exampleErrors.map((example) => {
      const item = document.createElement('li');
      const equation = document.createElement('span');
      const counts = document.createElement('span');
      equation.textContent = example.equation;
      counts.textContent = `В занятии: ${example.sessionErrors}; всего: ${example.totalErrors}`;
      item.append(equation, counts);
      return item;
    }));
  }

  function showResults() {
    state.lastReport = {
      playerName: state.playerName,
      baselineCorrect: state.stats.baselineCorrect,
      baselineTotal: state.activeQuestions.baseline.length,
      finalCorrect: state.stats.finalCorrect,
      finalTotal: state.activeQuestions.final.length,
      practiceErrors: state.stats.practiceErrors,
      hintsUsed: state.stats.hintsUsed,
      practiceFirstTry: state.stats.practiceFirstTry,
      practiceTotal: state.activeQuestions.practice.length,
      exampleErrors: Object.values(state.sessionExamples).map((example) => ({
        equation: equationText(example),
        sessionErrors: example.errors,
        totalErrors: exampleErrorCount(example)
      }))
    };
    saveData();
    renderReport(state.lastReport);
    document.querySelector('[data-share-status]').textContent = '';
    const shareFallback = document.querySelector('[data-share-fallback]');
    shareFallback.hidden = true;
    shareFallback.value = '';
    state.answerLocked = false;
    showScreen('result');
  }

  function reportText(report) {
    return [
      'Числонавты — миссия «Космическая десятка» — отчёт занятия',
      `Имя: ${report.playerName}`,
      `Проверка до практики: верно решено ${report.baselineCorrect} из ${report.baselineTotal} заданий`,
      `Проверка после практики: верно решено ${report.finalCorrect} из ${report.finalTotal} заданий`,
      `Ошибки во время практики: ${report.practiceErrors}`,
      `Использовано подсказок: ${report.hintsUsed}`,
      `Практика с первой попытки: решено ${report.practiceFirstTry} из ${report.practiceTotal} заданий`,
      `Всего заданий за занятие: ${report.baselineTotal + report.practiceTotal + report.finalTotal}`,
      'Ошибки по примерам:',
      ...report.exampleErrors.map((example) => `${example.equation} — в занятии: ${example.sessionErrors}, всего: ${example.totalErrors}`),
      'Результаты одного занятия не показывают полного освоения темы.'
    ].join('\n');
  }

  function showManualShareFallback(text, status) {
    const fallback = document.querySelector('[data-share-fallback]');
    fallback.value = text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    status.textContent = 'Выдели текст отчёта и скопируй его, чтобы поделиться.';
  }

  async function shareReport() {
    const report = state.lastReport;
    if (!report) return;

    const text = reportText(report);
    const status = document.querySelector('[data-share-status]');
    const shareFallback = document.querySelector('[data-share-fallback]');
    shareFallback.hidden = true;
    status.textContent = '';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Числонавты — Космическая десятка — отчёт занятия', text });
        status.textContent = 'Отчёт отправлен.';
        return;
      } catch (error) {
        if (error.name === 'AbortError') {
          status.textContent = 'Отправка отчёта отменена.';
          return;
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Отчёт скопирован. Теперь его можно отправить.';
        return;
      } catch {
        // If clipboard access is unavailable, show selectable text below.
      }
    }

    showManualShareFallback(text, status);
  }

  function resetGame() {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = null;
    state.indexes = { baseline: 0, practice: 0, final: 0 };
    state.activeQuestions = { baseline: [], practice: [], final: [] };
    state.stats = { baselineCorrect: 0, finalCorrect: 0, practiceErrors: 0, hintsUsed: 0, practiceFirstTry: 0 };
    state.practiceAttempts = [];
    state.answerLocked = false;
    nameInput.value = state.playerName;
    showScreen('welcome');
  }

  document.querySelector('[data-action="start"]').addEventListener('click', () => {
    nameInput.value = state.playerName;
    document.querySelector('[data-name-error]').textContent = '';
    document.querySelector('[data-name-title]').textContent = state.playerName ? `С возвращением, ${state.playerName}!` : 'Как тебя зовут?';
    showScreen('name');
  });

  nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const playerName = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, 24);
    const error = document.querySelector('[data-name-error]');
    if (!playerName) {
      error.textContent = 'Напиши своё имя, чтобы мы знали, кого звать в полёт.';
      nameInput.focus();
      return;
    }

    state.playerName = playerName;
    saveData();
    error.textContent = '';
    startSession();
  });

  document.querySelector('[data-action="restart"]').addEventListener('click', resetGame);
  document.querySelector('[data-action="share-report"]').addEventListener('click', shareReport);

  nameInput.value = state.playerName;
  showScreen('welcome');
})();
