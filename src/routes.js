import { LibraryPage } from './pages/library/LibraryPage.js';
import { EditorPage } from './pages/editor/EditorPage.js';
import { SetupPage } from './pages/setup/SetupPage.js';
import { PlayPage } from './pages/play/PlayPage.js';
import { ResultsPage } from './pages/results/ResultsPage.js';

export const routes = [
  { path: '/', page: LibraryPage },
  { path: '/new', page: EditorPage },
  { path: '/edit/:id', page: EditorPage },
  { path: '/setup/:id', page: SetupPage },
  { path: '/play', page: PlayPage },
  { path: '/results', page: ResultsPage },
];
