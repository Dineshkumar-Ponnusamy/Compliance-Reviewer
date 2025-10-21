import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './pages/App';
import { AISettingsProvider } from './context/AISettingsContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AISettingsProvider>
      <App />
    </AISettingsProvider>
  </React.StrictMode>,
);
