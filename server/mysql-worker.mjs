import mysql from 'mysql2/promise';
import { parentPort } from 'node:worker_threads';

let connection;

function plain(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key] = typeof value === 'bigint' ? Number(value) : value;
  return out;
}

async function handle(message) {
  if (message.op === 'connect') {
    connection = await mysql.createConnection({
      host: message.host,
      port: message.port,
      user: message.user,
      password: message.password,
      database: message.database,
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: false,
      multipleStatements: false,
      dateStrings: true,
      connectTimeout: 10000,
    });
    return { ok: true };
  }
  if (message.op === 'query') {
    const [result] = await connection.query(message.sql, message.params);
    if (Array.isArray(result)) return { ok: true, result: { kind: 'rows', rows: result.map(plain) } };
    return {
      ok: true,
      result: { kind: 'header', changes: result.affectedRows ?? 0, lastInsertRowid: Number(result.insertId || 0) },
    };
  }
  if (message.op === 'close') {
    await connection?.end();
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
