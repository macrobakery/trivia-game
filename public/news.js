// ============================================================
// AI News Page — news.js
// ============================================================

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Theme ─────────────────────────────────────────────────────

function applyTheme() {
  const theme = localStorage.getItem('aiChallenge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  const metaEl = document.querySelector('meta[name="theme-color"]');
  if (metaEl) {
    metaEl.setAttribute('content', theme === 'dark' ? '#07060c' : '#f0eff8');
  }

  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem('aiChallenge_theme', next);
  applyTheme();
});

applyTheme();

// ── Read / Bookmark persistence ───────────────────────────────

const READ_KEY     = 'aiChallenge_newsRead';      // Set of headline strings
const BOOKMARK_KEY = 'aiChallenge_newsBookmarks'; // Array of trend objects

function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch { return new Set(); }
}
function saveReadSet(s) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch {}
}
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); } catch { return []; }
}
function saveBookmarks(arr) {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(arr)); } catch {}
}

function isRead(headline) { return getReadSet().has(headline); }
function isBookmarked(headline) { return getBookmarks().some(b => b.headline === headline); }

function markRead(headline) {
  const s = getReadSet();
  s.add(headline);
  saveReadSet(s);
  updateUnreadBadge();
  // Track for daily goals
  try {
    const d = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    localStorage.setItem('aiChallenge_lastNewsRead', str);
  } catch {}
}

function toggleBookmark(trend) {
  const bms = getBookmarks();
  const idx = bms.findIndex(b => b.headline === trend.headline);
  if (idx !== -1) {
    bms.splice(idx, 1);
  } else {
    bms.push({ headline: trend.headline, source_url: trend.source_url,
               plain_english: trend.plain_english, emoji: trend.emoji, savedAt: Date.now() });
  }
  saveBookmarks(bms);
}

function updateUnreadBadge() {
  const badge = document.getElementById('news-unread-badge');
  if (!badge) return;
  const all       = _cachedTrends || [];
  const unreadCnt = all.filter(t => !isRead(t.headline)).length;
  if (unreadCnt > 0) {
    badge.textContent    = unreadCnt;
    badge.style.display  = 'inline-flex';
  } else {
    badge.style.display  = 'none';
  }
}

// ── Active filter ─────────────────────────────────────────────

let _activeFilter  = 'all';
let _cachedTrends  = [];

function setFilter(f) {
  _activeFilter = f;
  document.querySelectorAll('.news-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === f);
  });
  applyFilter();
}

function applyFilter() {
  const cards = document.querySelectorAll('.news-card:not(.skeleton-card)');
  cards.forEach(card => {
    const headline = card.dataset.headline || '';
    let show = true;
    if (_activeFilter === 'unread')     show = !isRead(headline);
    if (_activeFilter === 'bookmarked') show = isBookmarked(headline);
    card.style.display = show ? '' : 'none';
  });

  // Empty state message
  const visible = [...document.querySelectorAll('.news-card:not(.skeleton-card)')].filter(c => c.style.display !== 'none');
  const grid = document.getElementById('news-grid');
  const existing = grid.querySelector('.news-filter-empty');
  if (existing) existing.remove();

  if (visible.length === 0 && _activeFilter !== 'all') {
    const msg = document.createElement('p');
    msg.className = 'news-filter-empty';
    const label = _activeFilter === 'unread' ? 'unread stories' : 'saved stories';
    msg.textContent = `No ${label} right now.`;
    grid.appendChild(msg);
  }
}

// ── Render ────────────────────────────────────────────────────

/**
 * Estimate reading time in minutes (200 wpm average).
 */
function estimateReadTime(text) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Build the HTML string for a single news card.
 */
function renderCard(trend, index) {
  const emoji        = trend.emoji || '📌';
  const headline     = trend.headline || 'Untitled';
  const plainEnglish = escapeHtml(trend.plain_english || '');
  const whyItMatters = escapeHtml(trend.why_it_matters || '');
  const sourceUrl    = trend.source_url || '';
  const read         = isRead(headline);
  const bookmarked   = isBookmarked(headline);

  // Reading time estimate (plain_english + why_it_matters combined)
  const rawText    = (trend.plain_english || '') + ' ' + (trend.why_it_matters || '');
  const readMins   = estimateReadTime(rawText);
  const readTimeHtml = `<span class="news-card-readtime">⏱ ${readMins} min read</span>`;

  const linkHtml = sourceUrl
    ? `<a class="news-card-link news-read-link"
          href="${escapeHtml(sourceUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          data-headline="${escapeHtml(headline)}">
         Read more <span class="news-card-link-arrow">→</span>
       </a>`
    : '';

  const alexQ    = encodeURIComponent(`Can you explain this AI news story to me? "${headline}"`);
  const alexHtml = `<a class="news-ask-alex" href="/chat.html?q=${alexQ}" title="Ask Alex to explain this story">🤖 Ask Alex</a>`;

  const whyHtml = whyItMatters
    ? `<p class="news-card-why-label">Why it matters</p>
       <p class="news-card-why">${whyItMatters}</p>`
    : '';

  const readBadge = read
    ? `<span class="news-read-badge">✓ Read</span>`
    : '';

  const bmIcon = bookmarked ? '🔖' : '🤍';
  const bmTitle = bookmarked ? 'Remove bookmark' : 'Save article';

  const shareHtml = (navigator.share && sourceUrl)
    ? `<button class="news-share-btn" data-headline="${escapeHtml(headline)}" data-url="${escapeHtml(sourceUrl)}" title="Share this story" aria-label="Share">📤</button>`
    : '';

  return `
    <article class="news-card${read ? ' news-card-read' : ''}" data-headline="${escapeHtml(headline)}">
      <div class="news-card-top-row">
        <span class="news-card-emoji">${escapeHtml(emoji)}</span>
        <div class="news-card-actions">
          ${readBadge}
          ${readTimeHtml}
          ${shareHtml}
          <button class="news-bm-btn" data-headline="${escapeHtml(headline)}" title="${bmTitle}" aria-label="${bmTitle}">${bmIcon}</button>
        </div>
      </div>
      <h2 class="news-card-headline">${escapeHtml(headline)}</h2>
      <p class="news-card-plain">${plainEnglish}</p>
      ${whyHtml}
      <div class="news-card-footer">
        ${linkHtml}
        ${alexHtml}
      </div>
    </article>
  `;
}

/**
 * Populate the grid, date label, and source badge from API data.
 */
function renderNews(data) {
  const grid     = document.getElementById('news-grid');
  const dateEl   = document.getElementById('news-date');
  const sourceEl = document.getElementById('news-source');

  if (data.date) {
    const d = new Date(data.date);
    if (!isNaN(d.getTime())) {
      dateEl.textContent = d.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } else {
      dateEl.textContent = data.date;
    }
  } else {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  sourceEl.textContent = data.fallback ? 'AI-curated picks' : 'Hacker News + Claude';

  const trends = Array.isArray(data.trends) ? data.trends : [];
  _cachedTrends = trends;

  // Update subtitle story count
  const countSubEl = document.getElementById('news-count-sub');
  if (countSubEl && trends.length > 0) {
    countSubEl.textContent = ` · ${trends.length} ${trends.length === 1 ? 'story' : 'stories'}`;
  }

  if (trends.length === 0) {
    grid.innerHTML = `<p style="color:var(--ink-faint);text-align:center;padding:32px 0">No stories available right now.</p>`;
    return;
  }

  grid.innerHTML = trends.map((trend, i) => renderCard(trend, i)).join('');

  // Wire bookmark buttons
  grid.querySelectorAll('.news-bm-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const hl    = btn.dataset.headline;
      const trend = trends.find(t => t.headline === hl);
      if (!trend) return;
      toggleBookmark(trend);
      const card     = btn.closest('.news-card');
      const nowSaved = isBookmarked(hl);
      btn.textContent = nowSaved ? '🔖' : '🤍';
      btn.title       = nowSaved ? 'Remove bookmark' : 'Save article';
      if (_activeFilter === 'bookmarked' && !nowSaved) {
        card.style.display = 'none';
      }
    });
  });

  // Wire read tracking on "Read more" links
  grid.querySelectorAll('.news-read-link').forEach(link => {
    link.addEventListener('click', () => {
      const hl   = link.dataset.headline;
      const card = link.closest('.news-card');
      markRead(hl);
      if (card) {
        card.classList.add('news-card-read');
        const existing = card.querySelector('.news-read-badge');
        if (!existing) {
          const badge = document.createElement('span');
          badge.className = 'news-read-badge';
          badge.textContent = '✓ Read';
          card.querySelector('.news-card-actions')?.prepend(badge);
        }
        if (_activeFilter === 'unread') card.style.display = 'none';
      }
    });
  });

  // Wire share buttons
  grid.querySelectorAll('.news-share-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const hl  = btn.dataset.headline;
      const url = btn.dataset.url;
      try {
        await navigator.share({ title: hl, url });
      } catch (_) { /* user cancelled or not supported */ }
    });
  });

  updateUnreadBadge();
  applyFilter();
}

// ── Data fetching ─────────────────────────────────────────────

async function loadNews() {
  const grid     = document.getElementById('news-grid');
  const errorBox = document.getElementById('news-error');
  const dateEl   = document.getElementById('news-date');
  const sourceEl = document.getElementById('news-source');

  errorBox.style.display = 'none';
  dateEl.textContent     = 'Loading…';
  sourceEl.textContent   = '';
  grid.innerHTML = `
    <div class="news-card skeleton-card">
      <div class="skel skel-title"></div>
      <div class="skel skel-body"></div>
      <div class="skel skel-body short"></div>
    </div>
    <div class="news-card skeleton-card">
      <div class="skel skel-title"></div>
      <div class="skel skel-body"></div>
      <div class="skel skel-body short"></div>
    </div>
    <div class="news-card skeleton-card">
      <div class="skel skel-title"></div>
      <div class="skel skel-body"></div>
      <div class="skel skel-body short"></div>
    </div>
  `;

  try {
    const res = await fetch('/api/ai-trends');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderNews(data);
  } catch (err) {
    console.error('[news] Failed to load:', err);
    grid.innerHTML = '';
    errorBox.style.display = 'flex';
  }
}

// ── Filter bar wiring ─────────────────────────────────────────

document.getElementById('news-filter-bar').addEventListener('click', e => {
  const btn = e.target.closest('.news-filter-btn');
  if (!btn) return;
  setFilter(btn.dataset.filter);
});

// ── Button wiring ─────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', () => { loadNews(); });
document.getElementById('retry-btn').addEventListener('click', () => {
  document.getElementById('news-error').style.display = 'none';
  loadNews();
});

// ── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadNews();
});
