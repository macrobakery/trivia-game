// ============================================================
// AI Challenge — First-Visit Onboarding Tour
// ============================================================

const TOUR_KEY = 'aiChallenge_toured_v2';

const TOUR_STEPS = [
  {
    target:   null,
    title:    'Welcome to AI Challenge! 👋',
    text:     "You've just found your daily AI learning platform — live quizzes, today's AI news, bite-sized lessons, and a personal AI tutor. This 30-second tour will show you everything.",
    position: 'center'
  },
  {
    target:   '#daily-hub-btn',
    title:    'Start here every day 🔥',
    text:     "The Daily Learning Hub shows today's real AI trends from the web + 3 micro-lessons generated fresh each morning. Visit daily to build your streak!",
    position: 'bottom'
  },
  {
    target:   '.levels-grid',
    title:    '5 learning levels 📚',
    text:     'From AI Foundations to Deployment & Ethics — each with Beginner, Intermediate, and Advanced difficulty. Your best scores are saved and shown on each card.',
    position: 'bottom'
  },
  {
    target:   '#daily-challenge-btn',
    title:    'Compete globally 🏆',
    text:     'Everyone worldwide gets the same 10 questions each day. Submit your score to see your global rank. Resets every 24 hours.',
    position: 'top'
  },
  {
    target:   '.chat-fab',
    title:    'Meet Alex — your AI tutor 🤖',
    text:     'Stuck on a concept? Ask Alex anything and get beginner-friendly explanations, powered by Claude AI. Available from every page.',
    position: 'top'
  }
];

let _tourStep = 0;
let _tourActive = false;

// ── Public API ─────────────────────────────────────────────────
function startTour(force = false) {
  if (!force && localStorage.getItem(TOUR_KEY)) return;
  if (_tourActive) return;
  _tourActive = true;
  _tourStep   = 0;
  _buildTourDOM();
  _showStep(0);
}

function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

// ── DOM construction ───────────────────────────────────────────
function _buildTourDOM() {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id        = 'tour-overlay';
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.addEventListener('click', e => {
    if (e.target === overlay) _skipTour();
  });

  // Tooltip
  const tip = document.createElement('div');
  tip.id        = 'tour-tooltip';
  tip.className = 'tour-tooltip';
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-modal', 'true');

  document.body.appendChild(overlay);
  document.body.appendChild(tip);
}

// ── Step renderer ──────────────────────────────────────────────
function _showStep(stepIdx) {
  const steps  = TOUR_STEPS;
  if (stepIdx >= steps.length) { _endTour(); return; }

  _tourStep = stepIdx;
  const s      = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const tip    = document.getElementById('tour-tooltip');
  if (!tip) return;

  // Remove previous highlight
  document.querySelectorAll('.tour-highlight').forEach(el => {
    el.classList.remove('tour-highlight');
    el.style.removeProperty('z-index');
    el.style.removeProperty('position');
  });

  // Highlight target
  const target = s.target ? document.querySelector(s.target) : null;
  if (s.target && !target) { _showStep(stepIdx + 1); return; } // skip if not found

  if (target) {
    target.classList.add('tour-highlight');
    // Ensure it pops above the overlay
    const cs = window.getComputedStyle(target);
    if (cs.position === 'static') target.style.position = 'relative';
    target.style.zIndex = '9992';
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Build tooltip content
  const counter = `<div class="tour-counter">${stepIdx + 1} of ${steps.length}</div>`;
  const dots    = steps.map((_, i) =>
    `<span class="tour-dot ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}"></span>`
  ).join('');

  tip.innerHTML = `
    ${counter}
    <div class="tour-dots">${dots}</div>
    <h4 class="tour-title">${s.title}</h4>
    <p class="tour-text">${s.text}</p>
    <div class="tour-actions">
      <button class="btn-ghost-sm tour-skip" id="tour-skip-btn">Skip tour</button>
      <button class="btn-primary tour-next" id="tour-next-btn">
        ${isLast ? "Let's go! 🚀" : 'Next →'}
      </button>
    </div>
  `;

  document.getElementById('tour-next-btn').addEventListener('click', () => _showStep(_tourStep + 1));
  document.getElementById('tour-skip-btn').addEventListener('click', _skipTour);

  // Position tooltip
  _positionTooltip(tip, target, s.position);

  // Fade in — centred steps must NOT have their transform overridden
  if (!target) {
    // Centred: opacity fade only, keep the translate(-50%,-50%) untouched
    tip.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tip.style.transition = 'opacity 0.22s ease';
        tip.style.opacity    = '1';
      });
    });
  } else {
    // Positioned: slide up + fade
    tip.style.opacity   = '0';
    tip.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tip.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        tip.style.opacity    = '1';
        tip.style.transform  = 'translateY(0)';
      });
    });
  }
}

function _positionTooltip(tip, target, hint) {
  if (!target) {
    // Centered on screen
    tip.style.position  = 'fixed';
    tip.style.top       = '50%';
    tip.style.left      = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
    tip.style.width     = '340px';
    tip.style.maxWidth  = 'calc(100vw - 32px)';
    return;
  }

  // Use absolute positioning relative to document
  tip.style.position  = 'fixed';
  tip.style.width     = '320px';
  tip.style.maxWidth  = 'calc(100vw - 32px)';
  tip.style.transform = 'none';

  // Wait for scroll to settle, then calculate
  setTimeout(() => {
    const rect  = target.getBoundingClientRect();
    const tipW  = 320;
    const tipH  = tip.offsetHeight || 200;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const pad   = 12;

    // Horizontal: align with target, clamp to viewport
    let left = rect.left;
    if (left + tipW + pad > vw) left = vw - tipW - pad;
    if (left < pad) left = pad;

    // Vertical: try below, fallback above
    let top;
    if (hint === 'top' || rect.bottom + tipH + pad > vh) {
      top = rect.top - tipH - pad;
      if (top < pad) top = rect.bottom + pad; // flip back if no room above
    } else {
      top = rect.bottom + pad;
    }

    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }, 350);
}

// ── End states ─────────────────────────────────────────────────
function _endTour() {
  localStorage.setItem(TOUR_KEY, '1');
  const tip = document.getElementById('tour-tooltip');
  if (tip) {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.removeProperty('z-index');
      el.style.removeProperty('position');
    });
    tip.innerHTML = `
      <div class="tour-finale">
        <div class="tour-finale-icon">🚀</div>
        <h4 class="tour-title">You're all set!</h4>
        <p class="tour-text">Start with today's Learning Hub, then pick a level and take a quiz. New content every day!</p>
        <button class="btn-primary" id="tour-done-btn" style="width:100%;margin-top:4px">Start learning →</button>
      </div>
    `;
    tip.style.position  = 'fixed';
    tip.style.top       = '50%';
    tip.style.left      = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
    document.getElementById('tour-done-btn').addEventListener('click', _cleanupTour);
  }
  _tourActive = false;
}

function _skipTour() {
  localStorage.setItem(TOUR_KEY, '1');
  _cleanupTour();
  _tourActive = false;
}

function _cleanupTour() {
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-tooltip')?.remove();
  document.querySelectorAll('.tour-highlight').forEach(el => {
    el.classList.remove('tour-highlight');
    el.style.removeProperty('z-index');
    el.style.removeProperty('position');
  });
}

// ── Auto-start on first visit ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem(TOUR_KEY)) {
    // Small delay so the page fully renders first
    setTimeout(() => startTour(), 800);
  }
});
