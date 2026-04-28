// ============================================================
// AI App Builder Challenge — Game Script
// ============================================================

// ── Constants ─────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  Beginner:     { time: 25, bonus: 0,  practice: false },
  Intermediate: { time: 18, bonus: 25, practice: false },
  Advanced:     { time: 12, bonus: 50, practice: false },
  Practice:     { time: 0,  bonus: 0,  practice: true  }
};

const BADGES = [
  { min: 0,  max: 3,  name: 'AI Rookie',       icon: '🔰' },
  { min: 4,  max: 6,  name: 'Prompt Explorer',  icon: '🔍' },
  { min: 7,  max: 8,  name: 'AI App Developer', icon: '💻' },
  { min: 9,  max: 10, name: 'AI Architect',      icon: '🏗️' }
];

// ── Game State ─────────────────────────────────────────────────
let state = {
  questions:    [],
  currentIndex: 0,
  score:        0,
  correctCount: 0,
  wrongCount:   0,
  streak:       0,
  maxStreak:    0,
  answerHistory: [],
  selectedLevel:      '',
  selectedDifficulty: '',
  timer:    null,
  timeLeft: 0,
  maxTime:  0,
  answered: false,
  powerUps: { fiftyFifty: true, extraTime: true, hint: true },
  scoreSaved: false,
  roundStartTime: null
};

// ── DOM Helpers ────────────────────────────────────────────────
const screens = {
  start:   document.getElementById('start-screen'),
  game:    document.getElementById('game-screen'),
  results: document.getElementById('results-screen')
};
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

// ── Shuffle (Fisher-Yates) ─────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════
// SOUND — Web Audio API + toggle
// ══════════════════════════════════════════════════════════════

let soundEnabled = localStorage.getItem('aiChallenge_sound') !== 'off';

function applySoundToggleUI() {
  const btn = $('sound-toggle');
  if (!btn) return;
  btn.textContent = soundEnabled ? '🔊' : '🔇';
  btn.classList.toggle('sound-muted', !soundEnabled);
  btn.setAttribute('title', soundEnabled ? 'Mute sounds' : 'Unmute sounds');
}

$('sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('aiChallenge_sound', soundEnabled ? 'on' : 'off');
  applySoundToggleUI();
});

applySoundToggleUI(); // apply saved preference immediately

let _audioCtx = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const note = (freq, start, dur, wave = 'sine', vol = 0.12) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    };

    if      (type === 'correct')  { note(440,0,0.12); note(554,0.1,0.12); note(659,0.2,0.22); }
    else if (type === 'streak')   { note(659,0,0.08); note(880,0.08,0.08); note(1100,0.16,0.18); }
    else if (type === 'wrong')    { note(300,0,0.15,'sawtooth',0.1); note(200,0.12,0.25,'sawtooth',0.08); }
    else if (type === 'tick')     { note(900,0,0.05,'sine',0.04); }
    else if (type === 'complete') { [523,659,784,1047].forEach((f,i) => note(f, i*0.13, 0.28,'sine',0.1)); }
  } catch (_) { /* audio not available */ }
}

// ══════════════════════════════════════════════════════════════
// SESSION PERSISTENCE — localStorage
// ══════════════════════════════════════════════════════════════

const SESSION_KEY = 'aiChallenge_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // discard sessions older than 24 h

function saveSession() {
  if (!state.questions.length) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    questions:          state.questions,
    currentIndex:       state.currentIndex,
    score:              state.score,
    correctCount:       state.correctCount,
    wrongCount:         state.wrongCount,
    streak:             state.streak,
    maxStreak:          state.maxStreak,
    answerHistory:      state.answerHistory,
    selectedLevel:      state.selectedLevel,
    selectedDifficulty: state.selectedDifficulty,
    powerUps:           state.powerUps,
    scoreSaved:         state.scoreSaved,
    roundStartTime:     state.roundStartTime,
    savedAt:            Date.now()
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getSavedSession() {
  try {
    const raw  = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > SESSION_TTL) { clearSession(); return null; }
    return data;
  } catch { clearSession(); return null; }
}

function checkForSession() {
  const session = getSavedSession();
  if (!session) return;
  const qNum = session.currentIndex + 1;
  $('resume-meta').textContent  = `${session.selectedLevel} · ${session.selectedDifficulty} · Q${qNum}/10 · ${session.score} pts`;
  $('resume-banner').style.display = 'flex';
}

function resumeSession() {
  const session = getSavedSession();
  if (!session) return;

  Object.assign(state, {
    questions:          session.questions,
    currentIndex:       session.currentIndex,
    score:              session.score,
    correctCount:       session.correctCount,
    wrongCount:         session.wrongCount,
    streak:             session.streak,
    maxStreak:          session.maxStreak,
    answerHistory:      session.answerHistory,
    selectedLevel:      session.selectedLevel,
    selectedDifficulty: session.selectedDifficulty,
    powerUps:           session.powerUps,
    scoreSaved:         session.scoreSaved,
    roundStartTime:     session.roundStartTime || Date.now(),
    answered:           false
  });

  $('active-level-badge').textContent = state.selectedLevel;
  $('active-diff-badge').textContent  = state.selectedDifficulty;
  $('score-display').textContent      = state.score;
  $('correct-count').textContent      = state.correctCount;
  $('wrong-count').textContent        = state.wrongCount;

  $('pu-fifty').disabled = !state.powerUps.fiftyFifty;
  $('pu-time').disabled  = !state.powerUps.extraTime;
  $('pu-hint').disabled  = !state.powerUps.hint;

  // Restore practice-mode UI state
  const isPractice = DIFFICULTY_CONFIG[state.selectedDifficulty] &&
                     DIFFICULTY_CONFIG[state.selectedDifficulty].practice;
  if (isPractice) {
    $('game-screen').classList.add('practice-mode');
    $('pu-time').style.display = 'none';
  } else {
    $('game-screen').classList.remove('practice-mode');
    $('pu-time').style.display = '';
  }

  updateStreakUI();
  showScreen('game');
  loadQuestion();
}

// ══════════════════════════════════════════════════════════════
// LEVEL PROGRESS — localStorage
// ══════════════════════════════════════════════════════════════

function getProgress() {
  try { return JSON.parse(localStorage.getItem('aiChallenge_progress') || '{}'); }
  catch { return {}; }
}

function saveProgress(level, difficulty, score, accuracy) {
  const p = getProgress();
  if (!p[level]) p[level] = {};
  const prev = p[level][difficulty];
  if (!prev || score > prev.score) {
    p[level][difficulty] = { score, accuracy, completed: accuracy >= 70 };
  }
  localStorage.setItem('aiChallenge_progress', JSON.stringify(p));
}

function updateLevelCards() {
  const p = getProgress();
  $$('.level-card').forEach(card => {
    const lp  = p[card.dataset.level];
    const old = card.querySelector('.lc-progress');
    if (old) old.remove();
    if (!lp) return;
    const done = Object.values(lp).some(d => d.completed);
    const best = Object.values(lp).reduce((m, d) => d.score > m ? d.score : m, 0);
    const span = document.createElement('span');
    span.className   = `lc-progress ${done ? 'lc-done' : 'lc-tried'}`;
    span.textContent = done ? '✓' : `${best}`;
    card.appendChild(span);
  });
}

// ══════════════════════════════════════════════════════════════
// ORB STATE
// ══════════════════════════════════════════════════════════════

const ORB_CAPTIONS = {
  idle:     'AI is ready',
  speaking: 'Processing…',
  thinking: 'Running out of time!',
  correct:  'Correct!',
  wrong:    'Wrong answer'
};

function setOrbState(s) {
  const orb = $('game-orb');
  if (!orb) return;
  orb.setAttribute('data-state', s);
  const cap = $('orb-caption');
  if (cap) cap.textContent = ORB_CAPTIONS[s] || '';
}

// ══════════════════════════════════════════════════════════════
// STREAK UI
// ══════════════════════════════════════════════════════════════

function updateStreakUI() {
  const el = $('streak-display');
  if (!el) return;
  if (state.streak >= 2) {
    el.style.display = 'flex';
    $('streak-num').textContent = state.streak;
    el.className = `streak-pill${state.streak >= 5 ? ' streak-hot' : ''}`;
  } else {
    el.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════
// START SCREEN
// ══════════════════════════════════════════════════════════════

$$('.level-card').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.level-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.selectedLevel = btn.dataset.level;
    updateStartButton();
  });
});

$$('.diff-card').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.diff-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.selectedDifficulty = btn.dataset.difficulty;
    updateStartButton();
  });
});

function updateStartButton() {
  const btn  = $('start-btn');
  const text = $('start-btn-text');
  if (state.selectedLevel && state.selectedDifficulty) {
    btn.disabled     = false;
    text.textContent = `Start — ${state.selectedLevel} · ${state.selectedDifficulty}`;
  } else {
    btn.disabled     = true;
    text.textContent = 'Select Level & Difficulty';
  }
}

$('start-btn').addEventListener('click', startGame);
$('open-lb-btn').addEventListener('click', () => openLeaderboardModal());
$('resume-btn').addEventListener('click', resumeSession);
$('discard-btn').addEventListener('click', () => {
  clearSession();
  $('resume-banner').style.display = 'none';
});

// ══════════════════════════════════════════════════════════════
// GAME INIT
// ══════════════════════════════════════════════════════════════

async function startGame() {
  if (!state.selectedLevel || !state.selectedDifficulty) return;

  // Show loading state
  const btn     = $('start-btn');
  const spinner = $('start-btn-spinner');
  const arrow   = $('start-btn-arrow');
  const text    = $('start-btn-text');
  btn.classList.add('loading');
  if (spinner) spinner.style.display = 'inline-block';
  if (arrow)   arrow.style.display   = 'none';
  text.textContent = 'Loading questions…';

  const isPractice = DIFFICULTY_CONFIG[state.selectedDifficulty].practice;

  try {
    // Practice mode: fetch ALL difficulties for the level for more variety
    const diff = isPractice ? '' : `&difficulty=${encodeURIComponent(state.selectedDifficulty)}`;
    const url  = `/api/questions?level=${encodeURIComponent(state.selectedLevel)}${diff}`;
    const data = await fetch(url).then(r => r.json());
    if (!data || data.length === 0) {
      alert(`No questions found for "${state.selectedLevel}". Please try another level.`);
      return;
    }
    state.questions = shuffle(data).slice(0, 10);
  } catch (err) {
    alert('Could not load questions. Make sure the server is running.');
    console.error(err);
    return;
  } finally {
    // Restore button state
    btn.classList.remove('loading');
    if (spinner) spinner.style.display = 'none';
    if (arrow)   arrow.style.display   = '';
    updateStartButton();
  }

  // Reset round state
  Object.assign(state, {
    currentIndex: 0, score: 0, correctCount: 0, wrongCount: 0,
    streak: 0, maxStreak: 0, answerHistory: [], scoreSaved: false,
    powerUps: { fiftyFifty: true, extraTime: true, hint: true },
    roundStartTime: Date.now()
  });

  $('active-level-badge').textContent = state.selectedLevel;
  $('active-diff-badge').textContent  = state.selectedDifficulty;
  $('score-display').textContent      = '0';
  $('correct-count').textContent      = '0';
  $('wrong-count').textContent        = '0';

  ['pu-fifty', 'pu-time', 'pu-hint'].forEach(id => {
    $(id).disabled = false;
    $(id).classList.remove('used');
  });

  // Hide +5 sec power-up in practice mode (no timer)
  $('pu-time').style.display = isPractice ? 'none' : '';

  // Add/remove practice-mode class to hide timer circle
  if (isPractice) {
    $('game-screen').classList.add('practice-mode');
  } else {
    $('game-screen').classList.remove('practice-mode');
  }

  const sd = $('streak-display');
  if (sd) sd.style.display = 'none';

  showScreen('game');
  loadQuestion();
}

// ══════════════════════════════════════════════════════════════
// QUESTION LOADING
// ══════════════════════════════════════════════════════════════

function loadQuestion() {
  saveSession(); // persist state at the start of every question
  const q = state.questions[state.currentIndex];
  state.answered = false;

  const num      = state.currentIndex + 1;
  const progress = (num / state.questions.length) * 100;
  $('progress-fill').style.width  = `${progress}%`;
  $('progress-label').textContent = `Question ${num} of ${state.questions.length}`;
  $('q-num').textContent          = `Question ${num}`;
  $('q-cat').textContent          = q.level;
  $('q-text').textContent         = q.question_text;

  $('opt-a-text').textContent = q.option_a;
  $('opt-b-text').textContent = q.option_b;
  $('opt-c-text').textContent = q.option_c;
  $('opt-d-text').textContent = q.option_d;

  ['opt-a','opt-b','opt-c','opt-d'].forEach(id => {
    const btn = $(id);
    btn.disabled = false;
    btn.classList.remove('correct','wrong','eliminated');
    const lbl = btn.querySelector('.opt-label');
    if (lbl) { lbl.style.background = ''; lbl.style.borderColor = ''; lbl.style.color = ''; }
  });

  $('hint-box').style.display      = 'none';
  $('hint-text').textContent       = '';
  $('feedback-area').style.display = 'none';

  // Reset flag button for this question
  const flagBtn = $('flag-btn');
  if (flagBtn) {
    flagBtn.disabled    = false;
    flagBtn.textContent = '⚑ Report issue';
    flagBtn.classList.remove('flagged');
  }

  setOrbState('idle');
  startTimer();
}

// ══════════════════════════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════════════════════════

function startTimer() {
  clearInterval(state.timer);
  const cfg = DIFFICULTY_CONFIG[state.selectedDifficulty];

  // Practice mode: no countdown
  if (cfg.practice) {
    state.maxTime  = 0;
    state.timeLeft = 0;
    $('timer-num').textContent           = '∞';
    $('timer-bar').style.strokeDasharray = '100 100';
    return;
  }

  state.maxTime  = cfg.time;
  state.timeLeft = cfg.time;
  updateTimerUI();

  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimerUI();
    if (state.timeLeft > 0 && state.timeLeft <= 5) playSound('tick');
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      if (!state.answered) handleTimeout();
    }
  }, 1000);
}

function stopTimer() { clearInterval(state.timer); }

function updateTimerUI() {
  const pct = state.timeLeft / state.maxTime;
  $('timer-num').textContent            = state.timeLeft;
  $('timer-bar').style.strokeDasharray  = `${pct * 100} 100`;

  if (state.timeLeft <= 5) {
    $('timer-bar').style.stroke    = 'hsl(0 82% 62%)';
    $('timer-num').style.color     = 'hsl(0 82% 62%)';
    setOrbState('thinking');
  } else if (state.timeLeft <= 10) {
    $('timer-bar').style.stroke    = 'hsl(40 95% 58%)';
    $('timer-num').style.color     = 'hsl(40 95% 58%)';
  } else {
    $('timer-bar').style.stroke    = '';
    $('timer-num').style.color     = '';
  }
}

function resetTimerColor() {
  $('timer-bar').style.stroke           = '';
  $('timer-num').style.color            = '';
  $('timer-bar').style.strokeDasharray  = '100 100';
}

// ══════════════════════════════════════════════════════════════
// ANSWER HANDLING
// ══════════════════════════════════════════════════════════════

$$('.opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.answered) return;
    handleAnswer(btn.dataset.opt);
  });
});

// Keyboard shortcuts: A/B/C/D to answer, Enter/Space for next
document.addEventListener('keydown', e => {
  if (!screens.game.classList.contains('active')) return;

  if (!state.answered) {
    const key = e.key.toUpperCase();
    if (['A','B','C','D'].includes(key)) {
      const btn = $(`opt-${key.toLowerCase()}`);
      if (btn && !btn.disabled && !btn.classList.contains('eliminated')) handleAnswer(key);
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const nb = $('next-btn');
    if (nb && $('feedback-area').style.display !== 'none') nb.click();
  }
});

function handleAnswer(selectedOption) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q       = state.questions[state.currentIndex];
  const correct = q.correct_option.toUpperCase();
  const isRight = selectedOption === correct;

  // Record for post-game review
  state.answerHistory.push({
    question: q.question_text,
    option_a: q.option_a, option_b: q.option_b,
    option_c: q.option_c, option_d: q.option_d,
    correctOption: correct, selectedOption, isCorrect: isRight,
    explanation: q.explanation
  });

  highlightOptions(selectedOption, correct);

  if (isRight) {
    state.streak++;
    state.maxStreak = Math.max(state.maxStreak, state.streak);

    const cfg         = DIFFICULTY_CONFIG[state.selectedDifficulty];
    const timeBonus   = cfg.practice ? 0 : state.timeLeft * 5;
    const diffBonus   = cfg.bonus;
    const streakBonus = state.streak >= 3 ? (state.streak - 2) * 20 : 0;
    const points      = cfg.practice ? 0 : 100 + timeBonus + diffBonus + streakBonus;

    state.score        += points;
    state.correctCount += 1;
    $('score-display').textContent = state.score;
    $('correct-count').textContent = state.correctCount;

    setOrbState('correct');
    updateStreakUI();

    const streakLabel = streakBonus > 0 ? `  🔥×${state.streak} +${streakBonus} bonus` : '';
    showFeedback('correct', `✓ Correct! +${points} pts${streakLabel}`, q.explanation);
    playSound(state.streak >= 3 ? 'streak' : 'correct');
    showCelebration();
  } else {
    state.streak = 0;
    state.wrongCount += 1;
    $('wrong-count').textContent = state.wrongCount;

    setOrbState('wrong');
    updateStreakUI();
    showFeedback('wrong', `✗ Wrong! The answer was ${correct}`, q.explanation);
    playSound('wrong');
  }
}

function handleTimeout() {
  state.answered   = true;
  state.streak     = 0;
  state.wrongCount += 1;
  $('wrong-count').textContent = state.wrongCount;

  const q       = state.questions[state.currentIndex];
  const correct = q.correct_option.toUpperCase();

  state.answerHistory.push({
    question: q.question_text,
    option_a: q.option_a, option_b: q.option_b,
    option_c: q.option_c, option_d: q.option_d,
    correctOption: correct, selectedOption: null, isCorrect: false,
    explanation: q.explanation
  });

  $(`opt-${correct.toLowerCase()}`).classList.add('correct');
  ['opt-a','opt-b','opt-c','opt-d'].forEach(id => $(id).disabled = true);

  setOrbState('wrong');
  updateStreakUI();
  showFeedback('timeout', `⏱ Time's up! The answer was ${correct}`, q.explanation);
  playSound('wrong');
}

function highlightOptions(selected, correct) {
  ['opt-a','opt-b','opt-c','opt-d'].forEach(id => $(id).disabled = true);
  if (selected === correct) {
    $(`opt-${selected.toLowerCase()}`).classList.add('correct');
  } else {
    $(`opt-${selected.toLowerCase()}`).classList.add('wrong');
    $(`opt-${correct.toLowerCase()}`).classList.add('correct');
  }
}

function showFeedback(type, headline, explanation) {
  const banner       = $('feedback-banner');
  banner.textContent = headline;
  banner.className   = `feedback-banner ${type}-banner`;
  $('mentor-text').textContent     = explanation;
  $('feedback-area').style.display = 'block';
  setTimeout(() => $('feedback-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

// ══════════════════════════════════════════════════════════════
// NEXT QUESTION / END
// ══════════════════════════════════════════════════════════════

$('next-btn').addEventListener('click', advanceQuestion);

function advanceQuestion() {
  state.currentIndex++;
  resetTimerColor();
  if (state.currentIndex >= state.questions.length) showResults();
  else loadQuestion();
}

// ── Restart button ─────────────────────────────────────────────
$('reset-btn').addEventListener('click', () => {
  if (!confirm('Restart the game? Your current progress will be lost.')) return;
  stopTimer();
  clearSession();
  state.answered = false;
  showScreen('start');
  loadLeaderboardPreview();
});

// ══════════════════════════════════════════════════════════════
// POWER-UPS
// ══════════════════════════════════════════════════════════════

$('pu-fifty').addEventListener('click', () => {
  if (!state.powerUps.fiftyFifty || state.answered) return;
  state.powerUps.fiftyFifty = false;
  $('pu-fifty').disabled = true;

  const correct   = state.questions[state.currentIndex].correct_option.toUpperCase();
  const wrongOpts = ['A','B','C','D'].filter(o => o !== correct);
  shuffle(wrongOpts).slice(0, 2).forEach(opt => {
    $(`opt-${opt.toLowerCase()}`).classList.add('eliminated');
    $(`opt-${opt.toLowerCase()}`).disabled = true;
  });
});

$('pu-time').addEventListener('click', () => {
  if (!state.powerUps.extraTime || state.answered) return;
  state.powerUps.extraTime = false;
  $('pu-time').disabled = true;
  state.timeLeft = Math.min(state.timeLeft + 5, state.maxTime);
  updateTimerUI();
});

$('pu-hint').addEventListener('click', async () => {
  if (!state.powerUps.hint || state.answered) return;
  state.powerUps.hint = false;
  $('pu-hint').disabled = true;

  const q        = state.questions[state.currentIndex];
  const hintBox  = $('hint-box');
  const hintText = $('hint-text');

  // Show immediately with a "thinking" state
  hintBox.className  = 'hint-card';
  hintBox.style.display = 'flex';
  hintText.className = 'hint-thinking';
  hintText.textContent = '✦ AI is thinking…';

  try {
    const res = await fetch('/api/ai-hint', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        question_text: q.question_text,
        option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d,
        level: q.level, difficulty: q.difficulty
      })
    });

    if (!res.ok) throw new Error('not ok');
    const data = await res.json();

    hintText.className   = '';
    hintText.textContent = data.hint;
    if (data.source === 'ai') hintBox.classList.add('hint-ai');

  } catch (_) {
    // Graceful fallback to static hint
    hintText.className   = '';
    hintText.textContent = q.hint;
  }
});

// ══════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ══════════════════════════════════════════════════════════════

function showResults() {
  stopTimer();
  clearSession(); // game over — no need to resume

  const { score, correctCount, wrongCount, selectedLevel, selectedDifficulty, maxStreak } = state;
  const total      = state.questions.length;
  const accuracy   = Math.round((correctCount / total) * 100);
  const badge      = BADGES.find(b => correctCount >= b.min && correctCount <= b.max) || BADGES[0];
  const passed     = accuracy >= 70;
  const isPractice = DIFFICULTY_CONFIG[selectedDifficulty] && DIFFICULTY_CONFIG[selectedDifficulty].practice;

  // Persist best score (skip for practice)
  if (!isPractice) saveProgress(selectedLevel, selectedDifficulty, score, accuracy);
  updateLevelCards();

  // Round time
  const roundSecs = state.roundStartTime ? Math.round((Date.now() - state.roundStartTime) / 1000) : 0;
  const roundMin  = Math.floor(roundSecs / 60);
  const roundSec  = roundSecs % 60;
  const timeRow   = $('res-time-row');
  if (timeRow) {
    timeRow.style.display   = 'flex';
    $('res-time').textContent = `${roundMin}:${String(roundSec).padStart(2, '0')}`;
  }

  // Populate stats
  $('badge-name').textContent           = isPractice ? 'Practice Complete!' : badge.name;
  $('badge-icon').textContent           = isPractice ? '🎓' : badge.icon;
  $('badge-ring').style.display         = 'flex';
  $('res-score').textContent            = isPractice ? '—' : score;
  $('res-correct').textContent          = `${correctCount}/${total}`;
  $('res-accuracy').textContent         = `${accuracy}%`;
  $('res-correct-meta').textContent     = `${correctCount} correct`;
  $('res-wrong-meta').textContent       = `${wrongCount} wrong`;
  $('res-level-badge').textContent      = selectedLevel;
  $('res-diff-badge').textContent       = selectedDifficulty;

  // Pass / fail banner
  const pf = $('pass-fail-banner');
  if (isPractice) {
    pf.textContent = '🎓 Practice session complete';
    pf.className   = 'pass-fail-banner pass';
  } else {
    pf.textContent = passed ? 'Level Complete! ✓' : 'Review this level and try again';
    pf.className   = `pass-fail-banner ${passed ? 'pass' : 'fail'}`;
  }

  // Streak row
  const sr = $('res-streak-row');
  if (sr) {
    sr.style.display = maxStreak >= 3 ? 'flex' : 'none';
    $('res-streak').textContent = `🔥 ${maxStreak}`;
  }

  // Rank row — hide until score is saved
  const rankRow = $('res-rank-row');
  if (rankRow) rankRow.style.display = 'none';

  // Hide review section until toggled
  const rv = $('review-section');
  if (rv) rv.style.display = 'none';
  $('review-btn').textContent = '📋 Review Answers';

  // Re-arm save button; hide in practice mode (nothing to save)
  $('save-score-btn').textContent = '💾 Save Score';
  $('save-score-btn').disabled    = false;
  $('save-score-btn').style.display = isPractice ? 'none' : '';
  $('share-score-btn').style.display = isPractice ? 'none' : '';

  playSound(passed ? 'complete' : 'wrong');

  // Confetti burst on perfect score (10/10)
  if (correctCount === total && !isPractice) {
    showScreen('results');
    launchConfetti();
  } else {
    showScreen('results');
  }
}

// ── Results buttons ────────────────────────────────────────────
$('save-score-btn').addEventListener('click', () => {
  if (state.scoreSaved) { alert('Score already saved!'); return; }
  openSaveModal();
});
$('view-lb-res-btn').addEventListener('click', () => openLeaderboardModal());
$('play-again-btn').addEventListener('click', () => { clearSession(); showScreen('start'); loadLeaderboardPreview(); });

$('review-btn').addEventListener('click', () => {
  const section = $('review-section');
  const btn     = $('review-btn');
  const hidden  = section.style.display === 'none' || !section.style.display;
  if (hidden) {
    renderReview();
    section.style.display = 'block';
    btn.textContent = '📋 Hide Review';
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  } else {
    section.style.display = 'none';
    btn.textContent = '📋 Review Answers';
  }
});

// ── Answer Review renderer ─────────────────────────────────────
function renderReview() {
  const list = $('review-list');
  if (!list) return;

  list.innerHTML = state.answerHistory.map((h, i) => {
    const opts = ['A','B','C','D'].map(opt => {
      const isCorrect  = opt === h.correctOption;
      const isSelected = opt === h.selectedOption && !h.isCorrect;
      const cls = isCorrect ? 'review-opt-correct' : isSelected ? 'review-opt-wrong' : '';
      return `<div class="review-opt ${cls}">
        <span class="review-opt-letter">${opt}</span>
        <span>${escapeHtml(h[`option_${opt.toLowerCase()}`])}</span>
      </div>`;
    }).join('');

    const status = h.selectedOption === null ? '⏱ Timed out'
                 : h.isCorrect ? '✓ Correct' : '✗ Wrong';
    const statusCls = h.isCorrect ? 'ri-status-correct' : 'ri-status-wrong';

    return `<div class="review-item ${h.isCorrect ? 'ri-correct' : 'ri-wrong'}">
      <div class="review-item-header">
        <span class="ri-num">Q${i + 1}</span>
        <span class="ri-status ${statusCls}">${status}</span>
      </div>
      <p class="ri-question">${escapeHtml(h.question)}</p>
      <div class="ri-opts">${opts}</div>
      <p class="ri-explanation">${escapeHtml(h.explanation)}</p>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// SAVE SCORE MODAL
// ══════════════════════════════════════════════════════════════

function openSaveModal() {
  const saved = localStorage.getItem('aiChallenge_playerName') || '';
  $('player-name-input').value = saved;
  $('save-modal').style.display = 'flex';
  setTimeout(() => {
    const input = $('player-name-input');
    input.focus();
    if (saved) input.select(); // highlight so they can replace it easily
  }, 100);
}
function closeSaveModal() { $('save-modal').style.display = 'none'; }

$('cancel-save-btn').addEventListener('click', closeSaveModal);

$('confirm-save-btn').addEventListener('click', async () => {
  const name = $('player-name-input').value.trim();
  if (!name) { $('player-name-input').style.borderColor = 'var(--red)'; return; }
  $('player-name-input').style.borderColor = '';

  const { score, correctCount, selectedLevel, selectedDifficulty, questions } = state;
  const accuracy = Math.round((correctCount / questions.length) * 100);

  try {
    await fetch('/api/scores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: name, score, correct_answers: correctCount, accuracy, level: selectedLevel, difficulty: selectedDifficulty })
    });
    localStorage.setItem('aiChallenge_playerName', name);
    state.scoreSaved = true;
    $('save-score-btn').textContent = '✅ Score Saved';
    $('save-score-btn').disabled    = true;
    closeSaveModal();

    // Fetch and display rank
    try {
      const rankData  = await fetch(`/api/leaderboard/rank?score=${score}`).then(r => r.json());
      const rankRow   = $('res-rank-row');
      if (rankRow) {
        rankRow.style.display   = 'flex';
        $('res-rank').textContent = `#${rankData.rank} of ${rankData.total}`;
      }
    } catch (_) { /* rank fetch failed — no big deal */ }

    openLeaderboardModal();
  } catch (err) {
    alert('Could not save score. Please try again.');
    console.error(err);
  }
});

$('player-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('confirm-save-btn').click();
});

// ══════════════════════════════════════════════════════════════
// LEADERBOARD MODAL
// ══════════════════════════════════════════════════════════════

async function openLeaderboardModal() {
  $('lb-table-content').innerHTML = '<p class="lb-empty">Loading…</p>';
  $('lb-modal').style.display = 'flex';
  try {
    const scores = await fetch('/api/leaderboard').then(r => r.json());
    renderLeaderboardTable(scores, 'lb-table-content');
  } catch {
    $('lb-table-content').innerHTML = '<p class="lb-empty">Could not load leaderboard.</p>';
  }
}
function closeLeaderboardModal() { $('lb-modal').style.display = 'none'; }

$('close-lb-btn').addEventListener('click', closeLeaderboardModal);
$('lb-modal').addEventListener('click',   e => { if (e.target === $('lb-modal'))   closeLeaderboardModal(); });
$('save-modal').addEventListener('click', e => { if (e.target === $('save-modal')) closeSaveModal(); });

function renderLeaderboardTable(scores, containerId) {
  const el    = $(containerId);
  const ranks = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  if (!scores || scores.length === 0) {
    el.innerHTML = '<p class="lb-empty">No scores yet. Be the first!</p>';
    return;
  }
  el.innerHTML = `<div class="lb-table">${scores.map((s, i) => `
    <div class="lb-row">
      <div class="lb-row-rank">${ranks[i] || '#' + (i+1)}</div>
      <div class="lb-row-info">
        <div class="lb-row-name">${escapeHtml(s.player_name)}</div>
        <div class="lb-row-meta">${escapeHtml(s.level)} · ${escapeHtml(s.difficulty)} · ${s.correct_answers}/10 · ${s.accuracy}% · ${new Date(s.created_at).toLocaleDateString()}</div>
      </div>
      <div class="lb-row-score">${s.score}</div>
    </div>`).join('')}</div>`;
}

// ══════════════════════════════════════════════════════════════
// LEADERBOARD PREVIEW (start screen)
// ══════════════════════════════════════════════════════════════

async function loadLeaderboardPreview() {
  try {
    const scores = await fetch('/api/leaderboard').then(r => r.json());
    const el     = $('lb-preview-list');
    if (!scores || scores.length === 0) {
      el.innerHTML = '<p class="lb-empty">No scores yet. Be the first!</p>';
      return;
    }
    const ranks = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    el.innerHTML = scores.map((s, i) => `
      <div class="lb-preview-item">
        <span class="lb-rank">${ranks[i] || '#' + (i+1)}</span>
        <span class="lb-name">${escapeHtml(s.player_name)}</span>
        <span class="lb-meta">${escapeHtml(s.difficulty)}</span>
        <span class="lb-score">${s.score}</span>
      </div>`).join('');
  } catch {
    $('lb-preview-list').innerHTML = '<p class="lb-empty">Could not load scores.</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// CELEBRATION
// ══════════════════════════════════════════════════════════════

function showCelebration() {
  const el = document.createElement('div');
  el.className = 'celebrate-overlay';
  el.innerHTML = '<div class="celebrate-text">✓</div>';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

// ══════════════════════════════════════════════════════════════
// CONFETTI — triggered on 10/10 perfect score
// ══════════════════════════════════════════════════════════════

function launchConfetti() {
  const colors = [
    'hsl(270 90% 70%)', 'hsl(200 100% 60%)', 'hsl(142 68% 50%)',
    'hsl(40 95% 58%)',  'hsl(0 82% 62%)',     'hsl(300 80% 65%)',
    '#ffffff'
  ];
  const count = 90;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left     = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width    = (Math.random() * 8 + 6) + 'px';
    piece.style.height   = (Math.random() * 8 + 6) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    const dur  = (Math.random() * 2 + 1.8).toFixed(2) + 's';
    const del  = (Math.random() * 0.8).toFixed(2) + 's';
    piece.style.animationDuration = dur;
    piece.style.animationDelay   = del;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), (parseFloat(dur) + parseFloat(del) + 0.3) * 1000);
  }
}

// ══════════════════════════════════════════════════════════════
// SHARE SCORE
// ══════════════════════════════════════════════════════════════

$('share-score-btn').addEventListener('click', shareScore);

function shareScore() {
  const { score, correctCount, selectedLevel, selectedDifficulty, questions } = state;
  const total    = questions.length;
  const accuracy = Math.round((correctCount / total) * 100);
  const badge    = BADGES.find(b => correctCount >= b.min && correctCount <= b.max) || BADGES[0];
  const text =
    `🤖 AI App Builder Challenge\n` +
    `${badge.icon} ${badge.name}\n` +
    `Score: ${score} pts  |  ${correctCount}/${total} correct  |  ${accuracy}%\n` +
    `Level: ${selectedLevel}  ·  ${selectedDifficulty}\n` +
    `Can you beat me? Play at ${window.location.origin}`;

  if (navigator.share) {
    navigator.share({ title: 'AI Challenge Score', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('share-score-btn');
      const original = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }).catch(() => {
      alert('Could not copy to clipboard. Please copy manually:\n\n' + text);
    });
  }
}

// ══════════════════════════════════════════════════════════════
// FLAG / REPORT QUESTION
// ══════════════════════════════════════════════════════════════

$('flag-btn').addEventListener('click', flagQuestion);

async function flagQuestion() {
  const q   = state.questions[state.currentIndex];
  if (!q) return;

  const btn = $('flag-btn');
  btn.disabled = true;

  try {
    const res = await fetch(`/api/questions/${q.id}/flag`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason: 'Reported by player' })
    });
    if (res.ok) {
      btn.textContent = '⚑ Reported — thanks!';
      btn.classList.add('flagged');
    } else {
      btn.disabled = false;
    }
  } catch (_) {
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════════
// LINEAR TIMER BAR
// ══════════════════════════════════════════════════════════════

function updateLinearTimer() {
  const fill = $('timer-linear-fill');
  if (!fill) return;
  const cfg = DIFFICULTY_CONFIG[state.selectedDifficulty];
  if (!cfg || cfg.practice) {
    fill.style.width = '100%';
    fill.className   = 'timer-linear-fill';
    return;
  }
  const pct = state.maxTime > 0 ? (state.timeLeft / state.maxTime) * 100 : 100;
  fill.style.width = `${pct}%`;
  fill.className   = 'timer-linear-fill';
  if (pct <= 25)      fill.classList.add('danger');
  else if (pct <= 50) fill.classList.add('warn');
}

// Patch updateTimerUI to also drive the linear bar
const _origUpdateTimerUI = updateTimerUI;
function updateTimerUI() {
  _origUpdateTimerUI();
  updateLinearTimer();
}

// Reset linear bar on each new question
const _origResetTimerColor = resetTimerColor;
function resetTimerColor() {
  _origResetTimerColor();
  const fill = $('timer-linear-fill');
  if (fill) {
    fill.style.width  = '100%';
    fill.className    = 'timer-linear-fill';
  }
}

// ══════════════════════════════════════════════════════════════
// DARK / LIGHT MODE TOGGLE
// ══════════════════════════════════════════════════════════════

function getCurrentTheme() {
  return localStorage.getItem('aiChallenge_theme') || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  const icon   = isDark ? '🌙' : '☀️';
  const metaEl = document.getElementById('meta-theme-color');
  if (metaEl) metaEl.setAttribute('content', isDark ? '#07060c' : '#f0eff8');
  [$('theme-toggle'), $('theme-toggle-game')].forEach(btn => {
    if (btn) btn.textContent = icon;
  });
  localStorage.setItem('aiChallenge_theme', theme);
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
}

[$('theme-toggle'), $('theme-toggle-game')].forEach(btn => {
  if (btn) btn.addEventListener('click', toggleTheme);
});

applyTheme(getCurrentTheme()); // apply saved preference on load

// ══════════════════════════════════════════════════════════════
// ACHIEVEMENTS SYSTEM
// ══════════════════════════════════════════════════════════════

const ACHIEVEMENTS = [
  { id: 'first_win',     icon: '🎯', name: 'First Win',      desc: 'Complete any round',                    check: s => s.gamesPlayed >= 1 },
  { id: 'perfect',       icon: '💎', name: 'Perfect Score',   desc: 'Score 10/10 correct',                  check: s => s.perfectScores >= 1 },
  { id: 'speed_demon',   icon: '⚡', name: 'Speed Demon',     desc: 'Finish round with avg >8s remaining',   check: s => s.speedRounds >= 1 },
  { id: 'veteran',       icon: '🎖️', name: 'Veteran',         desc: 'Play 10 rounds',                       check: s => s.gamesPlayed >= 10 },
  { id: 'streak_legend', icon: '🔥', name: 'Streak Legend',   desc: 'Get a 5-answer streak',                check: s => s.maxStreakEver >= 5 },
  { id: 'scholar',       icon: '📚', name: 'Scholar',         desc: 'Complete all 5 topic levels',          check: s => s.levelsCompleted >= 5 },
  { id: 'ai_master',     icon: '🧠', name: 'AI Master',       desc: '90%+ accuracy on Advanced difficulty', check: s => s.advancedPasses >= 1 },
  { id: 'centurion',     icon: '💯', name: 'Centurion',       desc: 'Score 1000+ points in a single round', check: s => s.topScore >= 1000 },
];

function getAchievementStats() {
  try { return JSON.parse(localStorage.getItem('aiChallenge_achStats') || '{}'); }
  catch { return {}; }
}

function saveAchievementStats(stats) {
  localStorage.setItem('aiChallenge_achStats', JSON.stringify(stats));
}

function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem('aiChallenge_unlocked') || '[]'); }
  catch { return []; }
}

function saveUnlockedAchievements(list) {
  localStorage.setItem('aiChallenge_unlocked', JSON.stringify(list));
}

function showAchievementToast(ach) {
  const toast = $('achievement-toast');
  if (!toast) return;
  $('ach-toast-icon').textContent = ach.icon;
  $('ach-toast-name').textContent = ach.name;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function checkAndAwardAchievements(roundData) {
  // Update cumulative stats
  const stats    = getAchievementStats();
  const unlocked = getUnlockedAchievements();

  stats.gamesPlayed       = (stats.gamesPlayed || 0) + 1;
  stats.perfectScores     = (stats.perfectScores || 0) + (roundData.correctCount === 10 ? 1 : 0);
  stats.maxStreakEver     = Math.max(stats.maxStreakEver || 0, roundData.maxStreak);
  stats.topScore          = Math.max(stats.topScore || 0, roundData.score);
  stats.advancedPasses    = (stats.advancedPasses || 0) +
    (roundData.difficulty === 'Advanced' && roundData.accuracy >= 90 ? 1 : 0);

  // Speed: avg time remaining > 8s per question (non-practice)
  if (!roundData.isPractice && roundData.avgTimeLeft > 8) {
    stats.speedRounds = (stats.speedRounds || 0) + 1;
  }

  // Levels completed: track unique levels passed
  if (roundData.accuracy >= 70 && !roundData.isPractice) {
    const done = new Set(JSON.parse(localStorage.getItem('aiChallenge_levelsCompleted') || '[]'));
    done.add(roundData.level);
    localStorage.setItem('aiChallenge_levelsCompleted', JSON.stringify([...done]));
    stats.levelsCompleted = done.size;
  }

  saveAchievementStats(stats);

  // Check which achievements are newly unlocked
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach => {
    if (!unlocked.includes(ach.id) && ach.check(stats)) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
    }
  });

  saveUnlockedAchievements(unlocked);

  // Show toasts sequentially (1.5s apart)
  newlyUnlocked.forEach((ach, i) => {
    setTimeout(() => showAchievementToast(ach), i * 1600);
  });

  return newlyUnlocked;
}

function renderAchievementsPanel() {
  const panel = $('achievements-panel');
  const grid  = $('achievements-grid');
  if (!panel || !grid) return;

  const unlocked = getUnlockedAchievements();
  if (unlocked.length === 0) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const isUnlocked = unlocked.includes(ach.id);
    return `<div class="ach-chip ${isUnlocked ? 'unlocked' : ''}">
      <span class="ach-chip-icon">${isUnlocked ? ach.icon : '🔒'}</span>
      <div class="ach-chip-info">
        <span class="ach-chip-name">${ach.name}</span>
        <span class="ach-chip-desc">${ach.desc}</span>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// DAILY CHALLENGE
// ══════════════════════════════════════════════════════════════

function getDailyCountdown() {
  const now    = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const ms   = endOfDay - now;
  const h    = Math.floor(ms / 3600000);
  const m    = Math.floor((ms % 3600000) / 60000);
  return `Resets in ${h}h ${m}m`;
}

function initDailyChallenge() {
  const badge = $('dcb-countdown');
  if (badge) badge.textContent = getDailyCountdown();
  // update every minute
  setInterval(() => { if (badge) badge.textContent = getDailyCountdown(); }, 60000);
}

$('daily-challenge-btn').addEventListener('click', async () => {
  const btn = $('daily-challenge-btn');
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';

  try {
    const data = await fetch('/api/daily-challenge').then(r => r.json());
    if (!data || data.length === 0) {
      alert('Daily challenge not available right now. Try again later.');
      return;
    }

    // Set up state as a normal game but with daily questions
    state.selectedLevel      = 'Daily Challenge';
    state.selectedDifficulty = 'Intermediate';
    state.questions          = data;
    Object.assign(state, {
      currentIndex: 0, score: 0, correctCount: 0, wrongCount: 0,
      streak: 0, maxStreak: 0, answerHistory: [], scoreSaved: false,
      powerUps: { fiftyFifty: true, extraTime: true, hint: true },
      roundStartTime: Date.now()
    });

    $('active-level-badge').textContent = '📅 Daily';
    $('active-diff-badge').textContent  = 'Challenge';
    $('score-display').textContent      = '0';
    $('correct-count').textContent      = '0';
    $('wrong-count').textContent        = '0';
    ['pu-fifty', 'pu-time', 'pu-hint'].forEach(id => {
      $(id).disabled = false;
      $(id).classList.remove('used');
    });
    $('game-screen').classList.remove('practice-mode');
    $('pu-time').style.display = '';
    $('streak-display').style.display = 'none';

    showScreen('game');
    loadQuestion();
  } catch (err) {
    alert('Could not load daily challenge. Please try again.');
    console.error(err);
  } finally {
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
  }
});

// ══════════════════════════════════════════════════════════════
// HOOK RESULTS SCREEN — award achievements + render panel
// ══════════════════════════════════════════════════════════════

const _origShowResults = showResults;
function showResults() {
  _origShowResults();

  const { correctCount, maxStreak, score, selectedDifficulty, selectedLevel, questions } = state;
  const accuracy   = Math.round((correctCount / questions.length) * 100);
  const isPractice = DIFFICULTY_CONFIG[selectedDifficulty] && DIFFICULTY_CONFIG[selectedDifficulty].practice;

  // Calculate average time remaining (only for non-practice timed games)
  const cfg = DIFFICULTY_CONFIG[selectedDifficulty] || {};
  const avgTimeLeft = !isPractice && cfg.time
    ? Math.round((state.timeLeft || 0))   // rough proxy; full tracking would need per-Q data
    : 0;

  checkAndAwardAchievements({
    correctCount, maxStreak, score, accuracy,
    difficulty: selectedDifficulty, level: selectedLevel,
    isPractice, avgTimeLeft
  });

  renderAchievementsPanel();
}

// ══════════════════════════════════════════════════════════════
// PWA — Install prompt
// ══════════════════════════════════════════════════════════════

let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const banner = $('pwa-banner');
  if (banner) banner.classList.add('visible');
});

const pwaInstallBtn  = $('pwa-install-btn');
const pwaDismissBtn  = $('pwa-dismiss-btn');
const pwaBanner      = $('pwa-banner');

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') pwaBanner.classList.remove('visible');
    _deferredInstallPrompt = null;
  });
}

if (pwaDismissBtn) {
  pwaDismissBtn.addEventListener('click', () => pwaBanner.classList.remove('visible'));
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// ══════════════════════════════════════════════════════════════
// DAILY LEARNING HUB — streak display on the home screen
// ══════════════════════════════════════════════════════════════

function getStreakData() {
  try {
    return JSON.parse(localStorage.getItem('aiChallenge_streak') ||
      '{"count":0,"lastVisit":null,"longestStreak":0,"totalDays":0}');
  } catch { return { count: 0, lastVisit: null, longestStreak: 0, totalDays: 0 }; }
}

function initHubStreakDisplay() {
  const data = getStreakData();
  const numEl = document.getElementById('hub-streak-num');
  if (!numEl) return;

  if (data.count > 0) {
    numEl.textContent = data.count;
    const hubBtn = document.getElementById('daily-hub-btn');
    if (hubBtn) {
      const sub = hubBtn.querySelector('.dhb-sub');
      if (sub && data.count === 1) sub.textContent = 'Day 1 — great start! Keep the streak going 🔥';
      else if (sub && data.count >= 7) sub.textContent = `${data.count}-day streak — you're on fire! 🔥`;
    }
  } else {
    numEl.textContent = '0';
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════

loadLeaderboardPreview();
updateLevelCards();
checkForSession();
initDailyChallenge();
initHubStreakDisplay();
