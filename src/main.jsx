import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { QueueProvider } from './contexts/QueueContext';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <QueueProvider>
        <AudioPlayerProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AudioPlayerProvider>
      </QueueProvider>
    </LanguageProvider>
  </React.StrictMode>
);
