# TriviaMaker
App that lets you create, save and play Jeopardy-style trivia games.

## Getting started
Requires [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev      # starts the app at http://localhost:5173 and opens it
```

| Command | What it does |
| --- | --- |
| `npm run dev` | App + games server with live reload (use this while working on the code) |
| `npm start` | Builds the app and serves the optimized version (at http://localhost:4173) |
| `npm test` | Runs the tests once (`npm run test:watch` to keep them running) |
| `npm run build` | Builds the production version into `dist/` |

## Where games are saved
Every game is a JSON file in the **`trivias/`** folder at the root of the project:

```
trivias/
  movie-night.json
  family-quiz.json
```

- The folder is created the first time you save a game. If it doesn't exist, the library is empty.
- The file name comes from the title when the game is first saved (`Movie Night` → `movie-night.json`). Renaming the game later keeps the same file. Two games with the same title get `-2`, `-3`…
- You can copy `.json` files into the folder by hand (for example ones exported from another computer) and they appear in the library. Broken files are skipped with a warning in the terminal.
- `trivias/` is in `.gitignore`, so your games stay on your computer and are not pushed to GitHub. Use **Export** / **Import** to share one.
- Save somewhere else with `TRIVIAS_DIR=/path/to/folder npm run dev`.

A game *in progress* (scores, used questions) is kept in the browser, so it survives a refresh.

## How it works
- **Create**: each game has 6 categories with 4 questions each (50, 100, 150, 200 pts). Every question has an answer you can reveal while playing. Incomplete games are saved as drafts and can't be played yet.
- **Play**: choose 1–4 players. A random player picks the first question. Players answer out loud, then you tap who got it right. That player gets the points and picks next. If nobody gets it right, the same player picks again. The game ends when all 24 questions are used.

## Project structure
```
index.html                 HTML shell; loads src/main.js
vite.config.js             Dev server config; plugs in the games server
server/                    Runs in Node, inside the Vite server
  gamesStore.js            Reads/writes trivias/*.json
  apiHandler.js            /api/games endpoints
  vitePlugin.js            Adds the API to `npm run dev` and `npm start`
src/                       Runs in the browser
  main.js                  Entry point: loads global styles, starts the router
  routes.js                URL → page table
  router.js                Hash router (#/edit/:id ...)
  constants.js             Board size, points, player limits, storage keys
  api/gamesApi.js          Calls the games server
  models/                  Game rules, shared by browser and server (unit tested)
    game.js                Create / validate / duplicate / import-export games
    session.js             Playing: pick tile, award points, ranking
  storage/                 Browser storage: the game in progress
  pages/                   One folder per screen: page, its components, its CSS
    library/  editor/  setup/  play/  results/
  styles/                  Colour palette, reset and shared components
  utils/                   DOM helpers, file download/upload
```

### API
| Request | Does |
| --- | --- |
| `GET /api/games` | List all games |
| `GET /api/games/:id` | One game |
| `POST /api/games` | Create (id is picked from the title) |
| `PUT /api/games/:id` | Save |
| `DELETE /api/games/:id` | Delete |
