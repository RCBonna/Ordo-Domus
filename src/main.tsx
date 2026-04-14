import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './Ordo-Domus.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
