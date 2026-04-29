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
  const badge    = document.getElementById('news-unread-badge');
  const markBtn  = document.getElementById('news-mark-all-btn');
  const progRow  = document.getElementById('news-read-progress-row');
  const progBar  = document.getElementById('news-read-progress-bar');
  const progLbl  = document.getElementById('news-read-progress-label');

  const all       = _cachedTrends || [];
  const total     = all.length;
  const readCnt   = all.filter(t => isRead(t.headline)).length;
  const unreadCnt = total - readCnt;

  // Unread badge
  if (badge) {
    if (unreadCnt > 0) {
      badge.textContent   = unreadCnt;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Mark-all button: show only when there are unread items
  if (markBtn) {
    markBtn.style.display = (total > 0 && unreadCnt > 0) ? '' : 'none';
  }

  // Reading progress bar + label
  if (progRow && total > 0) {
    progRow.style.display = 'flex';
    const pct = Math.round((readCnt / total) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progLbl) {
      if (readCnt === total) {
        progLbl.textContent = '✓ All read';
        if (progBar) progBar.style.background = 'var(--green)';
      } else {
        progLbl.textContent = `${readCnt} / ${total} read`;
        if (progBar) progBar.style.background = '';
      }
    }
  } else if (progRow) {
    progRow.style.display = 'none';
  }
}

// ── Active filter + search ────────────────────────────────────

let _activeFilter  = 'all';
let _cachedTrends  = [];
let _searchQuery   = '';

function setFilter(f) {
  _activeFilter = f;
  document.querySelectorAll('.news-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === f);
  });
  applyFilter();
}

function applyFilter() {
  const q     = _searchQuery.trim().toLowerCase();
  const cards = document.querySelectorAll('.news-card:not(.skeleton-card)');

  cards.forEach(card => {
    const headline = card.dataset.headline || '';
    let show = true;

    // Filter check
    if (_activeFilter === 'unread')     show = !isRead(headline);
    if (_activeFilter === 'bookmarked') show = isBookmarked(headline);

    // Search check (headline + body text)
    if (show && q) {
      const fullText = (card.textContent || '').toLowerCase();
      show = fullText.includes(q);
    }

    card.style.display = show ? '' : 'none';
  });

  // Empty state message
  const visible = [...document.querySelectorAll('.news-card:not(.skeleton-card)')].filter(c => c.style.display !== 'none');
  const grid = document.getElementById('news-grid');

  // Remove old empty messages
  grid.querySelectorAll('.news-filter-empty, .news-search-no-results').forEach(e => e.remove());

  if (visible.length === 0) {
    const msg = document.createElement('p');
    if (q) {
      msg.className   = 'news-search-no-results';
      msg.textContent = `No stories matching "${_searchQuery}".`;
    } else if (_activeFilter !== 'all') {
      msg.className = 'news-filter-empty';
      const label = _activeFilter === 'unread' ? 'unread stories' : 'saved stories';
      msg.textContent = `No ${label} right now.`;
    }
    if (msg.textContent) grid.appendChild(msg);
  }
}

// ── Wire search input ─────────────────────────────────────────

(function initSearch() {
  const input    = document.getElementById('news-search-input');
  const clearBtn = document.getElementById('news-search-clear');
  if (!input) return;

  input.addEventListener('input', () => {
    _searchQuery = input.value;
    if (clearBtn) clearBtn.style.display = _searchQuery ? '' : 'none';
    applyFilter();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value  = '';
      _searchQuery = '';
      clearBtn.style.display = 'none';
      input.focus();
      applyFilter();
    });
  }
})();

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

// ── Client-side session cache ─────────────────────────────────
const NEWS_CACHE_KEY = 'aiChallenge_newsCache';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadCachedNews() {
  try {
    const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || 'null');
    if (cached && cached.date === getTodayStr() && cached.data) return cached.data;
  } catch {}
  return null;
}

function saveNewsCache(data) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ date: getTodayStr(), data }));
  } catch {}
}

async function loadNews(forceRefresh = false) {
  const grid     = document.getElementById('news-grid');
  const errorBox = document.getElementById('news-error');
  const dateEl   = document.getElementById('news-date');
  const sourceEl = document.getElementById('news-source');

  errorBox.style.display = 'none';

  // Use cached news if available and not force-refreshing
  if (!forceRefresh) {
    const cached = loadCachedNews();
    if (cached) {
      renderNews(cached);
      return;
    }
  }

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
    saveNewsCache(data); // persist for the rest of the day
    renderNews(data);
  } catch (err) {
    console.error('[news] Failed to load:', err);
    grid.innerHTML = '';
    errorBox.style.display = 'flex';
  }
}

// ── Mark all read ─────────────────────────────────────────────

function markAllRead() {
  const trends = _cachedTrends || [];
  if (trends.length === 0) return;

  const s = getReadSet();
  trends.forEach(t => s.add(t.headline));
  saveReadSet(s);

  // Track daily goals (mark news read date)
  try {
    const d   = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    localStorage.setItem('aiChallenge_lastNewsRead', str);
  } catch {}

  // Update all cards visually
  document.querySelectorAll('.news-card:not(.skeleton-card)').forEach(card => {
    const hl = card.dataset.headline || '';
    if (!hl) return;
    card.classList.add('news-card-read');
    const actions = card.querySelector('.news-card-actions');
    if (actions && !actions.querySelector('.news-read-badge')) {
      const badge = document.createElement('span');
      badge.className = 'news-read-badge';
      badge.textContent = '✓ Read';
      actions.prepend(badge);
    }
  });

  // If currently on unread filter, show empty state
  if (_activeFilter === 'unread') applyFilter();

  updateUnreadBadge();

  // Visual feedback on the button
  const btn = document.getElementById('news-mark-all-btn');
  if (btn) {
    btn.textContent = '✓ Done!';
    btn.style.display = 'none';
    setTimeout(() => updateUnreadBadge(), 600);
  }
}

// ── Filter bar wiring ─────────────────────────────────────────

document.getElementById('news-filter-bar').addEventListener('click', e => {
  const btn = e.target.closest('.news-filter-btn');
  if (!btn) return;
  setFilter(btn.dataset.filter);
});

document.getElementById('news-mark-all-btn').addEventListener('click', markAllRead);

// ── Button wiring ─────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', () => { loadNews(true); });
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

// ── Back to top ───────────────────────────────────────────────

(function initBackToTop() {
  const btn = document.getElementById('news-btt-btn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ── Keyboard navigation ───────────────────────────────────────
// J / K  — next / previous card (scrolls to and highlights card)
// B      — bookmark focused card
// R      — mark focused card as read
// O      — open article link
// /      — focus the search input

(function initKeyboardNav() {
  let _focusedIdx = -1;

  function getVisibleCards() {
    return [...document.querySelectorAll('.news-card:not(.skeleton-card)')]
      .filter(c => c.style.display !== 'none');
  }

  function focusCard(idx) {
    const cards = getVisibleCards();
    if (!cards.length) return;
    _focusedIdx = Math.max(0, Math.min(cards.length - 1, idx));

    // Remove previous focus highlight
    document.querySelectorAll('.news-card.kb-focused').forEach(c => c.classList.remove('kb-focused'));

    const card = cards[_focusedIdx];
    card.classList.add('kb-focused');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('keydown', e => {
    // Ignore when user is typing in an input
    if (e.target.matches('input, textarea, select, [contenteditable]')) return;
    // Ignore modifier combos
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();

    if (key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('news-search-input');
      if (searchInput) { searchInput.focus(); searchInput.select(); }
      return;
    }

    if (key === 'j' || key === 'arrowdown') {
      e.preventDefault();
      const cards = getVisibleCards();
      focusCard(_focusedIdx < 0 ? 0 : _focusedIdx + 1);
      return;
    }
    if (key === 'k' || key === 'arrowup') {
      e.preventDefault();
      focusCard(_focusedIdx <= 0 ? 0 : _focusedIdx - 1);
      return;
    }

    if (_focusedIdx < 0) return;
    const card = getVisibleCards()[_focusedIdx];
    if (!card) return;

    if (key === 'b') {
      // Toggle bookmark
      e.preventDefault();
      card.querySelector('.news-bm-btn')?.click();
      return;
    }
    if (key === 'r') {
      // Mark as read
      e.preventDefault();
      const hl = card.dataset.headline || '';
      if (hl && !isRead(hl)) {
        markRead(hl);
        card.classList.add('news-card-read');
        const actions = card.querySelector('.news-card-actions');
        if (actions && !actions.querySelector('.news-read-badge')) {
          const badge = document.createElement('span');
          badge.className = 'news-read-badge';
          badge.textContent = '✓ Read';
          actions.prepend(badge);
        }
        updateUnreadBadge();
      }
      return;
    }
    if (key === 'o' || key === 'enter') {
      // Open article link
      e.preventDefault();
      const link = card.querySelector('.news-card-link');
      if (link) { link.click(); }
      return;
    }
  });

  // Show keyboard hint on desktop
  const hint = document.getElementById('news-kb-hint');
  if (hint && !('ontouchstart' in window)) hint.style.display = 'block';
})();

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadNews();
});
