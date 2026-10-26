import pg from 'pg';
import { parentPort } from 'node:worker_threads';

pg.types.setTypeParser(20, (value) => Number(value));

let client;

function numbered(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function plain(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key] = typeof value === 'bigint' ? Number(value) : value;
  return out;
}

async function handle(message) {
  if (message.op === 'connect') {
    const connectionString = message.connectionString;
    client = new pg.Client({
      connectionString,
      ssl: connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    await client.connect();
    return { ok: true };
  }
  if (message.op === 'query') {
    let sql = numbered(String(message.sql).replace(/BEGIN IMMEDIATE/g, 'BEGIN').trim());
    if (/^\s*insert\s+into\s+(match_events|audit_log)\b/i.test(sql) && !/\breturning\b/i.test(sql)) {
      sql = `${sql.replace(/;\s*$/, '')} RETURNING id`;
    }
    const result = await client.query(sql, message.params);
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
