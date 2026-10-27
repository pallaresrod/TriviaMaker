// Adds the games API to Vite's dev server (`npm run dev`) and preview server (`npm start`).

import { createApiHandler } from './apiHandler.js';
import { createGamesStore } from './gamesStore.js';

export function triviaApi({ dir }) {
  const handler = createApiHandler(createGamesStore(dir));
  return {
    name: 'trivia-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
