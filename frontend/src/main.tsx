import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import PwaPrompts from './pwa/PwaPrompts';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('QAVLIO root element is missing');

// The service worker (PWA) is registered by the usePwa hook inside PwaPrompts.
// It is enabled only in production and where the browser supports it, and its
// failure is non-fatal so the app always works as a regular web app.

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <PwaPrompts />
    </BrowserRouter>
  </React.StrictMode>,
);
