// ============================================================
// AI App Builder Challenge — Daily Learning Page (learn.js)
// ============================================================

// ── Utilities ─────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayStr() {
  // Returns "YYYY-MM-DD" in local time
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLong(dateStr) {
  // "YYYY-MM-DD" → "Tuesday, April 28"
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ══════════════════════════════════════════════════════════════
// THEME — apply saved preference (no toggle button on this page)
// ══════════════════════════════════════════════════════════════

function applyTheme() {
  const theme = localStorage.getItem('aiChallenge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const metaEl = document.querySelector('meta[name="theme-color"]');
  if (metaEl) {
    metaEl.setAttribute('content', theme === 'dark' ? '#07060c' : '#f0eff8');
  }
}

// ══════════════════════════════════════════════════════════════
// MILESTONES CONFIG
// ══════════════════════════════════════════════════════════════

const MILESTONES = [
  { days: 3,   icon: '⚡', label: '3-Day Spark'    },
  { days: 7,   icon: '🔥', label: 'Week Warrior'   },
  { days: 30,  icon: '💪', label: '30-Day Legend'  },
  { days: 100, icon: '👑', label: '100-Day Master' },
];

// ══════════════════════════════════════════════════════════════
// 1. STREAK MANAGEMENT
// ══════════════════════════════════════════════════════════════

const STREAK_KEY = 'aiChallenge_streak';

function getStreakData() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastVisit: null, longestStreak: 0, totalDays: 0 };
    const data = JSON.parse(raw);
    return {
      count:         typeof data.count         === 'number' ? data.count         : 0,
      lastVisit:     data.lastVisit || null,
      longestStreak: typeof data.longestStreak === 'number' ? data.longestStreak : 0,
      totalDays:     typeof data.totalDays     === 'number' ? data.totalDays     : 0,
    };
  } catch {
    return { count: 0, lastVisit: null, longestStreak: 0, totalDays: 0 };
  }
}

function updateStreak() {
  const data  = getStreakData();
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (data.lastVisit === today) {
    // Already visited today — nothing to change
    return data;
  }

  if (data.lastVisit === yesterday) {
    // Consecutive day — increment
    data.count += 1;
  } else {
    // Gap or first visit — reset to 1
    data.count = 1;
  }

  data.totalDays     = (data.totalDays || 0) + 1;
  data.longestStreak = Math.max(data.longestStreak || 0, data.count);
  data.lastVisit     = today;

  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch (_) { /* storage unavailable */ }

  // Track visit date for profile activity calendar
  try {
    let visitDates = JSON.parse(localStorage.getItem('aiChallenge_visitDates') || '[]');
    if (!visitDates.includes(today)) {
      visitDates.push(today);
      if (visitDates.length > 90) visitDates = visitDates.slice(-90);
      localStorage.setItem('aiChallenge_visitDates', JSON.stringify(visitDates));
    }
  } catch (_) {}

  return data;
}

function renderStreak(data) {
  const today = todayStr();

  // Header streak badge
  const streakNumEl = document.getElementById('streak-num');
  if (streakNumEl) streakNumEl.textContent = data.count;

  // Hero streak
  const heroStreakNumEl = document.getElementById('hero-streak-num');
  if (heroStreakNumEl) heroStreakNumEl.textContent = data.count;

  const heroStreak = document.getElementById('hero-streak');
  if (heroStreak) {
    if (data.count > 0) {
      heroStreak.classList.add('active');
    } else {
      heroStreak.classList.remove('active');
    }
  }

  // Date badge
  const dateBadge = document.getElementById('hero-date');
  if (dateBadge) {
    dateBadge.textContent = formatDateLong(today);
  }

  // Milestone progress bar
  renderMilestoneBar(data.count);

  // Stats strip
  renderStatsStrip(data);
}

function renderStatsStrip(streakData) {
  // Streak
  const streakEl = document.getElementById('stat-streak-val');
  if (streakEl) streakEl.textContent = streakData.count;

  // Total days
  const daysEl = document.getElementById('stat-days-val');
  if (daysEl) daysEl.textContent = streakData.totalDays || streakData.count;

  // Lessons done today
  const progress = getLessonProgress();
  const doneTodayCount = progress.completed.filter(Boolean).length;
  const todayEl = document.getElementById('stat-today-val');
  if (todayEl) todayEl.textContent = `${doneTodayCount}/3`;

  // Estimated read time (3 min per lesson done today)
  const timeEl = document.getElementById('stat-time-val');
  if (timeEl) {
    const minutes = doneTodayCount * 3;
    timeEl.textContent = minutes > 0 ? `~${minutes}m` : '~0m';
  }
}

function renderMilestoneBar(currentDay) {
  const bar = document.getElementById('milestone-bar');
  if (!bar) return;

  // The track spans from day 0 to day 100.
  // We clamp for display purposes at 100.
  const MAX_DAYS    = 100;
  const clampedDay  = Math.min(currentDay, MAX_DAYS);
  const pct         = (clampedDay / MAX_DAYS) * 100;

  // Build HTML for the visual bar
  // Milestone positions as % of MAX_DAYS
  const milestoneMarkersHtml = MILESTONES.map(m => {
    const pos     = (m.days / MAX_DAYS) * 100;
    const reached = currentDay >= m.days;
    return `<div class="milestone-marker ${reached ? 'reached' : ''}" style="left:${pos}%;" title="${m.label}">
      <span class="milestone-icon">${m.icon}</span>
      <span class="milestone-day">${m.days}</span>
    </div>`;
  }).join('');

  // Current position indicator
  const currentPosHtml = currentDay > 0
    ? `<div class="milestone-current" style="left:${pct}%;"></div>`
    : '';

  bar.innerHTML = `
    <div class="milestone-track">
      <div class="milestone-fill" style="width:${pct}%;"></div>
      ${currentPosHtml}
      ${milestoneMarkersHtml}
    </div>
  `;

  // Update aria attributes on the wrapper
  const wrap = document.getElementById('milestone-bar-wrap');
  if (wrap) {
    wrap.setAttribute('aria-valuenow', clampedDay);
  }

  // Also populate the milestone labels row if present
  const labelsEl = document.getElementById('milestone-labels');
  if (labelsEl) {
    labelsEl.innerHTML = MILESTONES.map(m => {
      const pos     = (m.days / MAX_DAYS) * 100;
      const reached = currentDay >= m.days;
      return `<div class="milestone-label ${reached ? 'reached' : ''}" style="left:${pos}%;">${m.icon} ${m.days}d</div>`;
    }).join('');
  }
}

function checkMilestone(data) {
  const hit = MILESTONES.find(m => m.days === data.count);
  if (!hit) return;

  const messages = {
    3:   `${hit.icon} 3-Day Streak! You've built a habit — keep it up!`,
    7:   `${hit.icon} Week Warrior! One full week of learning — you're on fire!`,
    30:  `${hit.icon} 30-Day Legend! Incredible dedication to AI mastery!`,
    100: `${hit.icon} 100-Day Champion! You are an AI learning legend! 🎉`,
  };

  const msg = messages[data.count] || `${hit.icon} ${hit.label}! Milestone reached!`;

  // Big celebration modal for major milestones
  showStreakCelebration(data.count, hit.icon, msg);

  // Also fire confetti
  launchStreakConfetti(data.count);
}

function showStreakCelebration(days, icon, message) {
  // Remove any existing one
  const old = document.getElementById('streak-celebrate-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'streak-celebrate-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);animation:fadeIn 0.3s ease;
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--modal-bg);border:1px solid var(--accent);border-radius:24px;
      padding:36px 32px;max-width:340px;width:calc(100vw - 32px);text-align:center;
      box-shadow:0 0 60px rgba(124,106,255,0.3);animation:scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
    ">
      <div style="font-size:3.5rem;margin-bottom:12px;animation:bounceIn 0.5s ease 0.1s both;">${icon}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Streak Milestone</div>
      <h2 style="font-family:'Fraunces',serif;font-size:1.5rem;color:var(--ink);margin-bottom:10px;">${days}-Day Streak!</h2>
      <p style="font-size:0.88rem;color:var(--ink-faint);line-height:1.6;margin-bottom:24px;">${message}</p>
      <button id="streak-celebrate-close" style="
        background:var(--accent);color:#0a0013;border:none;border-radius:999px;
        padding:12px 28px;font-size:0.9rem;font-weight:700;cursor:pointer;width:100%;
      ">Keep it going! 🚀</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => overlay.remove(), 200);
  };
  document.getElementById('streak-celebrate-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  setTimeout(close, 8000); // auto-dismiss
}

function launchStreakConfetti(days) {
  const count  = days >= 30 ? 120 : days >= 7 ? 80 : 50;
  const colors = ['hsl(270 90% 70%)','hsl(200 100% 60%)','hsl(142 68% 50%)','hsl(40 95% 58%)','hsl(0 82% 62%)','#fff'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:fixed;top:-10px;pointer-events:none;z-index:10000;
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${Math.random()*8+5}px;height:${Math.random()*8+5}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation:confettiFall ${(Math.random()*2+1.5).toFixed(2)}s ease-in ${(Math.random()*0.6).toFixed(2)}s forwards;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3500);
  }
}

// ══════════════════════════════════════════════════════════════
// 2. TODAY'S LESSON PROGRESS
// ══════════════════════════════════════════════════════════════

const LESSON_KEY = 'aiChallenge_lessonProgress';

function getLessonProgress() {
  const today = todayStr();
  try {
    const raw = localStorage.getItem(LESSON_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) return data;
    }
  } catch (_) { /* fall through */ }
  return { date: today, completed: [false, false, false] };
}

function saveLessonProgress(progress) {
  try {
    localStorage.setItem(LESSON_KEY, JSON.stringify(progress));
  } catch (_) { /* storage unavailable */ }
}

function updateLessonCounter(progress) {
  const done = progress.completed.filter(Boolean).length;
  const el   = document.getElementById('lessons-done');
  if (el) el.textContent = done;
}

function triggerAllLessonsComplete() {
  // Show inline banner if all 3 are done
  let banner = document.querySelector('.learn-complete-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'learn-complete-banner';
    const lessonsSection = document.getElementById('lessons-section');
    if (lessonsSection) {
      lessonsSection.appendChild(banner);
    }
  }
  banner.innerHTML = '🎉 Lessons done! Now take the quiz <a href="/">→</a>';
  banner.style.display = 'block';

  // Small celebration animation: briefly flash the counter
  const counter = document.getElementById('lessons-done');
  if (counter) {
    counter.classList.add('lessons-complete-flash');
    setTimeout(() => counter.classList.remove('lessons-complete-flash'), 1200);
  }
}

// ══════════════════════════════════════════════════════════════
// 3. AI TRENDS
// ══════════════════════════════════════════════════════════════

async function loadTrends() {
  const grid = document.getElementById('trends-grid');
  if (!grid) return;

  try {
    const res  = await fetch('/api/ai-trends');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const trends  = Array.isArray(data) ? data : (data.trends || data.items || []);
    const fallback = data.fallback === true;

    if (!trends || trends.length === 0) {
      grid.innerHTML = buildTrendErrorCard('No trends available right now. 🔄 Try refreshing.');
      return;
    }

    let html = trends.map(t => buildTrendCard(t)).join('');

    if (fallback) {
      html += `<p class="trends-fallback-note">✨ AI-curated selection</p>`;
    }

    grid.innerHTML = html;

  } catch (err) {
    console.error('loadTrends error:', err);
    grid.innerHTML = buildTrendErrorCard('Could not load trends. 🔄 Try refreshing the page.');
  }
}

function buildTrendCard(t) {
  const linkHtml = t.source_url
    ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer" class="trend-link">Read more →</a>`
    : '';
  return `
    <div class="trend-card">
      <div class="trend-emoji">${escapeHtml(t.emoji || '🤖')}</div>
      <div class="trend-headline">${escapeHtml(t.headline || t.title || '')}</div>
      <div class="trend-summary">${escapeHtml(t.plain_english || t.summary || '')}</div>
      <div class="trend-why">💡 ${escapeHtml(t.why_it_matters || t.why || '')}</div>
      <div class="trend-footer">
        <span class="trend-source">Hacker News</span>
        ${linkHtml}
      </div>
    </div>`;
}

function buildTrendErrorCard(message) {
  return `
    <div class="trend-card trend-card-error">
      <div class="trend-emoji">⚠️</div>
      <div class="trend-headline">Trends unavailable</div>
      <div class="trend-summary">${escapeHtml(message)}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// 4. DAILY LESSONS
// ══════════════════════════════════════════════════════════════

async function loadLessons() {
  const list = document.getElementById('lessons-list');
  if (!list) return;

  const progress = getLessonProgress();

  try {
    const res  = await fetch('/api/daily-lesson');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const lessons = Array.isArray(data) ? data : (data.lessons || data.items || []);

    if (!lessons || lessons.length === 0) {
      list.innerHTML = buildLessonErrorCard('No lessons available right now. Please try again later.');
      return;
    }

    // Set topic badge
    const topicBadge = document.getElementById('lesson-topic-badge');
    if (topicBadge) {
      let topic = '';
      if (data.topic) {
        topic = data.topic;
      } else if (data.metadata && data.metadata.topic) {
        topic = data.metadata.topic;
      } else if (lessons[0] && lessons[0].topic) {
        topic = lessons[0].topic;
      } else if (lessons[0] && lessons[0].title) {
        // Derive from first lesson title — take first 3 words
        topic = lessons[0].title.split(' ').slice(0, 3).join(' ') + '…';
      }
      topicBadge.textContent = topic || 'Today\'s AI Topic';
    }

    // Render lesson cards
    list.innerHTML = lessons.slice(0, 3).map((lesson, i) => {
      const completed = progress.completed[i] || false;
      return buildLessonCard(lesson, i, completed);
    }).join('');

    // Bind mark-as-read buttons
    list.querySelectorAll('.btn-mark-read').forEach(btn => {
      btn.addEventListener('click', () => handleMarkRead(btn));
    });

    // Update counter
    updateLessonCounter(progress);

    // Show completion banner if all done on load
    if (progress.completed.every(Boolean)) {
      triggerAllLessonsComplete();
    }

  } catch (err) {
    console.error('loadLessons error:', err);
    list.innerHTML = buildLessonErrorCard('Could not load lessons. Please try again later.');
  }
}

function buildLessonCard(lesson, i, completed) {
  const numLabel = String(i + 1).padStart(2, '0');
  return `
    <div class="lesson-card ${completed ? 'lesson-done' : ''}" data-index="${i}" role="listitem">
      <div class="lc-panel">
        <span class="lc-emoji">${escapeHtml(lesson.emoji || '📖')}</span>
        <span class="lc-num">${numLabel}</span>
      </div>
      <div class="lc-content">
        <h3 class="lesson-title">${escapeHtml(lesson.title || '')}</h3>
        <p class="lesson-explanation">${escapeHtml(lesson.explanation || lesson.description || '')}</p>
        <div class="lesson-realworld">🌍 <strong>Real world:</strong> ${escapeHtml(lesson.real_world || lesson.realWorld || '')}</div>
        <div class="lesson-funfact">💡 <strong>Did you know?</strong> ${escapeHtml(lesson.fun_fact || lesson.funFact || lesson.did_you_know || '')}</div>
        <div class="lesson-footer">
          <button class="btn-mark-read ${completed ? 'done' : ''}" data-index="${i}" aria-pressed="${completed}">
            ${completed ? '✅ Completed' : 'Mark as read'}
          </button>
        </div>
      </div>
    </div>`;
}

function buildLessonErrorCard(message) {
  return `
    <div class="lesson-card lesson-card-error" role="listitem">
      <div class="lesson-header">
        <span class="lesson-num">!</span>
        <span class="lesson-emoji">⚠️</span>
        <h3 class="lesson-title">Lessons Unavailable</h3>
      </div>
      <p class="lesson-explanation">${escapeHtml(message)}</p>
    </div>`;
}

function handleMarkRead(btn) {
  const idx      = parseInt(btn.dataset.index, 10);
  const progress = getLessonProgress();

  // Toggle
  progress.completed[idx] = !progress.completed[idx];
  saveLessonProgress(progress);

  const card = document.querySelector(`.lesson-card[data-index="${idx}"]`);

  if (progress.completed[idx]) {
    btn.textContent = '✅ Completed';
    btn.classList.add('done');
    btn.setAttribute('aria-pressed', 'true');
    if (card) card.classList.add('lesson-done');
  } else {
    btn.textContent = 'Mark as read';
    btn.classList.remove('done');
    btn.setAttribute('aria-pressed', 'false');
    if (card) card.classList.remove('lesson-done');

    // Hide any completion banner if user un-marks
    const banner = document.querySelector('.learn-complete-banner');
    if (banner) banner.style.display = 'none';
  }

  updateLessonCounter(progress);

  // Update stats strip
  const streakData = getStreakData();
  renderStatsStrip(streakData);

  // Check if all 3 now complete
  if (progress.completed.every(Boolean)) {
    triggerAllLessonsComplete();
  }
}

// ══════════════════════════════════════════════════════════════
// 5. MILESTONE PROGRESS BAR — rendered inside renderStreak()
//    via renderMilestoneBar() defined above.
//
//    Visual structure produced:
//    Day 1 ──[current]── ⚡3 ──────── 🔥7 ──────── 💪30 ──────── 👑100
// ══════════════════════════════════════════════════════════════
// (See renderMilestoneBar function above — section 1.)

// ══════════════════════════════════════════════════════════════
// 6. INIT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Apply theme immediately (belt-and-suspenders alongside the inline script)
  applyTheme();

  // Streak
  const streak = updateStreak();
  renderStreak(streak);
  checkMilestone(streak);

  // Content
  loadTrends();
  loadLessons();
});
