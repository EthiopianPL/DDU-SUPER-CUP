import { spawn } from 'node:child_process';
import { pushClock, startServer } from './http.mjs';
import { openDatabase } from './db.mjs';

const db = openDatabase();
const { server } = await startServer(db, Number(process.env.PORT || 8787));
setInterval(() => {
  try {
    pushClock(db);
  } catch (error) {
    console.error('Clock tick error:', error.message);
  }
}, 1000);

const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  '--host', '127.0.0.1',
  '--port', '5173',
], { stdio: 'inherit' });

function shutdown() {
  vite.kill('SIGTERM');
  server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
vite.on('exit', (code) => {
  server.close();
  process.exit(code ?? 0);
});
