import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdtempSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { can, hashPassword, newToken, verifyPassword } from './auth.mjs';
import { openDatabase } from './db.mjs';
import {
  buildSnapshot,
  clockPayload,
  controlMatch,
  correctEvent,
  createMatch,
  scheduleGroupFixtures,
  createUser,
  currentRevision,
  deleteNews,
  ensureFinishedStamps,
  ensureNewsStamps,
  deleteTeam,
  listAudit,
  listUsers,
  recordEvent,
  RuleError,
  saveLineup,
  saveManualStat,
  saveNews,
  savePlayer,
  saveTeam,
  setImage,
  seedDatabase,
  setNotifier,
  updateMatch,
  updateRules,
  voidEvent,
  withRevision,
} from './domain.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const uploads = process.env.VERCEL ? join(tmpdir(), 'ddu-uploads') : join(root, 'data', 'uploads');
const clients = new Set();
const loginAttempts = new Map();
const LIVE_CLIENT_LIMIT = 400;
const JSON_LIMIT = 2_500_000;
const SNAPSHOT_TTL = 2000;
const DUMMY_PASSWORD = hashPassword('not-a-real-password');
let snapshotCache = null;
let snapshotFlight = null;
let clockTimer = null;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function broadcast(payload) {
  const body = `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const response of clients) {
    try {
      response.write(body);
    } catch {
      clients.delete(response);
    }
  }
}

let keepAliveTimer = null;
function ensureKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    if (!clients.size) return;
    for (const response of clients) {
      try {
        response.write(': keepalive\n\n');
      } catch {
        clients.delete(response);
      }
    }
  }, 15000);
}

export function pushClock(db) {
  const payload = clockPayload(db);
  if (payload.matches.length) broadcast(payload);
}

function ensureClock(db) {
  if (!process.env.VERCEL || clockTimer) return;
  clockTimer = setInterval(() => {
    if (!clients.size) return;
    try {
      pushClock(db);
    } catch (error) {
      console.error(error);
    }
  }, 1000);
}

export async function handleRequest(db, request, response) {
  setNotifier(broadcast);
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/api/live') {
      serveEvents(request, response, db);
      ensureClock(db);
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/media/')) return serveMedia(response, db, url.pathname);
    if (url.pathname.startsWith('/api/')) return await serveApi(request, response, db, url);
    if (url.pathname.startsWith('/uploads/')) return serveUpload(response, url.pathname);
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) return serveStatic(response, url.pathname);
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found.' }));
  } catch (error) {
    const status = error instanceof RuleError ? error.status : 500;
    if (status === 500) console.error(error);
    if (!response.headersSent) send(response, status, { error: status === 500 ? 'The server could not complete that.' : error.message });
  }
}

export function createApp(db) {
  return createServer((request, response) => {
    handleRequest(db, request, response);
  });
}

function serveEvents(request, response, db) {
  if (clients.size >= LIVE_CLIENT_LIMIT) {
    send(response, 503, { error: 'Too many live viewers. Try again shortly.' });
    return;
  }
  applySecurity(response);
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(`event: hello\ndata: ${JSON.stringify({ type: 'hello', revision: currentRevision(), serverNow: Date.now() })}\n\n`);
  clients.add(response);
  ensureKeepAlive();
  request.on('close', () => clients.delete(response));
}

async function serveApi(request, response, db, url) {
  const actor = actorFrom(db, request);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/api/health') return send(response, 200, { ok: true, revision: currentRevision(), serverNow: Date.now() });
  if (request.method === 'GET' && path === '/api/snapshot') return send(response, 200, await publicSnapshot(db));
  if (request.method === 'GET' && path === '/api/me') return send(response, 200, { user: actor ? publicUser(actor) : null });
  if (request.method === 'POST' && path === '/api/login') return login(request, response, db);
  if (!guardMutation(request, response)) return;
  if (request.method === 'POST' && path === '/api/logout') return logout(request, response, db);

  const body = request.method === 'GET' ? {} : await readJson(request);
  const matchEvent = path.match(/^\/api\/matches\/([^/]+)\/events\/(\d+)(?:\/(void))?$/);
  const matchAction = path.match(/^\/api\/matches\/([^/]+)\/(clock|events|lineup|stats|confirm)$/);
  const one = path.match(/^\/api\/(teams|players|news|matches)\/([^/]+)$/);

  if (request.method === 'GET' && path === '/api/audit') return send(response, 200, { audit: listAudit(db, actor) });
  if (request.method === 'GET' && path === '/api/users') return send(response, 200, { users: listUsers(db, actor) });
  if (request.method === 'POST' && path === '/api/users') return mutate(response, db, () => createUser(db, must(actor), body));
  if (request.method === 'PATCH' && path === '/api/rules') return mutate(response, db, () => updateRules(db, must(actor), body));
  if (request.method === 'POST' && path === '/api/teams') return mutate(response, db, () => saveTeam(db, must(actor), body));
  if (request.method === 'POST' && path === '/api/players') return mutate(response, db, () => savePlayer(db, must(actor), body));
  if (request.method === 'POST' && path === '/api/news') return mutate(response, db, () => saveNews(db, must(actor), body));
  if (request.method === 'POST' && path === '/api/matches/round') return mutate(response, db, () => scheduleGroupFixtures(db, must(actor), body));
  if (request.method === 'POST' && path === '/api/matches') return mutate(response, db, () => createMatch(db, must(actor), body));

  if (one && request.method === 'PATCH' && one[1] === 'teams') return mutate(response, db, () => saveTeam(db, must(actor), body, decodeURIComponent(one[2])));
  if (one && request.method === 'DELETE' && one[1] === 'teams') return mutate(response, db, () => deleteTeam(db, must(actor), decodeURIComponent(one[2])));
  if (one && request.method === 'PATCH' && one[1] === 'players') return mutate(response, db, () => savePlayer(db, must(actor), body, decodeURIComponent(one[2])));
  if (one && request.method === 'PATCH' && one[1] === 'news') return mutate(response, db, () => saveNews(db, must(actor), body, decodeURIComponent(one[2])));
  if (one && request.method === 'DELETE' && one[1] === 'news') return mutate(response, db, () => deleteNews(db, must(actor), decodeURIComponent(one[2])));
  if (one && request.method === 'PATCH' && one[1] === 'matches') return mutate(response, db, () => updateMatch(db, must(actor), decodeURIComponent(one[2]), body));

  if (matchAction && request.method === 'POST' && matchAction[2] === 'clock') {
    return mutate(response, db, () => controlMatch(db, must(actor), decodeURIComponent(matchAction[1]), body));
  }
  if (matchAction && request.method === 'POST' && matchAction[2] === 'events') {
    return mutate(response, db, () => recordEvent(db, must(actor), decodeURIComponent(matchAction[1]), body));
  }
  if (matchAction && request.method === 'POST' && matchAction[2] === 'lineup') {
    return mutate(response, db, () => saveLineup(db, must(actor), decodeURIComponent(matchAction[1]), body));
  }
  if (matchAction && request.method === 'POST' && matchAction[2] === 'stats') {
    return mutate(response, db, () => saveManualStat(db, must(actor), decodeURIComponent(matchAction[1]), body));
  }
  if (matchEvent && request.method === 'POST' && matchEvent[3] === 'void') {
    return mutate(response, db, () => voidEvent(db, must(actor), decodeURIComponent(matchEvent[1]), Number(matchEvent[2]), body));
  }
  if (matchEvent && request.method === 'PATCH' && !matchEvent[3]) {
    return mutate(response, db, () => correctEvent(db, must(actor), decodeURIComponent(matchEvent[1]), Number(matchEvent[2]), body));
  }
  if (request.method === 'POST' && path.match(/^\/api\/(teams|players)\/([^/]+)\/image$/)) {
    return uploadImage(request, response, db, actor, path);
  }

  send(response, 404, { error: 'Not found.' });
}

function mutate(response, db, work) {
  const result = withRevision(work);
  snapshotCache = null;
  send(response, 200, { ok: true, ...result, snapshot: buildSnapshot(db) });
}

function must(actor) {
  if (!actor) throw new RuleError('Sign in required.', 401);
  return actor;
}

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function actorFrom(db, request) {
  const token = cookies(request).ddu_session;
  if (!token) return null;
  const row = db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ?`).get(token, Date.now());
  return row ?? null;
}

async function login(request, response, db) {
  if (!guardMutation(request, response)) return;
  const now = Date.now();
  if (loginAttempts.size > 500) {
    for (const [key, value] of loginAttempts) {
      if (now > value.reset) loginAttempts.delete(key);
    }
  }
  const ip = clientAddress(request);
  const attempt = loginAttempts.get(ip) ?? { count: 0, reset: now + 10 * 60 * 1000 };
  if (now > attempt.reset) {
    attempt.count = 0;
    attempt.reset = now + 10 * 60 * 1000;
  }
  if (attempt.count >= 8) return send(response, 429, { error: 'Too many sign-in attempts. Wait a few minutes.' });
  attempt.count += 1;
  loginAttempts.set(ip, attempt);
  const body = await readJson(request);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(body.username ?? '').trim().toLowerCase());
  const password = String(body.password ?? '');
  const valid = user ? verifyPassword(password, user.password_hash) : false;
  if (!user) verifyPassword(password, DUMMY_PASSWORD);
  if (!valid) return send(response, 401, { error: 'Those sign-in details are not valid.' });
  loginAttempts.delete(ip);
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, Date.now() + 12 * 60 * 60 * 1000);
  response.setHeader('Set-Cookie', sessionCookie(token, 12 * 60 * 60, request));
  send(response, 200, { user: publicUser(user) });
}

function logout(request, response, db) {
  const token = cookies(request).ddu_session;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  response.setHeader('Set-Cookie', sessionCookie('', 0, request));
  send(response, 200, { ok: true });
}

function guardMutation(request, response) {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  if (request.headers['x-ddu-request'] !== '1') {
    send(response, 403, { error: 'This request was rejected.' });
    return false;
  }
  return true;
}

function sessionCookie(token, maxAge, request) {
  const https = Boolean(process.env.VERCEL) || request?.headers['x-forwarded-proto'] === 'https';
  const secure = https ? '; Secure' : '';
  return `ddu_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function clientAddress(request) {
  const real = String(request.headers['x-real-ip'] ?? '').trim();
  if (real) return real;
  const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return forwarded || request.socket?.remoteAddress || 'local';
}

function cookies(request) {
  return Object.fromEntries(String(request.headers.cookie ?? '').split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter((pair) => pair[0]));
}

async function readJson(request) {
  const buffer = await readRaw(request, JSON_LIMIT);
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    if (error instanceof RuleError) throw error;
    throw new RuleError('The request body is not valid.');
  }
}

function uploadImage(request, response, db, actor, path) {
  const match = path.match(/^\/api\/(teams|players)\/([^/]+)\/image$/);
  const kind = match[1];
  const id = decodeURIComponent(match[2]);
  if (!actor || !can(actor, kind === 'teams' ? 'team.write' : 'player.write')) {
    return send(response, 403, { error: 'You do not have permission for that action.' });
  }
  const type = String(request.headers['content-type'] ?? '');
  const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : '';
  if (!extension) return send(response, 400, { error: 'Upload a PNG, JPEG, or WebP image.' });
  const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return readRaw(request, 1_500_000).then((buffer) => {
    if (!buffer.length) return send(response, 400, { error: 'The image was empty.' });
    const saved = withRevision(() => setImage(db, kind, id, { contentType, bytes: buffer }));
    send(response, 200, { ok: true, url: saved.url, snapshot: buildSnapshot(db) });
  });
}

function serveMedia(response, db, pathname) {
  const match = pathname.match(/^\/api\/media\/(teams|players|news)\/([^/]+)$/);
  if (!match) return send(response, 404, { error: 'Not found.' });
  const row = db.prepare('SELECT content_type, bytes FROM media WHERE id = ?').get(`${match[1]}/${decodeURIComponent(match[2])}`);
  const bytes = mediaBytes(row?.bytes);
  if (!bytes?.length) return send(response, 404, { error: 'Not found.' });
  applySecurity(response);
  response.writeHead(200, {
    'Content-Type': row.content_type || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
    'Content-Length': bytes.length,
  });
  response.end(bytes);
}

function mediaBytes(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') {
    if (value.startsWith('\\x')) return Buffer.from(value.slice(2), 'hex');
    return Buffer.from(value, 'base64');
  }
  if (value?.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data);
  return null;
}

function readRaw(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    request.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        request.pause();
        reject(new RuleError('That request is too large.'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks));
    });
    request.on('error', (error) => {
      if (!failed) reject(error);
    });
  });
}

function serveUpload(response, pathname) {
  const relative = normalize(pathname.replace(/^\/uploads\//, ''));
  if (relative.startsWith('..') || relative.includes('\0')) return send(response, 404, { error: 'Not found.' });
  const file = join(uploads, relative);
  if (!inside(uploads, file) || !existsSync(file)) return send(response, 404, { error: 'Not found.' });
  applySecurity(response);
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
  createReadStream(file).pipe(response);
}

function serveStatic(response, pathname) {
  const dist = join(root, 'dist');
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = normalize(join(dist, requested));
  const target = inside(dist, file) && existsSync(file) ? file : join(dist, 'index.html');
  if (!existsSync(target)) return send(response, 404, { error: 'Build the site before starting it.' });
  applySecurity(response);
  response.writeHead(200, { 'Content-Type': TYPES[extname(target)] || 'text/html; charset=utf-8' });
  createReadStream(target).pipe(response);
}

function send(response, status, body) {
  applySecurity(response);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function inside(rootDir, file) {
  const root = rootDir.endsWith(sep) ? rootDir : `${rootDir}${sep}`;
  return file === rootDir || file.startsWith(root);
}

function applySecurity(response) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(key, value);
}

async function publicSnapshot(db) {
  const now = Date.now();
  if (snapshotCache && snapshotCache.revision === currentRevision() && now - snapshotCache.at < SNAPSHOT_TTL) {
    return snapshotCache.body;
  }
  if (!snapshotFlight) {
    snapshotFlight = Promise.resolve().then(() => {
      const body = buildSnapshot(db);
      snapshotCache = { at: Date.now(), revision: body.revision ?? currentRevision(), body };
      return body;
    }).finally(() => {
      snapshotFlight = null;
    });
  }
  return snapshotFlight;
}

export async function loadLeagueSource() {
  const esbuild = await import('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'ddu-seed-'));
  const outfile = join(dir, 'league.mjs');
  await esbuild.build({
    entryPoints: [join(root, 'src/data/league-seed.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
  });
  return import(pathToFileURL(outfile).href);
}

export function prepareDatabase(db) {
  const password = process.env.ADMIN_PASSWORD || 'supercup';
  if (process.env.DDU_DEMO === '1' && db.dialect !== 'postgres') {
    return loadLeagueSource().then((league) => {
      seedDatabase(db, league, password);
      ensureFinishedStamps(db);
    });
  }
  seedDatabase(db, null, password);
  ensureNewsStamps(db);
  ensureFinishedStamps(db);
  return Promise.resolve();
}

export function startServer(db = openDatabase(), port = Number(process.env.PORT || 8787)) {
  const server = createApp(db);
  return prepareDatabase(db).then(() => new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, db }));
  }));
}
