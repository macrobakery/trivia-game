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
  { id: 'first_win',     icon: '🎯', name: 'First Win',      desc: 'Complete any round'                    },
  { id: 'perfect',       icon: '💎', name: 'Perfect Score',   desc: 'Score 10/10 correct'                  },
  { id: 'speed_demon',   icon: '⚡', name: 'Speed Demon',     desc: 'Finish round with avg >8s remaining'   },
  { id: 'veteran',       icon: '🎖️', name: 'Veteran',         desc: 'Play 10 rounds'                       },
  { id: 'streak_legend', icon: '🔥', name: 'Streak Legend',   desc: 'Get a 5-answer streak'                },
  { id: 'scholar',       icon: '📚', name: 'Scholar',         desc: 'Complete all 5 topic levels'          },
  { id: 'ai_master',     icon: '🧠', name: 'AI Master',       desc: '90%+ accuracy on Advanced difficulty' },
  { id: 'centurion',     icon: '💯', name: 'Centurion',       desc: 'Score 1000+ points in a single round' },
];

const LEVELS = [
  { name: 'AI Foundations',                 glyph: '◐', num: 'Level 1' },
  { name: 'Data Preparation',               glyph: '◇', num: 'Level 2' },
  { name: 'Model Building',                 glyph: '◈', num: 'Level 3' },
  { name: 'AI App Development',             glyph: '◉', num: 'Level 4' },
  { name: 'Deployment and Responsible AI',  glyph: '✦', num: 'Level 5' },
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

  // Best quiz correctCount proxy: use topScore mapping or just show first badge
  // We don't store per-game correctCount, so derive from achStats
  const topScore = achStats.topScore || 0;
  // Map topScore → approximate correct count for badge (rough: 100pts/q beginner)
  const badge = BADGES[BADGES.length - 1]; // show highest unlocked or just highest
  // Better: check achievements to derive badge
  const unlocked = read('aiChallenge_unlocked', []);
  let badgeObj = BADGES[0];
  if (achStats.perfectScores >= 1) badgeObj = BADGES[3];
  else if (topScore >= 700) badgeObj = BADGES[2];
  else if (topScore >= 400) badgeObj = BADGES[1];

  $('prof-avatar').textContent    = badgeObj.icon;
  $('prof-name').textContent      = escapeHtml(name);
  $('prof-badge-name').textContent = badgeObj.name;
  $('prof-games-played').textContent = `${games} game${games !== 1 ? 's' : ''} played`;
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

// ── Achievements ───────────────────────────────────────────────
function renderAchievements() {
  const unlocked = read('aiChallenge_unlocked', []);
  const achCount = $('ach-count');
  if (achCount) achCount.textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`;

  $('prof-ach-grid').innerHTML = ACHIEVEMENTS.map(ach => `
    <div class="prof-ach-chip ${unlocked.includes(ach.id) ? 'unlocked' : ''}">
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

// ── Init ───────────────────────────────────────────────────────
renderHeader();
renderStats();
renderCalendar();
renderLevelRecords();
renderAchievements();
renderDailyChallenge();

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
