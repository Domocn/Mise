import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Apply dark mode before render to prevent flash
const savedDarkMode = localStorage.getItem('mise_dark_mode');
if (savedDarkMode === 'true' || 
    (savedDarkMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Mise SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Mise SW registration failed:', error);
      });
  });
}

// Debug: log that React is starting
console.log('[index.js] React starting...');

// Update the pre-react debug to show React is loading
const preReactDebug = document.getElementById('pre-react-debug');
if (preReactDebug) {
  preReactDebug.style.background = 'purple';
  preReactDebug.textContent = 'React is mounting...';
}

try {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  console.log('[index.js] ReactDOM root created');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('[index.js] React render called');
} catch (error) {
  console.error('[index.js] React failed to mount:', error);
  const preReactDebug = document.getElementById('pre-react-debug');
  if (preReactDebug) {
    preReactDebug.style.background = 'red';
    preReactDebug.textContent = 'React FAILED: ' + error.message;
  }
}
