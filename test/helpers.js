// Shared test helpers — spin up the Express app on an ephemeral port
// against a per-process temp SQLite DB. Each test file imports this
// once via setup()/teardown() to keep the suite hermetic.

const path = require('path');
const fs   = require('fs');

const TEST_DB_FILE = path.join(__dirname, '..', `.test-db-${process.pid}.sqlite`);

// Must run BEFORE requiring the server so the libsql client picks up the
// test DB path. dotenv inside server.js will not overwrite vars that are
// already set on process.env, so this takes precedence.
process.env.TURSO_DATABASE_URL = 'file:' + TEST_DB_FILE;
process.env.TURSO_AUTH_TOKEN   = '';   // libsql client treats empty as unauthenticated
process.env.NODE_ENV           = 'test';
process.env.ADMIN_PASSWORD     = process.env.ADMIN_PASSWORD || 'test-pw';
// Suppress AI features that need ANTHROPIC_API_KEY — tests verify the
// "not configured" branch instead so we don't burn API credits.
delete process.env.ANTHROPIC_API_KEY;
// Push notifications off
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;

let _server = null;
let _baseUrl = null;

async function startTestServer() {
  if (_server) return _baseUrl;
  const app = require('../server.js');
  await new Promise((resolve) => {
    _server = app.listen(0, () => resolve());
  });
  const port = _server.address().port;
  _baseUrl = `http://127.0.0.1:${port}`;
  return _baseUrl;
}

async function stopTestServer() {
  if (_server) {
    await new Promise((resolve) => _server.close(() => resolve()));
    _server = null;
    _baseUrl = null;
  }
  // Best-effort cleanup of the temp DB so consecutive runs start fresh
  for (const ext of ['', '-shm', '-wal']) {
    const p = TEST_DB_FILE + ext;
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
  }
}

async function api(method, pathname, body) {
  const url  = await startTestServer() + pathname;
  const init = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res  = await fetch(url, init);
  const ctype = res.headers.get('content-type') || '';
  let data = null;
  if (ctype.includes('application/json')) {
    try { data = await res.json(); } catch (_) { data = null; }
  } else {
    try { data = await res.text(); } catch (_) { data = null; }
  }
  return { status: res.status, data, headers: res.headers };
}

module.exports = { startTestServer, stopTestServer, api, TEST_DB_FILE };
