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

function pathText(value) {
  const text = Array.isArray(value) ? value.join('/') : String(value ?? '');
  try {
    return decodeURIComponent(text).replace(/^\/+|\/+$/g, '');
  } catch {
    return text.replace(/^\/+|\/+$/g, '');
  }
}

export function normalize(request) {
  const raw = request.url || '/';
  const url = new URL(raw, 'http://127.0.0.1');
  const rest = pathText(request.query?.__ddu ?? url.searchParams.get('__ddu'));
  if (rest && !rest.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\0'))) {
    let path = url.pathname || '/';
    if (!path.startsWith('/api')) path = `/api${path.startsWith('/') ? path : `/${path}`}`;
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'api' && segments.length <= 2) path = `${path.replace(/\/$/, '')}/${rest}`;
    url.searchParams.delete('__ddu');
    if (request.query && typeof request.query === 'object') {
      for (const [key, value] of Object.entries(request.query)) {
        if (key === '__ddu' || key === 'path' || value == null || Array.isArray(value) || url.searchParams.has(key)) continue;
        url.searchParams.set(key, String(value));
      }
    }
    const search = url.searchParams.toString();
    request.url = search ? `${path}?${search}` : path;
    return;
  }
  if (/^https?:\/\//.test(raw) || raw.startsWith('/api/') || raw === '/api') return;
  const queryAt = raw.indexOf('?');
  const query = queryAt >= 0 ? raw.slice(queryAt) : '';
  const parts = request.query?.path;
  if (parts) {
    request.url = `/api/${pathText(parts)}${query}`;
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
