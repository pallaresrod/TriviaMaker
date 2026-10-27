import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { triviaApi } from './server/vitePlugin.js';

// Where games are saved. Override with TRIVIAS_DIR=/some/folder npm run dev
const triviasDir = process.env.TRIVIAS_DIR ?? fileURLToPath(new URL('./trivias', import.meta.url));

export default defineConfig({
  plugins: [triviaApi({ dir: triviasDir })],
  server: {
    open: true,
    // Saving a game writes a file; don't let that trigger a page reload.
    watch: { ignored: ['**/trivias/**'] },
  },
  preview: { open: true },
  test: { include: ['src/**/*.test.js', 'server/**/*.test.js'] },
});
