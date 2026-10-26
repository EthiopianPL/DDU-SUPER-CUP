import pg from 'pg';
import { parentPort } from 'node:worker_threads';

pg.types.setTypeParser(20, (value) => Number(value));

let client;
let connectionString;

function numbered(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function plain(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key] = typeof value === 'bigint' ? Number(value) : value;
  return out;
}

function makeClient(value) {
  return new pg.Client({
    connectionString: value,
    ssl: value.includes('supabase.co') || value.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

async function connect(value) {
  connectionString = value;
  client = makeClient(value);
  await client.connect();
}

function dropped(error) {
  return error?.code === 'ECONNRESET' || /connection terminated|connection ended|server closed the connection|not queryable|Client has encountered a connection error/i.test(String(error?.message ?? ''));
}

async function runQuery(sql, params) {
  try {
    return await client.query(sql, params);
  } catch (error) {
    if (!dropped(error)) throw error;
    try { await client.end(); } catch { /* The socket is already gone. */ }
    await connect(connectionString);
    return client.query(sql, params);
  }
}

async function handle(message) {
  if (message.op === 'connect') {
    await connect(message.connectionString);
    return { ok: true };
  }
  if (message.op === 'query') {
    let sql = numbered(String(message.sql).replace(/BEGIN IMMEDIATE/g, 'BEGIN').trim());
    if (/^\s*insert\s+into\s+(match_events|audit_log)\b/i.test(sql) && !/\breturning\b/i.test(sql)) {
      sql = `${sql.replace(/;\s*$/, '')} RETURNING id`;
    }
    const result = await runQuery(sql, message.params);
    if (result.rows) {
      const rows = result.rows.map(plain);
      const inserted = rows[0]?.id;
      return {
        ok: true,
        result: {
          kind: result.command === 'SELECT' ? 'rows' : 'header',
          rows,
          changes: result.rowCount ?? 0,
          lastInsertRowid: typeof inserted === 'number' ? inserted : Number(inserted || 0),
        },
      };
    }
    return { ok: true, result: { kind: 'header', rows: [], changes: 0, lastInsertRowid: 0 } };
  }
  if (message.op === 'close') {
    await client?.end();
    return { ok: true };
  }
  throw new Error('Unknown database operation.');
}

parentPort.on('message', ({ port }) => {
  port.on('message', (message) => {
    handle(message).then(
      (payload) => port.postMessage(payload),
      (error) => port.postMessage({ ok: false, error: error.message, code: error.code }),
    );
  });
  port.postMessage({ ok: true, ready: true });
});
