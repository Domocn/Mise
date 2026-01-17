import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Apply dark mode before render to prevent flash
const savedDarkMode = localStorage.getItem('kitchenry_dark_mode');
if (savedDarkMode === 'true' ||
    (savedDarkMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Kitchenry SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Kitchenry SW registration failed:', error);
      });
  });
}

// Wait for DOM to be ready before rendering
const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
