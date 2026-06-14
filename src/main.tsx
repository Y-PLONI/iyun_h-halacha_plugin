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

// הבנייה מייצרת IIFE שרץ ב-<head> לפני שה-<body> נוצר, לכן מחכים ל-DOM.
function mount(): void {
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
