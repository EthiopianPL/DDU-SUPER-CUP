import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { can, newToken, verifyPassword } from './auth.mjs';
import { openDatabase } from './db.mjs';
import {
  buildSnapshot,
  clockPayload,
  controlMatch,
  correctEvent,
  createMatch,
  createUser,
  currentRevision,
  deleteNews,
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
  seedDatabase,
  setNotifier,
  updateMatch,
  updateRules,
  voidEvent,
  withRevision,
} from './domain.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const uploads = join(root, 'data', 'uploads');
const clients = new Set();
const loginAttempts = new Map();

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
  for (const response of clients) response.write(body);
}

export function pushClock(db) {
  const payload = clockPayload(db);
  if (payload.matches.length) broadcast(payload);
}

export function createApp(db) {
  setNotifier(broadcast);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname === '/api/live') return serveEvents(request, response, db);
      if (url.pathname.startsWith('/api/')) return await serveApi(request, response, db, url);
      if (url.pathname.startsWith('/uploads/')) return serveUpload(response, url.pathname);
      if (process.env.NODE_ENV === 'production') return serveStatic(response, url.pathname);
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found.' }));
    } catch (error) {
      const status = error instanceof RuleError ? error.status : 500;
      if (status === 500) console.error(error);
      send(response, status, { error: status === 500 ? 'The server could not complete that.' : error.message });
    }
  });
}

function serveEvents(request, response, db) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  response.write(`event: hello\ndata: ${JSON.stringify({ type: 'hello', revision: currentRevision(), serverNow: Date.now() })}\n\n`);
  clients.add(response);
  request.on('close', () => clients.delete(response));
}

async function serveApi(request, response, db, url) {
  const actor = actorFrom(db, request);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/api/health') return send(response, 200, { ok: true });
  if (request.method === 'GET' && path === '/api/snapshot') return send(response, 200, buildSnapshot(db));
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
  const ip = request.socket.remoteAddress || 'local';
  const attempt = loginAttempts.get(ip) ?? { count: 0, reset: Date.now() + 10 * 60 * 1000 };
  if (Date.now() > attempt.reset) {
    attempt.count = 0;
    attempt.reset = Date.now() + 10 * 60 * 1000;
  }
  if (attempt.count >= 8) return send(response, 429, { error: 'Too many sign-in attempts. Wait a few minutes.' });
  attempt.count += 1;
  loginAttempts.set(ip, attempt);
  const body = await readJson(request);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(body.username ?? '').trim().toLowerCase());
  if (!user || !verifyPassword(String(body.password ?? ''), user.password_hash)) {
    return send(response, 401, { error: 'Those sign-in details are not valid.' });
  }
  loginAttempts.delete(ip);
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, Date.now() + 12 * 60 * 60 * 1000);
  response.setHeader('Set-Cookie', `ddu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 60 * 60}`);
  send(response, 200, { user: publicUser(user) });
}

function logout(request, response, db) {
  const token = cookies(request).ddu_session;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  response.setHeader('Set-Cookie', 'ddu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
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

function cookies(request) {
  return Object.fromEntries(String(request.headers.cookie ?? '').split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter((pair) => pair[0]));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
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
  return readRaw(request, 1_500_000).then((buffer) => {
    if (!buffer.length) return send(response, 400, { error: 'The image was empty.' });
    const folder = join(uploads, kind);
    mkdirSync(folder, { recursive: true });
    const filename = `${id}.${extension}`;
    writeFileSync(join(folder, filename), buffer);
    const column = kind === 'teams' ? 'crest_url' : 'photo_url';
    const table = kind === 'teams' ? 'teams' : 'players';
    const url = `/uploads/${kind}/${filename}`;
    const result = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(url, id);
    if (!result.changes) return send(response, 404, { error: 'Not found.' });
    withRevision(() => ({ id }));
    send(response, 200, { ok: true, url, snapshot: buildSnapshot(db) });
  });
}

function readRaw(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new RuleError('That image is larger than 1.5 MB.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function serveUpload(response, pathname) {
  const relative = normalize(pathname.replace(/^\/uploads\//, ''));
  if (relative.startsWith('..') || relative.includes('\0')) return send(response, 404, { error: 'Not found.' });
  const file = join(uploads, relative);
  if (!file.startsWith(uploads) || !existsSync(file)) return send(response, 404, { error: 'Not found.' });
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
  createReadStream(file).pipe(response);
}

function serveStatic(response, pathname) {
  const dist = join(root, 'dist');
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = normalize(join(dist, requested));
  const target = file.startsWith(dist) && existsSync(file) ? file : join(dist, 'index.html');
  if (!existsSync(target)) return send(response, 404, { error: 'Build the site before starting it.' });
  response.writeHead(200, { 'Content-Type': TYPES[extname(target)] || 'text/html; charset=utf-8' });
  createReadStream(target).pipe(response);
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

export async function loadLeagueSource() {
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

export function startServer(db = openDatabase(), port = Number(process.env.PORT || 8787)) {
  const sourcePromise = loadLeagueSource().then((league) => {
    seedDatabase(db, league, process.env.ADMIN_PASSWORD || 'supercup');
  });
  const server = createApp(db);
  return sourcePromise.then(() => new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, db }));
  }));
}
