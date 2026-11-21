import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { QueueProvider } from './contexts/QueueContext';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import { AuthProvider } from './contexts/AuthContext';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '446659186130-sifg4v3sr8dbc487cbee5kd053scaocf.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <LanguageProvider>
          <QueueProvider>
            <AudioPlayerProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AudioPlayerProvider>
          </QueueProvider>
        </LanguageProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
