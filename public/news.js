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

// ── Render ────────────────────────────────────────────────────

/**
 * Build the HTML string for a single news card.
 * @param {{ headline: string, emoji: string, plain_english: string, why_it_matters: string, source_url: string }} trend
 * @param {number} index  0-based card index (unused visually but kept for future use)
 * @returns {string} HTML string
 */
function renderCard(trend, index) {
  const emoji        = escapeHtml(trend.emoji || '📌');
  const headline     = escapeHtml(trend.headline || 'Untitled');
  const plainEnglish = escapeHtml(trend.plain_english || '');
  const whyItMatters = escapeHtml(trend.why_it_matters || '');
  const sourceUrl    = trend.source_url || '';

  const linkHtml = sourceUrl
    ? `<a class="news-card-link"
          href="${escapeHtml(sourceUrl)}"
          target="_blank"
          rel="noopener noreferrer">
         Read more <span class="news-card-link-arrow">→</span>
       </a>`
    : '';

  const whyHtml = whyItMatters
    ? `<p class="news-card-why-label">Why it matters</p>
       <p class="news-card-why">${whyItMatters}</p>`
    : '';

  return `
    <article class="news-card">
      <span class="news-card-emoji">${emoji}</span>
      <h2 class="news-card-headline">${headline}</h2>
      <p class="news-card-plain">${plainEnglish}</p>
      ${whyHtml}
      ${linkHtml}
    </article>
  `;
}

/**
 * Populate the grid, date label, and source badge from API data.
 * @param {{ trends: Array, source: string, fallback: boolean, date: string }} data
 */
function renderNews(data) {
  const grid     = document.getElementById('news-grid');
  const dateEl   = document.getElementById('news-date');
  const sourceEl = document.getElementById('news-source');

  // Format date — data.date is expected to be an ISO date string (YYYY-MM-DD or full ISO)
  if (data.date) {
    const d = new Date(data.date);
    // Guard against invalid dates returned by the API
    if (!isNaN(d.getTime())) {
      dateEl.textContent = d.toLocaleDateString('en-US', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
        // Avoid timezone shift on bare YYYY-MM-DD by treating as local
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

  // Source label
  sourceEl.textContent = data.fallback
    ? 'AI-curated picks'
    : 'Hacker News + Claude';

  // Render cards
  const trends = Array.isArray(data.trends) ? data.trends : [];
  if (trends.length === 0) {
    grid.innerHTML = `<p style="color:var(--ink-faint);text-align:center;padding:32px 0">No stories available right now.</p>`;
    return;
  }

  grid.innerHTML = trends.map((trend, i) => renderCard(trend, i)).join('');
}

// ── Data fetching ─────────────────────────────────────────────

async function loadNews() {
  const grid     = document.getElementById('news-grid');
  const errorBox = document.getElementById('news-error');
  const dateEl   = document.getElementById('news-date');
  const sourceEl = document.getElementById('news-source');

  // Reset to skeleton state
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

// ── Button wiring ─────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', () => {
  loadNews();
});

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
