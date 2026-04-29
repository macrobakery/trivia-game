// ============================================================
// AI Challenge — Profile Page
// ============================================================

// ── Constants (must match script.js) ──────────────────────────
const BADGES = [
  { min: 0,  max: 3,  name: 'AI Rookie',       icon: '🔰' },
  { min: 4,  max: 6,  name: 'Prompt Explorer',  icon: '🔍' },
  { min: 7,  max: 8,  name: 'AI App Developer', icon: '💻' },
  { min: 9,  max: 10, name: 'AI Architect',      icon: '🏗️' }
];

const ACHIEVEMENTS = [
  // Quiz achievements
  { id: 'first_win',       icon: '🎯', name: 'First Win',        desc: 'Complete any quiz round',               category: 'quiz'    },
  { id: 'perfect',         icon: '💎', name: 'Perfect Score',     desc: 'Score 10/10 correct',                   category: 'quiz'    },
  { id: 'speed_demon',     icon: '⚡', name: 'Speed Demon',       desc: 'Finish round with avg >8s remaining',   category: 'quiz'    },
  { id: 'veteran',         icon: '🎖️', name: 'Veteran',           desc: 'Play 10 rounds',                        category: 'quiz'    },
  { id: 'streak_legend',   icon: '🔥', name: 'Streak Legend',     desc: 'Get a 5-answer streak',                 category: 'quiz'    },
  { id: 'ai_master',       icon: '🧠', name: 'AI Master',         desc: '90%+ accuracy on Advanced difficulty',  category: 'quiz'    },
  { id: 'centurion',       icon: '💯', name: 'Centurion',         desc: 'Score 1000+ points in a single round',  category: 'quiz'    },
  { id: 'daily_warrior',   icon: '🗓', name: 'Daily Warrior',     desc: 'Complete 7 daily challenges',           category: 'quiz'    },
  // Learning achievements
  { id: 'scholar',         icon: '📚', name: 'Scholar',           desc: 'Complete all 5 quiz levels',            category: 'learn'   },
  { id: 'lesson_starter',  icon: '🌱', name: 'First Lesson',      desc: 'Complete your first lesson',            category: 'learn'   },
  { id: 'lesson_halfway',  icon: '📖', name: 'Halfway There',     desc: 'Complete 13 or more lessons',           category: 'learn'   },
  { id: 'lesson_master',   icon: '🎓', name: 'Graduated',         desc: 'Complete all 25 lessons',               category: 'learn'   },
  // News achievements
  { id: 'news_reader',     icon: '📰', name: 'News Reader',       desc: 'Read 5 AI news articles',               category: 'news'    },
  { id: 'news_addict',     icon: '🗞️', name: 'AI Journalist',     desc: 'Read 25 AI news articles',              category: 'news'    },
  // Consistency achievements
  { id: 'comeback',        icon: '🌅', name: 'Back in Action',    desc: 'Return after a 7+ day absence',         category: 'streak'  },
  { id: 'week_streak',     icon: '📆', name: '7-Day Streak',      desc: 'Visit 7 days in a row',                 category: 'streak'  },
];

const LEVELS = [
  { name: 'AI Foundations',                 glyph: '◐', num: 'Level 1' },
  { name: 'Data Preparation',               glyph: '◇', num: 'Level 2' },
  { name: 'Model Building',                 glyph: '◈', num: 'Level 3' },
  { name: 'AI App Development',             glyph: '◉', num: 'Level 4' },
  { name: 'Deployment and Responsible AI',  glyph: '✦', num: 'Level 5' },
];

// Must match CURRICULUM in lessons.js
const LESSON_TOPICS = [
  { id: 'foundations',       title: 'AI Foundations',      icon: '◐', count: 5 },
  { id: 'data-prep',         title: 'Data Preparation',    icon: '◇', count: 5 },
  { id: 'model-building',    title: 'Model Building',      icon: '◈', count: 5 },
  { id: 'ai-app-dev',        title: 'AI App Development',  icon: '◉', count: 5 },
  { id: 'deployment-ethics', title: 'Deployment & Ethics', icon: '✦', count: 5 },
];

// ── Helpers ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function read(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Theme ──────────────────────────────────────────────────────
function applyTheme() {
  const theme = localStorage.getItem('aiChallenge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const metaEl = document.querySelector('meta[name="theme-color"]');
  if (metaEl) metaEl.setAttribute('content', theme === 'dark' ? '#07060c' : '#f0eff8');
  const btn = $('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

$('theme-toggle').addEventListener('click', () => {
  const cur   = document.documentElement.getAttribute('data-theme') || 'dark';
  const next  = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem('aiChallenge_theme', next);
  applyTheme();
});

applyTheme();

// ── Render header ──────────────────────────────────────────────
function renderHeader() {
  const name       = localStorage.getItem('aiChallenge_playerName') || 'Anonymous';
  const achStats   = read('aiChallenge_achStats', {});
  const levelStats = read('aiChallenge_levelStats', {});
  const games      = levelStats._total ? levelStats._total.games : (achStats.gamesPlayed || 0);

  const topScore = achStats.topScore || 0;
  const unlocked = read('aiChallenge_unlocked', []);
  let badgeObj = BADGES[0];
  if (achStats.perfectScores >= 1) badgeObj = BADGES[3];
  else if (topScore >= 700) badgeObj = BADGES[2];
  else if (topScore >= 400) badgeObj = BADGES[1];

  $('prof-avatar').textContent    = badgeObj.icon;
  $('prof-name').textContent      = escapeHtml(name);
  $('prof-badge-name').textContent = badgeObj.name;
  $('prof-games-played').textContent = `${games} game${games !== 1 ? 's' : ''} played`;

  // ── Next-badge progress bar ──
  renderBadgeProgress(badgeObj, topScore);
}

function renderBadgeProgress(currentBadge, topScore) {
  const barFill = $('pbp-bar-fill');
  const lbl     = $('pbp-label');
  if (!barFill || !lbl) return;

  const curIdx  = BADGES.indexOf(currentBadge);
  const isMax   = curIdx >= BADGES.length - 1;

  if (isMax) {
    barFill.style.width = '100%';
    barFill.classList.add('pbp-maxed');
    lbl.textContent = '🏆 Maximum badge reached — AI Architect!';
    return;
  }

  // Thresholds for badges mapped to topScore
  const thresholds = [0, 400, 700, Infinity]; // score needed for each badge index
  const curMin  = thresholds[curIdx];
  const nextMin = thresholds[curIdx + 1];
  const next    = BADGES[curIdx + 1];
  const range   = nextMin - curMin;
  const prog    = Math.max(0, topScore - curMin);
  const pct     = Math.min(100, Math.round((prog / range) * 100));

  barFill.style.width = pct + '%';
  barFill.classList.remove('pbp-maxed');
  lbl.textContent = `${topScore} / ${nextMin} pts → ${next.name} ${next.icon}`;
}

// ── Render stats row ───────────────────────────────────────────
function renderStats() {
  const streak     = read('aiChallenge_streak', { count: 0, longestStreak: 0 });
  const levelStats = read('aiChallenge_levelStats', {});
  const total      = levelStats._total || { answered: 0, correct: 0 };

  $('ps-streak').textContent      = streak.count || 0;
  $('ps-best-streak').textContent = streak.longestStreak || 0;
  $('ps-answered').textContent    = (total.answered || 0).toLocaleString();
  $('ps-accuracy').textContent    = total.answered
    ? Math.round((total.correct / total.answered) * 100) + '%'
    : '—';

  // Lessons completed
  const lessonProg  = read('aiChallenge_lessonProgress', {});
  const lessonsDone = Object.values(lessonProg).filter(Boolean).length;
  const lessonEl    = $('ps-lessons');
  if (lessonEl) lessonEl.textContent = lessonsDone + '/25';

  // News articles read
  try {
    const newsRead = new Set(JSON.parse(localStorage.getItem('aiChallenge_newsRead') || '[]'));
    const newsEl   = $('ps-news');
    if (newsEl) newsEl.textContent = newsRead.size;
  } catch { /* ignore */ }

  // Total points accumulated across all games
  const totalPtsEl = $('ps-total-pts');
  if (totalPtsEl) {
    const pts = (total.totalScore || 0);
    totalPtsEl.textContent = pts >= 1000
      ? (pts / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
      : pts.toLocaleString();
  }
}

// ── Activity calendar ──────────────────────────────────────────
function renderCalendar() {
  const container   = $('activity-calendar');
  const visitDates  = read('aiChallenge_visitDates', []);
  const visitSet    = new Set(visitDates);
  const today       = todayStr();

  // Build last 30 days array (oldest → newest)
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push(str);
  }

  const activeDays = days.filter(d => visitSet.has(d)).length;
  const calLabel = $('cal-days-active');
  if (calLabel) calLabel.textContent = `${activeDays} active day${activeDays !== 1 ? 's' : ''}`;

  container.innerHTML = days.map(dateStr => {
    const isActive  = visitSet.has(dateStr);
    const isToday   = dateStr === today;
    const label     = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const cls       = ['cal-day', isActive ? 'cal-active' : '', isToday ? 'cal-today' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" title="${label}${isActive ? ' ✓' : ''}"></div>`;
  }).join('');
}

// ── Level records ──────────────────────────────────────────────
function renderLevelRecords() {
  const container  = $('level-records');
  const levelStats = read('aiChallenge_levelStats', {});
  const playedCount = LEVELS.filter(l => levelStats[l.name] && levelStats[l.name].attempts > 0).length;

  const levelsBeaten = $('levels-beaten');
  if (levelsBeaten) levelsBeaten.textContent = `${playedCount} of 5 level${playedCount !== 1 ? 's' : ''} played`;

  container.innerHTML = LEVELS.map(level => {
    const rec = levelStats[level.name];
    const hasPlayed = rec && rec.attempts > 0;

    return `
      <div class="level-rec-card ${hasPlayed ? 'played' : ''}">
        <div class="lrc-glyph">${level.glyph}</div>
        <div class="lrc-num">${level.num}</div>
        <div class="lrc-name">${level.name === 'Deployment and Responsible AI' ? 'Deployment & Ethics' : level.name}</div>
        ${hasPlayed ? `
          <div class="lrc-stats">
            <div class="lrc-stat-row">
              <span>Best Score</span>
              <span class="lrc-stat-val">${(rec.bestScore || 0).toLocaleString()} pts</span>
            </div>
            <div class="lrc-stat-row">
              <span>Best Accuracy</span>
              <span class="lrc-stat-val">${rec.bestAccuracy || 0}%</span>
            </div>
            <div class="lrc-stat-row">
              <span>Attempts</span>
              <span class="lrc-stat-val">${rec.attempts}</span>
            </div>
          </div>
        ` : `<div class="lrc-unplayed">Not played yet</div>`}
      </div>
    `;
  }).join('');
}

// ── Lessons Progress ───────────────────────────────────────────
function renderLessonsProgress() {
  const progress    = read('aiChallenge_lessonProgress', {});
  const totalDone   = Object.values(progress).filter(Boolean).length;
  const totalAll    = 25;

  const countEl = $('lessons-progress-count');
  if (countEl) countEl.textContent = `${totalDone} / ${totalAll} complete`;

  const container = $('lessons-progress-topics');
  if (!container) return;

  container.innerHTML = LESSON_TOPICS.map(topic => {
    const done  = Object.keys(progress).filter(k => k.startsWith(topic.id + '/') && progress[k]).length;
    const pct   = Math.round((done / topic.count) * 100);
    const allDone = done === topic.count;
    return `
      <div class="lp-topic-row">
        <div class="lp-topic-info">
          <span class="lp-topic-icon">${topic.icon}</span>
          <span class="lp-topic-title">${escapeHtml(topic.title)}</span>
          <span class="lp-topic-count ${allDone ? 'lp-complete' : ''}">${done}/${topic.count}${allDone ? ' ✓' : ''}</span>
        </div>
        <div class="lp-bar-track">
          <div class="lp-bar-fill ${allDone ? 'lp-bar-done' : ''}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Achievements ───────────────────────────────────────────────
function renderAchievements() {
  const unlocked = read('aiChallenge_unlocked', []);

  // Derive additional unlocked achievements from local data
  const derived = new Set(unlocked);

  // Lesson-based achievements
  const lessonProg  = read('aiChallenge_lessonProgress', {});
  const lessonsDone = Object.values(lessonProg).filter(Boolean).length;
  if (lessonsDone >= 1)  derived.add('lesson_starter');
  if (lessonsDone >= 13) derived.add('lesson_halfway');
  if (lessonsDone >= 25) derived.add('lesson_master');

  // News-based achievements
  try {
    const newsRead = new Set(JSON.parse(localStorage.getItem('aiChallenge_newsRead') || '[]'));
    if (newsRead.size >= 5)  derived.add('news_reader');
    if (newsRead.size >= 25) derived.add('news_addict');
  } catch {}

  // Streak-based achievements
  const visitDates  = read('aiChallenge_visitDates', []);
  if (visitDates.length >= 7) {
    // Check for 7 consecutive days
    const sorted = [...visitDates].sort();
    let consecutive = 1, maxConsec = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = Math.round((curr - prev) / 86400000);
      if (diff === 1) { consecutive++; maxConsec = Math.max(maxConsec, consecutive); }
      else             { consecutive = 1; }
    }
    if (maxConsec >= 7) derived.add('week_streak');
  }

  const unlockedArr = [...derived];
  const achCount = $('ach-count');
  if (achCount) achCount.textContent = `${unlockedArr.length} / ${ACHIEVEMENTS.length} unlocked`;

  // Group by category for display order
  const categoryOrder = ['quiz', 'learn', 'news', 'streak'];
  const sorted = [...ACHIEVEMENTS].sort((a, b) =>
    categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  );

  $('prof-ach-grid').innerHTML = sorted.map(ach => `
    <div class="prof-ach-chip ${unlockedArr.includes(ach.id) ? 'unlocked' : ''}" title="${ach.desc}">
      <span class="prof-ach-icon">${ach.icon}</span>
      <div class="prof-ach-info">
        <div class="prof-ach-name">${ach.name}</div>
        <div class="prof-ach-desc">${ach.desc}</div>
      </div>
    </div>
  `).join('');
}

// ── Edit name modal ────────────────────────────────────────────
function openEditNameModal() {
  const current = localStorage.getItem('aiChallenge_playerName') || '';
  $('edit-name-input').value = current;
  $('edit-name-modal').style.display = 'flex';
  setTimeout(() => {
    $('edit-name-input').focus();
    if (current) $('edit-name-input').select();
  }, 80);
}
function closeEditNameModal() { $('edit-name-modal').style.display = 'none'; }

function saveEditedName() {
  const val = $('edit-name-input').value.trim();
  if (!val) { $('edit-name-input').style.borderColor = 'var(--red)'; return; }
  localStorage.setItem('aiChallenge_playerName', val);
  closeEditNameModal();
  renderHeader(); // refresh displayed name
}

$('edit-name-btn').addEventListener('click', openEditNameModal);
$('edit-name-cancel').addEventListener('click', closeEditNameModal);
$('edit-name-confirm').addEventListener('click', saveEditedName);
$('edit-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveEditedName(); });
$('edit-name-modal').addEventListener('click', e => {
  if (e.target === $('edit-name-modal')) closeEditNameModal();
});

// ── Daily Challenge Status ─────────────────────────────────────
function renderDailyChallenge() {
  const DC_KEY   = 'aiChallenge_dailyDone';
  const today    = todayStr();
  const done     = localStorage.getItem(DC_KEY) === today;
  const statusEl = $('prof-daily-status');
  const infoEl   = $('prof-daily-info');
  const ctaEl    = $('prof-daily-cta');
  if (!statusEl) return;

  if (done) {
    statusEl.textContent  = '✓ Completed';
    statusEl.style.color  = 'var(--green)';
    infoEl.textContent    = 'You have completed today\'s challenge. Come back tomorrow for a new set!';
    if (ctaEl) ctaEl.style.display = 'none';
  } else {
    // Countdown to midnight
    const now      = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms       = midnight - now;
    const h        = Math.floor(ms / 3600000);
    const m        = Math.floor((ms % 3600000) / 60000);
    statusEl.textContent = '⏳ Not yet';
    statusEl.style.color = 'var(--ink-faint)';
    infoEl.textContent   = `Same 10 questions for all players · Resets in ${h}h ${m}m`;
    if (ctaEl) ctaEl.style.display = '';
  }
}

// ── Global rank fetch ──────────────────────────────────────────
async function fetchGlobalRank() {
  const rankEl = $('ps-global-rank');
  if (!rankEl) return;
  try {
    const levelStats = read('aiChallenge_levelStats', {});
    const total      = levelStats._total || {};
    // Use the highest score ever (bestScore across all levels)
    let bestScore = 0;
    LEVELS.forEach(l => {
      const rec = levelStats[l.name];
      if (rec && rec.bestScore > bestScore) bestScore = rec.bestScore;
    });
    if (bestScore <= 0) { rankEl.textContent = '—'; return; }
    const data = await fetch(`/api/leaderboard/rank?score=${bestScore}`).then(r => r.json());
    if (data && data.rank) {
      rankEl.textContent = `#${data.rank}`;
      rankEl.title       = `out of ${data.total} players`;
    }
  } catch { /* non-critical */ }
}

// ── Share profile card ─────────────────────────────────────────
function buildShareCard() {
  const name       = localStorage.getItem('aiChallenge_playerName') || 'Anonymous';
  const streak     = read('aiChallenge_streak', { count: 0 });
  const levelStats = read('aiChallenge_levelStats', {});
  const total      = levelStats._total || { answered: 0, correct: 0, totalScore: 0 };
  const lessonProg = read('aiChallenge_lessonProgress', {});
  const lessonsDone = Object.values(lessonProg).filter(Boolean).length;
  const unlocked   = read('aiChallenge_unlocked', []);
  const accuracy   = total.answered
    ? Math.round((total.correct / total.answered) * 100)
    : 0;
  const pts = (total.totalScore || 0);
  const ptsStr = pts >= 1000 ? (pts / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : pts.toLocaleString();

  return [
    `🤖 AI Challenge — My Progress`,
    ``,
    `👤 ${name}`,
    `🔥 Streak: ${streak.count || 0} day${streak.count !== 1 ? 's' : ''}`,
    `🎯 Accuracy: ${accuracy || 0}%`,
    `📚 Lessons: ${lessonsDone}/25`,
    `⭐ Points: ${ptsStr}`,
    `🏅 Achievements: ${unlocked.length}/16`,
    ``,
    `Can you beat me? 👉 ai-app-builder-challenge.vercel.app`,
    `#AIChallenge #LearnAI`
  ].join('\n');
}

document.addEventListener('click', e => {
  const btn = e.target.closest('#share-profile-btn');
  if (!btn) return;
  const card = buildShareCard();
  if (navigator.share) {
    navigator.share({ title: 'My AI Challenge Progress', text: card }).catch(() => {});
  } else {
    navigator.clipboard.writeText(card).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.innerHTML = '📤 Share My Progress'; }, 2200);
    }).catch(() => {
      // Final fallback: prompt
      window.prompt('Copy your progress card:', card);
    });
  }
});

// ── Game History ───────────────────────────────────────────────
function renderGameHistory() {
  const section   = $('prof-game-history-section');
  const listEl    = $('prof-game-history-list');
  const countEl   = $('gh-game-count');
  if (!section || !listEl) return;

  const history = read('aiChallenge_gameHistory', []);
  if (!history.length) { section.style.display = 'none'; return; }

  section.style.display = '';
  if (countEl) countEl.textContent = `${history.length} game${history.length !== 1 ? 's' : ''}`;

  const DIFF_ICONS = { Beginner: '🌱', Intermediate: '🔥', Advanced: '⚡', Practice: '🎓' };

  listEl.innerHTML = history.slice(0, 10).map(g => {
    const pct      = g.accuracy !== undefined ? g.accuracy : (g.total ? Math.round((g.correct / g.total) * 100) : 0);
    const perfect  = g.correct === g.total;
    const diffKey  = (g.difficulty || '').toLowerCase();
    const diffIcon = DIFF_ICONS[g.difficulty] || '🎮';
    const date     = g.date ? new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const level    = g.level === 'Deployment and Responsible AI' ? 'Deployment & Ethics' : (g.level || '—');

    return `
      <div class="gh-row ${perfect ? 'gh-perfect' : ''}">
        <div class="gh-icon">${diffIcon}</div>
        <div class="gh-info">
          <div class="gh-level">${escapeHtml(level)}<span class="gh-diff-chip gh-diff-${diffKey}">${g.difficulty || ''}</span></div>
          <div class="gh-meta">${g.correct || 0}/${g.total || 10} correct · ${date}${perfect ? ' · 🌟 Perfect' : ''}</div>
        </div>
        <div class="gh-score-col">
          <div class="gh-score-pts">${(g.score || 0).toLocaleString()}</div>
          <div class="gh-acc">${pct}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Weekly bar chart ───────────────────────────────────────────
function renderWeeklyChart() {
  const container = $('week-chart');
  const labelEl   = $('week-games-label');
  if (!container) return;

  const history = read('aiChallenge_gameHistory', []);

  // Build last 7 days (oldest → newest)
  const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const str   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const label = i === 0 ? 'Today' : DAY_ABBR[d.getDay()];
    days.push({ str, label, isToday: i === 0 });
  }

  // Count games per day from history
  const counts = {};
  history.forEach(g => {
    if (!g.date) return;
    const d   = new Date(g.date);
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    counts[str] = (counts[str] || 0) + 1;
  });

  // Fill in the days
  days.forEach(d => { d.count = counts[d.str] || 0; });

  const maxCount  = Math.max(1, ...days.map(d => d.count));
  const weekTotal = days.reduce((s, d) => s + d.count, 0);
  if (labelEl) labelEl.textContent = `${weekTotal} game${weekTotal !== 1 ? 's' : ''} this week`;

  container.innerHTML = days.map(d => {
    const pct   = Math.round((d.count / maxCount) * 100);
    const tip   = `${d.count} game${d.count !== 1 ? 's' : ''}`;
    const cls   = ['wc-bar-fill', d.count > 0 ? 'wc-bar-active' : '', d.isToday ? 'wc-bar-today' : ''].filter(Boolean).join(' ');
    return `
      <div class="wc-col">
        <div class="wc-bar-wrap" title="${tip}">
          <div class="${cls}" style="height:${Math.max(pct, d.count > 0 ? 8 : 0)}%"></div>
        </div>
        <div class="wc-day-label ${d.isToday ? 'wc-today-lbl' : ''}">${d.label}</div>
        ${d.count > 0 ? `<div class="wc-count-label">${d.count}</div>` : '<div class="wc-count-label wc-count-zero">–</div>'}
      </div>
    `;
  }).join('');
}

// ── Init ───────────────────────────────────────────────────────
renderHeader();
renderStats();
renderWeeklyChart();
renderCalendar();
renderLevelRecords();
renderLessonsProgress();
renderAchievements();
renderDailyChallenge();
renderGameHistory();
fetchGlobalRank();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// ── Push Notifications ─────────────────────────────────────────
(function initPush() {
  const btn    = document.getElementById('push-toggle-btn');
  const label  = document.getElementById('push-btn-label');
  const icon   = document.getElementById('push-btn-icon');
  const status = document.getElementById('push-status');
  if (!btn || !('Notification' in window) || !('serviceWorker' in navigator)) {
    if (btn) btn.style.display = 'none';
    return;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw     = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  function updateBtn(subscribed) {
    if (subscribed) {
      icon.textContent  = '🔕';
      label.textContent = 'Disable Notifications';
      btn.classList.add('push-on');
      status.textContent = '✅ You will receive daily reminders.';
    } else {
      icon.textContent  = '🔔';
      label.textContent = 'Enable Notifications';
      btn.classList.remove('push-on');
      status.textContent = '';
    }
  }

  async function checkSubscribed() {
    try {
      const reg  = await navigator.serviceWorker.ready;
      const sub  = await reg.pushManager.getSubscription();
      updateBtn(!!sub);
    } catch (_) {}
  }

  btn.addEventListener('click', async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Unsubscribe
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        updateBtn(false);
      } else {
        // Subscribe
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          status.textContent = '❌ Permission denied. Enable in browser settings.';
          return;
        }
        const keyData  = await fetch('/api/push/vapid-public-key').then(r => r.json());
        const newSub   = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.key)
        });
        const subJSON = newSub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subJSON.endpoint, keys: subJSON.keys })
        });
        updateBtn(true);
      }
    } catch (err) {
      status.textContent = '⚠️ Could not set up notifications: ' + err.message;
    }
  });

  checkSubscribed();
})();
