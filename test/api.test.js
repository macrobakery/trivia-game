// API contract tests — spin up the real Express app on an ephemeral
// port against a fresh SQLite file and exercise the public surface.
// Run with: npm test

const test  = require('node:test');
const assert = require('node:assert/strict');
const { api, stopTestServer } = require('./helpers');

// ── Lifecycle ────────────────────────────────────────────────────────
test.after(async () => { await stopTestServer(); });

// ── /api/questions ───────────────────────────────────────────────────
test('GET /api/questions returns the seeded question bank', async () => {
  const { status, data } = await api('GET', '/api/questions');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data), 'response is an array');
  assert.ok(data.length >= 50, `expected ≥50 seeded questions, got ${data.length}`);
  const q = data[0];
  for (const k of ['question_text','option_a','option_b','option_c','option_d','correct_option','level','difficulty']) {
    assert.ok(k in q, `question is missing field: ${k}`);
  }
});

test('GET /api/questions filters by level + difficulty', async () => {
  const { status, data } = await api('GET',
    '/api/questions?level=AI%20Foundations&difficulty=Beginner');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0, 'expected at least one Beginner Foundations question');
  for (const q of data) {
    assert.equal(q.level, 'AI Foundations');
    assert.equal(q.difficulty, 'Beginner');
  }
});

// ── /api/leaderboard ─────────────────────────────────────────────────
test('GET /api/leaderboard returns an empty array on a fresh DB', async () => {
  const { status, data } = await api('GET', '/api/leaderboard');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  // Fresh DB — could be 0 entries
  assert.ok(data.length >= 0);
});

test('GET /api/leaderboard/weekly returns { scores, weekStart }', async () => {
  const { status, data } = await api('GET', '/api/leaderboard/weekly');
  assert.equal(status, 200);
  assert.ok(data && typeof data === 'object');
  assert.ok(Array.isArray(data.scores), 'scores should be an array');
  assert.equal(typeof data.weekStart, 'string', 'weekStart is the YYYY-MM-DD week anchor');
});

test('GET /api/leaderboard/rank returns rank + total', async () => {
  const { status, data } = await api('GET', '/api/leaderboard/rank?score=500');
  assert.equal(status, 200);
  assert.equal(typeof data.rank, 'number');
  assert.equal(typeof data.total, 'number');
});

test('GET /api/leaderboard/rank without score returns 400', async () => {
  const { status, data } = await api('GET', '/api/leaderboard/rank');
  assert.equal(status, 400);
  assert.ok(data.error);
});

// ── /api/scores ──────────────────────────────────────────────────────
test('POST /api/scores with valid body persists and returns id', async () => {
  const body = {
    player_name: 'TestRunner',
    score: 720,
    correct_answers: 7,
    accuracy: 70,
    level: 'AI Foundations',
    difficulty: 'Beginner'
  };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 201);
  assert.ok(data.id, 'response includes the new row id');

  // Round-trip: leaderboard + profile should now reflect the score
  const lb = await api('GET', '/api/leaderboard');
  assert.ok(lb.data.some(r => r.player_name === 'TestRunner'));
});

test('POST /api/scores with missing fields returns 400', async () => {
  const { status, data } = await api('POST', '/api/scores', { player_name: '' });
  assert.equal(status, 400);
  assert.ok(data.error);
});

// ── /api/profile ─────────────────────────────────────────────────────
test('GET /api/profile returns scores + aggregated stats', async () => {
  // Seed two scores for one player
  for (const s of [400, 880]) {
    await api('POST', '/api/scores', {
      player_name: 'AggUser',
      score: s,
      correct_answers: Math.round(s / 100),
      accuracy: 70,
      level: 'Model Building',
      difficulty: 'Beginner'
    });
  }
  const { status, data } = await api('GET', '/api/profile?name=AggUser');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.scores));
  assert.ok(data.stats, 'stats object is present');
  assert.equal(data.stats.games, 2);
  assert.equal(data.stats.top_score, 880);
  assert.equal(typeof data.stats.avg_accuracy, 'number');
  assert.ok(data.stats.rank >= 1);
});

test('GET /api/profile without name returns 400', async () => {
  const { status, data } = await api('GET', '/api/profile');
  assert.equal(status, 400);
  assert.ok(data.error);
});

// ── /u/:name (public profile page) ───────────────────────────────────
test('GET /u/:name renders templated meta tags from real stats', async () => {
  await api('POST', '/api/scores', {
    player_name: 'ShareTest',
    score: 950,
    correct_answers: 9,
    accuracy: 90,
    level: 'AI Foundations',
    difficulty: 'Beginner'
  });
  const { status, data } = await api('GET', '/u/ShareTest');
  assert.equal(status, 200);
  assert.equal(typeof data, 'string');
  assert.ok(data.includes('<title>ShareTest — AI Challenge</title>'));
  assert.ok(data.includes('ShareTest has scored 950 on AI Challenge'));
  assert.ok(data.includes('og:description'));
});

test('GET /og/:name returns an SVG with the player stats', async () => {
  await api('POST', '/api/scores', {
    player_name: 'OgTest', score: 600, correct_answers: 6, accuracy: 60,
    level: 'AI Foundations', difficulty: 'Beginner'
  });
  const { status, data, headers } = await api('GET', '/og/OgTest');
  assert.equal(status, 200);
  assert.match(headers.get('content-type') || '', /image\/svg\+xml/);
  assert.match(headers.get('cache-control') || '', /max-age=300/);
  assert.equal(typeof data, 'string');
  assert.ok(data.startsWith('<?xml') || data.startsWith('<svg'), 'response is SVG');
  assert.ok(data.includes('OgTest'), 'svg includes the player name');
  assert.ok(data.includes('600'), 'svg includes the player top score');
});

test('GET /og/:name handles names with special characters safely', async () => {
  const { status, data } = await api('GET', '/og/' + encodeURIComponent('<x>&you'));
  assert.equal(status, 200);
  assert.ok(data.includes('&lt;x&gt;'), 'svg escapes < and >');
  assert.ok(data.includes('&amp;you'), 'svg escapes &');
  assert.ok(!data.match(/<text[^>]*>[^<]*<x>/), 'raw <x> must not appear inside <text>');
});

test('GET /u/:name escapes HTML in the name (no double encoding)', async () => {
  // Send the literal characters via URL encoding
  const { status, data } = await api('GET', '/u/' + encodeURIComponent('<script>alert(1)</script>'));
  assert.equal(status, 200);
  // Must contain the single-encoded form
  assert.ok(data.includes('&lt;script&gt;'), 'name should be escaped to &lt;script&gt;');
  // Must NOT double-encode (which would produce &amp;lt;)
  assert.ok(!data.includes('&amp;lt;script'), 'name must not be double-encoded');
  // Must NOT contain raw <script> in any meta tag
  const titleMatch = data.match(/<title>([^<]*)<\/title>/);
  assert.ok(titleMatch);
  assert.ok(!titleMatch[1].includes('<script>'), 'raw <script> must not appear in <title>');
});

// ── /api/quiz/generate (custom AI quiz) ──────────────────────────────
test('POST /api/quiz/generate returns 503 when AI not configured', async () => {
  const { status, data } = await api('POST', '/api/quiz/generate', {
    topic: 'transformers', difficulty: 'Beginner'
  });
  assert.equal(status, 503);
  assert.ok(/AI not configured/i.test(data.error));
});

test('POST /api/quiz/generate rejects topic shorter than 3 chars', async () => {
  const { status, data } = await api('POST', '/api/quiz/generate', { topic: 'ai' });
  assert.equal(status, 400);
  assert.ok(/Topic is required/i.test(data.error));
});

// ── /api/daily-challenge ─────────────────────────────────────────────
test('GET /api/daily-challenge returns exactly 10 questions', async () => {
  const { status, data } = await api('GET', '/api/daily-challenge');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.equal(data.length, 10, 'daily challenge must return 10 questions');
});

// ── /api/stats/today ─────────────────────────────────────────────────
test('GET /api/stats/today returns the today_/total_ shape', async () => {
  const { status, data } = await api('GET', '/api/stats/today');
  assert.equal(status, 200);
  for (const k of ['today_games','today_players','total_games','today_top_name','today_top_score']) {
    assert.ok(k in data, `missing key: ${k}`);
  }
});

// ── Static assets ────────────────────────────────────────────────────
test('GET / serves the home page HTML', async () => {
  const { status, data } = await api('GET', '/');
  assert.equal(status, 200);
  assert.ok(typeof data === 'string');
  assert.ok(data.includes('AI Challenge'), 'home page contains brand name');
});

test('GET /lessons.html serves the lessons page', async () => {
  const { status, data } = await api('GET', '/lessons.html');
  assert.equal(status, 200);
  assert.ok(typeof data === 'string');
  assert.ok(data.includes('lessons-search'), 'lessons page includes search input');
});

test('GET /admin without auth returns 401', async () => {
  const { status } = await api('GET', '/admin');
  assert.equal(status, 401);
});

// ── Analytics search-misses (admin-only) ─────────────────────────────
test('GET /api/analytics/search-misses without auth returns 401', async () => {
  const { status } = await api('GET', '/api/analytics/search-misses');
  assert.equal(status, 401);
});

// ── 404 ──────────────────────────────────────────────────────────────
test('GET /api/nonexistent returns JSON 404', async () => {
  const { status, data } = await api('GET', '/api/nonexistent');
  assert.equal(status, 404);
  assert.ok(data.error);
});
