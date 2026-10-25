# Dire Dawa University Super Cup

Department football league. Six groups, four departments in each group.

The public site and the match desk read from one server. Scores, cards, substitutions, and the clock are stored in SQLite and checked in a transaction. Standings use confirmed full-time results only.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the match server and the site at http://127.0.0.1:5173.

Run `npm test` to check goals, cards, substitutions, permissions, and standings.

Run `npm run build` and then `npm start` to serve the built site and the API together.

The desk signs in as `admin`. Set `ADMIN_PASSWORD` on the server if the default password should not be used. The database file is `data/supercup.db`.
