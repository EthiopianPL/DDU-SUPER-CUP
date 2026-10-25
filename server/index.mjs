import { pushClock, startServer } from './http.mjs';

const port = Number(process.env.PORT || 8787);
const { server, db } = await startServer(undefined, port);
setInterval(() => pushClock(db), 1000);
console.log(`Super Cup server on http://127.0.0.1:${port}`);
server.on('close', () => process.exit(0));
