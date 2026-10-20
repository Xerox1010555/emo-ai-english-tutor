import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { TutorProvider } from './context/TutorContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TutorProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </TutorProvider>
    </AuthProvider>
  </StrictMode>,
);
