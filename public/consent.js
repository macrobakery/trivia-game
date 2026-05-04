// ============================================================
// AI Challenge — Consent + Privacy banner
// Shared across every page. Stores decision in localStorage so the
// banner only appears on the first visit.
// ============================================================
(function () {
  'use strict';

  const STORAGE_KEY = 'analytics_consent';

  // ── Public helper used to gate any /api/analytics/event calls ──
  window.canTrackAnalytics = function () {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'accepted';
    } catch (_) {
      return false;
    }
  };

  // Don't render the banner on the policy pages themselves.
  const path = location.pathname.toLowerCase();
  if (path.endsWith('/privacy.html') || path.endsWith('/terms.html')) return;

  // Already decided — nothing to render.
  let current;
  try { current = localStorage.getItem(STORAGE_KEY); } catch (_) { current = null; }
  if (current === 'accepted' || current === 'declined') return;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function persist(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (_) {}
  }

  ready(function () {
    if (document.getElementById('consent-banner')) return; // guard against duplicates

    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and analytics consent');
    banner.innerHTML =
      '<div class="consent-text">' +
        'We use minimal analytics to count games played and improve the app. ' +
        'No ads, no third parties. ' +
        '<a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>' +
      '</div>' +
      '<div class="consent-actions">' +
        '<button type="button" class="btn-ghost-sm" id="consent-decline">Decline</button>' +
        '<button type="button" class="btn-primary"  id="consent-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(banner);

    requestAnimationFrame(() => banner.classList.add('visible'));

    function close(value) {
      persist(value);
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 220);
    }

    banner.querySelector('#consent-accept').addEventListener('click', () => close('accepted'));
    banner.querySelector('#consent-decline').addEventListener('click', () => close('declined'));
  });
})();
