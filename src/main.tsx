import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import OrdoDomus from './OrdoDomus.tsx';
import { initObservability, ObservabilityErrorBoundary } from './lib/observability';

import './index.css';

initObservability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ObservabilityErrorBoundary fallback={<div role="alert">Falha inesperada ao carregar o Ordo Domus.</div>}>
      <OrdoDomus />
    </ObservabilityErrorBoundary>
  </StrictMode>,
);
