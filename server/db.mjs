import 'pg';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const idle = new Int32Array(new SharedArrayBuffer(4));

function loadEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const split = trimmed.indexOf('=');
    if (split < 1) continue;
    const key = trimmed.slice(0, split).trim();
    if (process.env[key] != null) continue;
    let value = trimmed.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function databasePath() {
  return process.env.DDU_DB || join(root, 'data', 'supercup.db');
}

function connectionString() {
  return (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
}

function openSqlite(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.dialect = 'sqlite';
  db.exec('PRAGMA foreign_keys = ON');
  try {
    db.exec('PRAGMA journal_mode = WAL');
  } catch {
    // In-memory databases used by tests do not always accept WAL.
  }
  migrate(db);
  return db;
}

export function openDatabase(path = databasePath()) {
  loadEnv();
  if (!process.env.DDU_DB && connectionString()) return openPostgres(connectionString());
  return openSqlite(path);
}

export async function openDatabaseAsync(path = databasePath()) {
  loadEnv();
  const url = connectionString();
  if (!process.env.DDU_DB && url) return openPostgresAsync(url);
  return openSqlite(path);
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      rules_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      college TEXT NOT NULL,
      group_id TEXT NOT NULL,
      color TEXT NOT NULL,
      pitch TEXT NOT NULL,
      coach TEXT NOT NULL DEFAULT '',
      crest_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      number INTEGER NOT NULL,
      nationality TEXT NOT NULL DEFAULT '',
      registered INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      photo_url TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      bytes BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      competition_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      matchday INTEGER NOT NULL,
      home_id TEXT NOT NULL REFERENCES teams(id),
      away_id TEXT NOT NULL REFERENCES teams(id),
      venue TEXT NOT NULL,
      kickoff_date TEXT NOT NULL,
      kickoff_time TEXT NOT NULL,
      status TEXT NOT NULL,
      period TEXT NOT NULL,
      elapsed_ms INTEGER NOT NULL DEFAULT 0,
      running_since INTEGER,
      added_ms INTEGER NOT NULL DEFAULT 0,
      half_ms INTEGER NOT NULL,
      regulation_ms INTEGER NOT NULL,
      et_half_ms INTEGER NOT NULL,
      allow_extra INTEGER NOT NULL DEFAULT 0,
      home_score INTEGER NOT NULL DEFAULT 0,
      away_score INTEGER NOT NULL DEFAULT 0,
      pens_home INTEGER,
      pens_away INTEGER,
      confirmed INTEGER NOT NULL DEFAULT 0,
      referee TEXT NOT NULL DEFAULT '',
      assistant1 TEXT NOT NULL DEFAULT '',
      assistant2 TEXT NOT NULL DEFAULT '',
      formation_home TEXT NOT NULL DEFAULT '4-2-3-1',
      formation_away TEXT NOT NULL DEFAULT '4-2-3-1',
      stage TEXT NOT NULL DEFAULT 'group',
      slot INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS match_squad (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL REFERENCES players(id),
      role TEXT NOT NULL,
      sort_index INTEGER NOT NULL,
      PRIMARY KEY (match_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS match_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      client_key TEXT UNIQUE,
      type TEXT NOT NULL,
      team_id TEXT,
      credited_team_id TEXT,
      player_id TEXT,
      assist_id TEXT,
      related_player_id TEXT,
      minute INTEGER NOT NULL,
      added_minute INTEGER NOT NULL DEFAULT 0,
      period TEXT NOT NULL,
      goal_type TEXT,
      card_type TEXT,
      detail TEXT NOT NULL DEFAULT '',
      counts_for_score INTEGER NOT NULL DEFAULT 0,
      shootout INTEGER NOT NULL DEFAULT 0,
      scored INTEGER,
      voided INTEGER NOT NULL DEFAULT 0,
      void_reason TEXT NOT NULL DEFAULT '',
      created_by TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id, voided, type);
    CREATE TABLE IF NOT EXISTS manual_stats (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (match_id, team_id, metric)
    );
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      time_label TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  const newsColumns = db.prepare('PRAGMA table_info(news)').all();
  if (newsColumns.length && !newsColumns.some((column) => column.name === 'image_url')) {
    db.exec(`ALTER TABLE news ADD COLUMN image_url TEXT NOT NULL DEFAULT ''`);
  }
  if (newsColumns.length && !newsColumns.some((column) => column.name === 'created_at')) {
    db.exec(`ALTER TABLE news ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`);
  }
  const matchColumns = db.prepare('PRAGMA table_info(matches)').all();
  if (matchColumns.length && !matchColumns.some((column) => column.name === 'stage')) {
    db.exec(`ALTER TABLE matches ADD COLUMN stage TEXT NOT NULL DEFAULT 'group'`);
  }
  if (matchColumns.length && !matchColumns.some((column) => column.name === 'slot')) {
    db.exec(`ALTER TABLE matches ADD COLUMN slot INTEGER NOT NULL DEFAULT 0`);
  }
}

function serverFile(name) {
  const beside = fileURLToPath(new URL(`./${name}`, import.meta.url));
  if (existsSync(beside)) return beside;
  return join(process.cwd(), 'server', name);
}

function spawnWorker() {
  const worker = new Worker(pathToFileURL(serverFile('postgres-worker.mjs')), { execArgv: [] });
  const { port1, port2 } = new MessageChannel();
  port1.start();
  return { worker, port1, port2 };
}

function waitForStart(worker, port1, port2) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The database worker did not start.')), 20000);
    worker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    port1.once('message', (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    worker.postMessage({ port: port2 }, [port2]);
  });
}

function openPostgres(url) {
  const { worker, port1, port2 } = spawnWorker();
  worker.on('error', (error) => {
    port1.postMessage({ ok: false, error: error.message });
  });
  worker.postMessage({ port: port2 }, [port2]);
  const ready = waitFor(port1);
  if (!ready.ok) throw new Error(ready.error || 'The database worker did not start.');
  return finishPostgres(worker, port1, url);
}

async function openPostgresAsync(url) {
  const { worker, port1, port2 } = spawnWorker();
  const ready = await waitForStart(worker, port1, port2);
  if (!ready.ok) throw new Error(ready.error || 'The database worker did not start.');
  return finishPostgres(worker, port1, url);
}

function finishPostgres(worker, port1, url) {
  const call = (message) => {
    port1.postMessage(message);
    const payload = waitFor(port1);
    if (!payload.ok) {
      const error = new Error(payload.error || 'The database request failed.');
      error.code = payload.code;
      throw error;
    }
    return payload;
  };

  call({ op: 'connect', connectionString: url });

  const db = {
    dialect: 'postgres',
    exec(sql) {
      const statement = String(sql).replace(/BEGIN IMMEDIATE/g, 'BEGIN').trim();
      if (!statement) return;
      call({ op: 'query', sql: statement, params: [] });
    },
    prepare(sql) {
      return {
        get(...params) {
          const payload = call({ op: 'query', sql, params: nullable(params) });
          return payload.result.rows?.[0];
        },
        all(...params) {
          const payload = call({ op: 'query', sql, params: nullable(params) });
          return payload.result.rows ?? [];
        },
        run(...params) {
          const payload = call({ op: 'query', sql, params: nullable(params) });
          return {
            changes: payload.result.changes ?? 0,
            lastInsertRowid: payload.result.lastInsertRowid ?? 0,
          };
        },
      };
    },
    close() {
      try {
        call({ op: 'close' });
      } catch {
        // The connection may already be gone.
      }
      worker.terminate();
    },
  };

  for (const statement of readFileSync(serverFile('schema.supabase.sql'), 'utf8').split(';')) {
    const sql = statement.trim();
    if (!sql) continue;
    try {
      db.exec(sql);
    } catch (error) {
      if (error.code !== '42P07' && error.code !== '42710') throw error;
    }
  }
  return db;
}

function waitFor(port) {
  const deadline = Date.now() + 30000;
  let received;
  while (!(received = receiveMessageOnPort(port))) {
    if (Date.now() > deadline) throw new Error('The database did not answer in time.');
    Atomics.wait(idle, 0, 0, 25);
  }
  return received.message;
}

function nullable(params) {
  return params.map((value) => value === undefined ? null : value);
}

export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // The transaction may already be closed.
    }
    throw error;
  }
}
