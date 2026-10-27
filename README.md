# Dire Dawa University Super Cup

Department football league. Six groups, four departments in each group.

The public site and the match desk read from one server. Scores, cards, substitutions, and the clock are stored in Supabase Postgres and checked in a transaction. Standings use confirmed full-time group results only.

A new database starts with the desk account and an empty calendar. Sign in and add teams, then schedule each match, or use **Fill a group calendar** to place the missing round-robin. Knockout ties are scheduled on the same form: round of 16, quarter-final, semi-final, then the final. Discover shows that path as 16, 8, 4, 2. The top two in each group and the four best third-placed teams make the last 16.

Set `DDU_DEMO=1` only when a local SQLite file should load the old sample tournament. Tests do that. The live site does not.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the match server and the site at http://127.0.0.1:5173.

Run `npm test` to check goals, cards, substitutions, permissions, and standings.

Run `npm run build` and then `npm start` to serve the built site and the API together.

The desk signs in as `admin`. Set `ADMIN_PASSWORD` on the server if the default password should not be used.

The match database is Supabase Postgres. In the Supabase project, open Connect and copy the Session pooler URI (port 5432). Put that URI in `.env` as `DATABASE_URL`, exactly as shown, so any special characters in the password stay encoded. The server creates the tables from `server/schema.supabase.sql` on startup and adds the desk account when the database is empty. Do not use the transaction pooler on port 6543. Tests still use a temporary SQLite file through `DDU_DB`.

The Vercel site serves the pages and `/api` together. Add `DATABASE_URL` and `ADMIN_PASSWORD` in the Vercel project settings. The same values belong in the local `.env`.
