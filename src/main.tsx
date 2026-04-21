import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import OrdoDomus from './OrdoDomus.tsx';




import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OrdoDomus />
  </StrictMode>,
);
