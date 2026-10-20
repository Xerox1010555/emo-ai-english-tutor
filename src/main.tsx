import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { TutorProvider } from './context/TutorContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { I18nProvider } from './lib/i18n/index.tsx';
import { registerServiceWorker } from './lib/notifications/push';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <TutorProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </TutorProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);

// The service worker powers Web Push and offline opening of the app.
// It is only registered in production builds, so it never fights with HMR.
void registerServiceWorker();
