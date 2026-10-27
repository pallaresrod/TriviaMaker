import './styles/base.css';
import './styles/components.css';
import { startRouter } from './router.js';
import { routes } from './routes.js';

startRouter(document.getElementById('app'), routes);
