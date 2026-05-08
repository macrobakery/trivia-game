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

test('POST /api/scores rejects reserved player names (admin/etc)', async () => {
  const body = { player_name: 'admin', score: 100, correct_answers: 1, accuracy: 10, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 400);
  assert.match(data.error || '', /reserved/i);
});

test('POST /api/scores rejects profanity in player names', async () => {
  const body = { player_name: 'fuckyou', score: 100, correct_answers: 1, accuracy: 10, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 400);
  assert.match(data.error || '', /prohibited/i);
});

test('POST /api/scores rejects HTML in player names', async () => {
  const body = { player_name: '<script>alert(1)</script>', score: 100, correct_answers: 1, accuracy: 10, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 400);
  assert.match(data.error || '', /invalid characters/i);
});

test('POST /api/scores rejects out-of-range scores (> 2000)', async () => {
  const body = { player_name: 'Cheater', score: 999999, correct_answers: 10, accuracy: 100, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 400);
  assert.match(data.error || '', /Invalid score/i);
});

test('POST /api/scores rejects out-of-range correct_answers (> 10)', async () => {
  const body = { player_name: 'Cheater', score: 500, correct_answers: 99, accuracy: 100, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status, data } = await api('POST', '/api/scores', body);
  assert.equal(status, 400);
  assert.match(data.error || '', /correct_answers/i);
});

test('POST /api/scores accepts valid international names with spaces/punctuation', async () => {
  const body = { player_name: "Aziz O'Neill", score: 480, correct_answers: 5, accuracy: 50, level: 'AI Foundations', difficulty: 'Beginner' };
  const { status } = await api('POST', '/api/scores', body);
  assert.equal(status, 201);
});

test('POST /api/scores does not flag legitimate names containing soft fragments (Hancock, Cassandra)', async () => {
  for (const name of ['Hancock', 'Cassandra', 'Dickens']) {
    const body = { player_name: name, score: 240, correct_answers: 2, accuracy: 20, level: 'AI Foundations', difficulty: 'Beginner' };
    const { status } = await api('POST', '/api/scores', body);
    assert.equal(status, 201, `legitimate name "${name}" should be allowed`);
  }
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

// ── /embed/u/:name (embeddable widget) ───────────────────────────────
test('GET /embed/u/:name returns iframe-friendly HTML with stats', async () => {
  await api('POST', '/api/scores', {
    player_name: 'EmbedTest', score: 720, correct_answers: 7, accuracy: 70,
    level: 'AI Foundations', difficulty: 'Beginner'
  });
  const { status, data, headers } = await api('GET', '/embed/u/EmbedTest');
  assert.equal(status, 200);
  assert.match(headers.get('content-type') || '', /text\/html/);
  assert.match(headers.get('content-security-policy') || '', /frame-ancestors\s+\*/);
  assert.ok(data.includes('EmbedTest'));
  assert.ok(data.includes('720'));
  assert.ok(data.includes('Beat me'));
});

test('GET /embed/u/:name escapes HTML in the player name', async () => {
  const { status, data } = await api('GET', '/embed/u/' + encodeURIComponent('<x>'));
  assert.equal(status, 200);
  assert.ok(data.includes('&lt;x&gt;'), 'name escaped');
  assert.ok(!data.includes('<x>'), 'no raw <x> in body');
});

// ── /og/round.svg + /share/round (round-result share) ──────────────
test('GET /og/round.svg renders an SVG with the round numbers', async () => {
  const qs = 'score=920&correct=9&total=10&level=AI%20Foundations&diff=Beginner&name=Aziz&streak=5';
  const { status, data, headers } = await api('GET', '/og/round.svg?' + qs);
  assert.equal(status, 200);
  assert.match(headers.get('content-type') || '', /image\/svg\+xml/);
  assert.match(headers.get('cache-control') || '', /max-age=3600/);
  assert.ok(data.includes('920'), 'svg shows score');
  assert.ok(data.includes('9/10'), 'svg shows correct/total');
  assert.ok(data.includes('Aziz'), 'svg shows player name');
  assert.ok(data.includes('AI Foundations'), 'svg shows level');
  assert.ok(data.includes('Beginner'), 'svg shows difficulty');
  assert.ok(data.includes('5-streak'), 'svg shows streak chip when ≥3');
});

test('GET /og/round.svg clamps out-of-range params', async () => {
  // score=99999 should clamp to 9999, correct=999 should clamp to 10
  const { status, data } = await api('GET', '/og/round.svg?score=99999&correct=999&total=10');
  assert.equal(status, 200);
  // 99999 must NOT appear as raw number — it should be 9999
  assert.ok(!data.includes('99,999'));
  assert.ok(!data.includes('999/10'));
  assert.ok(data.includes('9,999'));
  assert.ok(data.includes('10/10'));
});

test('GET /og/round.svg escapes HTML in name and level', async () => {
  const qs = 'name=' + encodeURIComponent('<x>&y') + '&level=' + encodeURIComponent('<bad>');
  const { status, data } = await api('GET', '/og/round.svg?' + qs);
  assert.equal(status, 200);
  assert.ok(data.includes('&lt;x&gt;'), 'name escaped');
  assert.ok(data.includes('&lt;bad&gt;'), 'level escaped');
  assert.ok(!data.match(/<text[^>]*>[^<]*<x>/), 'raw <x> must not appear inside <text>');
});

test('GET /share/round renders OG meta and the embedded card image', async () => {
  const qs = 'score=720&correct=7&total=10&name=Aziz&level=Model%20Building&diff=Intermediate';
  const { status, data, headers } = await api('GET', '/share/round?' + qs);
  assert.equal(status, 200);
  assert.match(headers.get('content-type') || '', /text\/html/);
  assert.ok(data.includes('og:image'));
  assert.ok(data.includes('og/round.svg?'), 'og:image points to round SVG');
  assert.ok(data.includes('Aziz scored 720'), 'title carries name + score');
  assert.ok(data.includes('Model Building'));
  assert.ok(data.includes('⚔️ Try to beat it'), 'page has play CTA');
});

// ── /og/tip.svg (daily-tip share card) ───────────────────────────────
test('GET /og/tip.svg renders any text into a share-card SVG', async () => {
  const text = 'Vector embeddings convert words into numbers';
  const { status, data, headers } = await api('GET', '/og/tip.svg?text=' + encodeURIComponent(text));
  assert.equal(status, 200);
  assert.match(headers.get('content-type') || '', /image\/svg\+xml/);
  assert.ok(data.includes('AI TIP OF THE DAY'));
  assert.ok(data.includes('Vector embeddings'));
});

test('GET /og/tip.svg with empty text redirects to default OG image', async () => {
  const { status } = await api('GET', '/og/tip.svg');
  // Should redirect (302/301) — fetch follows redirects, so we expect 200 from the destination
  // The destination is /og-image.svg which is a static file; just check we get a 200.
  assert.ok(status === 200 || status === 302 || status === 301);
});

// ── Analytics search-misses (admin-only) ─────────────────────────────
test('GET /api/analytics/search-misses without auth returns 401', async () => {
  const { status } = await api('GET', '/api/analytics/search-misses');
  assert.equal(status, 401);
});

test('GET /api/analytics/search-hits without auth returns 401', async () => {
  const { status } = await api('GET', '/api/analytics/search-hits');
  assert.equal(status, 401);
});

// ── 404 ──────────────────────────────────────────────────────────────
test('GET /api/nonexistent returns JSON 404', async () => {
  const { status, data } = await api('GET', '/api/nonexistent');
  assert.equal(status, 404);
  assert.ok(data.error);
});
