import { openDatabaseAsync } from '../server/db.mjs';
import { handleRequest, prepareDatabase } from '../server/http.mjs';

let pending;

function database() {
  if (!pending) {
    pending = (async () => {
      const db = await openDatabaseAsync();
      await prepareDatabase(db);
      return db;
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}

function normalize(request) {
  const raw = request.url || '/';
  if (/^https?:\/\//.test(raw) || raw.startsWith('/api/') || raw === '/api') return;
  const queryAt = raw.indexOf('?');
  const query = queryAt >= 0 ? raw.slice(queryAt) : '';
  const parts = request.query?.path;
  if (parts) {
    const path = Array.isArray(parts) ? parts.join('/') : String(parts);
    request.url = `/api/${path}${query}`;
    return;
  }
  const path = queryAt >= 0 ? raw.slice(0, queryAt) : raw;
  request.url = `/api${path.startsWith('/') ? path : `/${path}`}${query}`;
}

export default async function handler(request, response) {
  try {
    normalize(request);
    const db = await database();
    await handleRequest(db, request, response);
    if ((request.url || '').includes('/api/live') && !response.writableEnded) {
      await new Promise((resolve) => request.on('close', resolve));
    }
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'The server could not complete that.' }));
    }
  }
}
