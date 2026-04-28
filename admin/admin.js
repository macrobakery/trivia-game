// ============================================================
// AI App Builder Challenge — Admin Dashboard Script
// ============================================================

// ── DOM helpers ──────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── State ────────────────────────────────────────────────────
let editingId       = null;   // null = add mode, number = edit mode
let pendingDeleteId = null;   // for confirm modal
let confirmCallback = null;   // callback for confirm modal

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════

$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'leaderboard') loadLeaderboard();
  });
});

// ════════════════════════════════════════════════════════════
// QUESTION FORM — ADD / EDIT
// ════════════════════════════════════════════════════════════

$('question-form').addEventListener('submit', async e => {
  e.preventDefault();
  hideFormError();

  const payload = {
    level:          $('f-level').value.trim(),
    difficulty:     $('f-difficulty').value.trim(),
    question_text:  $('f-question').value.trim(),
    option_a:       $('f-opt-a').value.trim(),
    option_b:       $('f-opt-b').value.trim(),
    option_c:       $('f-opt-c').value.trim(),
    option_d:       $('f-opt-d').value.trim(),
    correct_option: $('f-correct').value.trim(),
    explanation:    $('f-explanation').value.trim(),
    hint:           $('f-hint').value.trim()
  };

  // Basic validation
  const missing = Object.entries(payload).find(([, v]) => !v);
  if (missing) {
    showFormError('All fields are required. Please fill in every field.');
    return;
  }

  const isEditing = editingId !== null;
  const url       = isEditing ? `/api/questions/${editingId}` : '/api/questions';
  const method    = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      showFormError(err.error || 'Server error. Please try again.');
      return;
    }

    showToast(isEditing ? '✅ Question updated!' : '✅ Question added!', 'success');
    resetForm();
    loadQuestions();
  } catch (err) {
    showFormError('Could not reach the server. Make sure it is running.');
    console.error(err);
  }
});

// Cancel / reset form button
$('reset-form-btn').addEventListener('click', () => {
  resetForm();
});

function resetForm() {
  editingId = null;
  $('edit-id').value      = '';
  $('form-title').textContent = '➕ Add Question';
  $('submit-btn').textContent = '✅ Add Question';
  $('question-form').reset();
  hideFormError();
}

function populateForm(q) {
  editingId = q.id;
  $('edit-id').value    = q.id;
  $('form-title').textContent = `✏️ Edit Question #${q.id}`;
  $('submit-btn').textContent = '💾 Save Changes';

  $('f-level').value      = q.level;
  $('f-difficulty').value = q.difficulty;
  $('f-question').value   = q.question_text;
  $('f-opt-a').value      = q.option_a;
  $('f-opt-b').value      = q.option_b;
  $('f-opt-c').value      = q.option_c;
  $('f-opt-d').value      = q.option_d;
  $('f-correct').value    = q.correct_option;
  $('f-explanation').value= q.explanation;
  $('f-hint').value       = q.hint;

  hideFormError();
  // Scroll form into view
  $('question-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showFormError(msg) {
  $('form-error').textContent = msg;
  $('form-error').style.display = 'block';
}
function hideFormError() {
  $('form-error').style.display = 'none';
  $('form-error').textContent = '';
}

// ════════════════════════════════════════════════════════════
// LOAD & RENDER QUESTIONS
// ════════════════════════════════════════════════════════════

async function loadQuestions() {
  const level      = $('filter-level').value;
  const difficulty = $('filter-difficulty').value;

  const params = new URLSearchParams();
  if (level)      params.set('level', level);
  if (difficulty) params.set('difficulty', difficulty);

  const url = `/api/questions${params.toString() ? '?' + params.toString() : ''}`;

  $('questions-list').innerHTML = '<div class="loading-msg">Loading questions…</div>';

  try {
    const res       = await fetch(url);
    const questions = await res.json();
    renderQuestions(questions);
  } catch {
    $('questions-list').innerHTML = '<div class="loading-msg">Error loading questions.</div>';
  }
}

function renderQuestions(questions) {
  const container = $('questions-list');
  const statsEl   = $('question-stats');

  statsEl.textContent = `Showing ${questions.length} question${questions.length !== 1 ? 's' : ''}`;

  if (questions.length === 0) {
    container.innerHTML = `
      <div class="no-questions">
        <div class="no-questions-icon">🔍</div>
        <div>No questions found for the selected filters.</div>
      </div>`;
    return;
  }

  container.innerHTML = questions.map(q => buildQuestionCard(q)).join('');

  // Attach edit and delete button handlers
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const q  = questions.find(x => x.id === id);
      if (q) populateForm(q);
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      openConfirmModal(
        'Delete Question',
        `Are you sure you want to delete Question #${id}? This cannot be undone.`,
        async () => { await deleteQuestion(id); }
      );
    });
  });
}

function buildQuestionCard(q) {
  const opts = ['a','b','c','d'].map(letter => {
    const upper    = letter.toUpperCase();
    const text     = escHtml(q[`option_${letter}`]);
    const correct  = q.correct_option.toUpperCase() === upper;
    const cls      = correct ? 'q-admin-opt is-correct' : 'q-admin-opt';
    return `<div class="${cls}"><strong>${upper}.</strong> ${text}${correct ? ' ✓' : ''}</div>`;
  }).join('');

  return `
    <div class="q-admin-card" id="qcard-${q.id}">
      <div class="q-admin-header">
        <div class="q-admin-badges">
          <span class="q-admin-badge badge-id-admin">#${q.id}</span>
          <span class="q-admin-badge badge-level-admin">${escHtml(q.level)}</span>
          <span class="q-admin-badge badge-diff-admin">${escHtml(q.difficulty)}</span>
        </div>
        <div class="q-admin-actions">
          <button class="btn-edit"   data-id="${q.id}">✏️ Edit</button>
          <button class="btn-delete" data-id="${q.id}">🗑 Delete</button>
        </div>
      </div>
      <p class="q-admin-text">${escHtml(q.question_text)}</p>
      <div class="q-admin-options">${opts}</div>
      <div class="q-admin-explanation">💡 <em>${escHtml(q.hint)}</em> · ${escHtml(q.explanation)}</div>
    </div>
  `;
}

async function deleteQuestion(id) {
  try {
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    showToast('🗑 Question deleted.', 'success');
    // If we were editing this question, reset form
    if (editingId === id) resetForm();
    loadQuestions();
  } catch {
    showToast('Error deleting question.', 'error');
  }
}

// ── Filters ──────────────────────────────────────────────────
$('apply-filter-btn').addEventListener('click', loadQuestions);
$('clear-filter-btn').addEventListener('click', () => {
  $('filter-level').value      = '';
  $('filter-difficulty').value = '';
  loadQuestions();
});

// ════════════════════════════════════════════════════════════
// LEADERBOARD (Admin)
// ════════════════════════════════════════════════════════════

async function loadLeaderboard() {
  $('admin-lb-content').innerHTML = '<div class="loading-msg">Loading scores…</div>';

  try {
    const res    = await fetch('/api/leaderboard/all');
    const scores = await res.json();
    renderAdminLeaderboard(scores);
  } catch {
    $('admin-lb-content').innerHTML = '<div class="loading-msg">Error loading scores.</div>';
  }
}

function renderAdminLeaderboard(scores) {
  if (!scores || scores.length === 0) {
    $('admin-lb-content').innerHTML = '<div class="loading-msg">No scores yet.</div>';
    return;
  }

  const rows = scores.map((s, i) => {
    const date = new Date(s.created_at).toLocaleString();
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(s.player_name)}</td>
        <td class="score-td">${s.score}</td>
        <td>${s.correct_answers}/10</td>
        <td>${s.accuracy}%</td>
        <td>${escHtml(s.level)}</td>
        <td>${escHtml(s.difficulty)}</td>
        <td>${date}</td>
      </tr>
    `;
  }).join('');

  $('admin-lb-content').innerHTML = `
    <table class="lb-admin-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Score</th>
          <th>Correct</th>
          <th>Accuracy</th>
          <th>Level</th>
          <th>Difficulty</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

$('clear-lb-btn').addEventListener('click', () => {
  openConfirmModal(
    'Clear Leaderboard',
    'Are you sure you want to delete ALL scores? This cannot be undone.',
    async () => {
      try {
        await fetch('/api/leaderboard', { method: 'DELETE' });
        showToast('🗑 Leaderboard cleared.', 'success');
        loadLeaderboard();
      } catch {
        showToast('Error clearing leaderboard.', 'error');
      }
    }
  );
});

// ════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ════════════════════════════════════════════════════════════

function openConfirmModal(title, message, callback) {
  $('confirm-title').textContent   = title;
  $('confirm-message').textContent = message;
  confirmCallback = callback;
  $('confirm-modal').style.display = 'flex';
}

$('confirm-yes-btn').addEventListener('click', async () => {
  $('confirm-modal').style.display = 'none';
  if (confirmCallback) {
    await confirmCallback();
    confirmCallback = null;
  }
});

$('confirm-no-btn').addEventListener('click', () => {
  $('confirm-modal').style.display = 'none';
  confirmCallback = null;
});

$('confirm-modal').addEventListener('click', e => {
  if (e.target === $('confirm-modal')) {
    $('confirm-modal').style.display = 'none';
    confirmCallback = null;
  }
});

// ════════════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════

let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className   = `toast ${type}`;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ════════════════════════════════════════════════════════════
// TAB — hook analytics + flagged on tab click
// ════════════════════════════════════════════════════════════

// Extend existing tab-btn listener to handle new tabs
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'analytics') loadAnalytics();
    if (btn.dataset.tab === 'flagged')   loadFlagged();
  });
});

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════

let _chartLevel = null;
let _chartDiff  = null;

async function loadAnalytics() {
  const grid = $('analytics-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-msg">Loading analytics…</div>';

  try {
    const d = await fetch('/api/analytics').then(r => r.json());

    grid.innerHTML = `
      <!-- KPI cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">${d.totalGames}</div>
          <div class="kpi-label">Total Games</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${d.avgScore}</div>
          <div class="kpi-label">Avg Score</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${d.maxScore || 0}</div>
          <div class="kpi-label">Top Score</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${d.questionCount}</div>
          <div class="kpi-label">Questions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${d.flaggedCount}</div>
          <div class="kpi-label">Flagged</div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <div class="chart-box">
          <div class="chart-title">Games by Level</div>
          <canvas id="chart-level" height="220"></canvas>
        </div>
        <div class="chart-box">
          <div class="chart-title">Games by Difficulty</div>
          <canvas id="chart-diff" height="220"></canvas>
        </div>
      </div>

      <!-- Recent games table -->
      <div class="chart-box" style="grid-column:1/-1">
        <div class="chart-title">Recent Games</div>
        <table class="lb-admin-table" style="margin-top:10px">
          <thead><tr><th>Player</th><th>Score</th><th>Level</th><th>Difficulty</th><th>Date</th></tr></thead>
          <tbody>
            ${(d.recentScores || []).map(s => `
              <tr>
                <td>${escHtml(s.player_name)}</td>
                <td class="score-td">${s.score}</td>
                <td>${escHtml(s.level)}</td>
                <td>${escHtml(s.difficulty)}</td>
                <td>${new Date(s.created_at).toLocaleString()}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Chart — by level
    if (_chartLevel) _chartLevel.destroy();
    _chartLevel = new Chart($('chart-level'), {
      type: 'bar',
      data: {
        labels: (d.byLevel || []).map(r => r.level.replace('Deployment and Responsible AI', 'Deploy & Ethics')),
        datasets: [{
          label: 'Games played',
          data: (d.byLevel || []).map(r => r.games),
          backgroundColor: 'hsl(270 90% 65% / 0.7)',
          borderColor: 'hsl(270 90% 70%)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#aaa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true }
        }
      }
    });

    // Chart — by difficulty
    if (_chartDiff) _chartDiff.destroy();
    _chartDiff = new Chart($('chart-diff'), {
      type: 'doughnut',
      data: {
        labels: (d.byDifficulty || []).map(r => r.difficulty),
        datasets: [{
          data: (d.byDifficulty || []).map(r => r.games),
          backgroundColor: [
            'hsl(142 68% 50% / 0.7)',
            'hsl(40 95% 58% / 0.7)',
            'hsl(0 82% 62% / 0.7)'
          ],
          borderColor: ['hsl(142 68% 50%)', 'hsl(40 95% 58%)', 'hsl(0 82% 62%)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#aaa', padding: 12, font: { size: 11 } } }
        }
      }
    });

  } catch (err) {
    grid.innerHTML = '<div class="loading-msg">Error loading analytics.</div>';
    console.error(err);
  }
}

// ════════════════════════════════════════════════════════════
// FLAGGED QUESTIONS
// ════════════════════════════════════════════════════════════

async function loadFlagged() {
  const list = $('flagged-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-msg">Loading…</div>';

  try {
    const items = await fetch('/api/flagged').then(r => r.json());
    const count = $('flagged-count');
    if (count) count.textContent = `${items.length} report${items.length === 1 ? '' : 's'}`;

    if (!items || items.length === 0) {
      list.innerHTML = '<div class="loading-msg">No flagged questions. 🎉</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="flagged-item">
        <div class="flagged-header">
          <span class="flagged-meta">${escHtml(item.level)} · ${escHtml(item.difficulty)}</span>
          <span class="flagged-count-badge">⚑ ${item.flag_count} report${item.flag_count === 1 ? '' : 's'}</span>
        </div>
        <p class="flagged-question">${escHtml(item.question_text)}</p>
        <div class="flagged-footer">
          <span style="font-size:0.72rem;color:#888">Reported: ${new Date(item.created_at).toLocaleString()}</span>
          <button class="btn-ghost" style="font-size:0.72rem;padding:4px 10px" onclick="editQuestion(${item.question_id})">✏️ Edit Question</button>
        </div>
      </div>
    `).join('');

  } catch {
    list.innerHTML = '<div class="loading-msg">Error loading flagged questions.</div>';
  }
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
loadQuestions();
