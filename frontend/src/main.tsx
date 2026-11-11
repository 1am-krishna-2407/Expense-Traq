import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { wakeServer } from './api/serverWake';
import './index.css';

// Start waking a sleeping (free-tier) API immediately, before React even renders.
void wakeServer().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
