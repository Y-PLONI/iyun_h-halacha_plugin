import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import './styles/app.css';
import { App } from './App';
import { hasOtzaria } from './otzaria/sdk';
import { installMockOtzaria } from './otzaria/mockSdk';

// פיתוח בדפדפן רגיל: מתקינים mock SDK לפני העלאת האפליקציה.
if (import.meta.env.DEV && !hasOtzaria()) {
  installMockOtzaria();
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
