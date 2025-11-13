import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// AGGRESSIVE: Suppress ResizeObserver errors (known benign issue with react-resizable-panels)
const resizeObserverErr = window.console.error;
window.console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ResizeObserver') || args[0].includes('undelivered notifications'))
  ) {
    return;
  }
  resizeObserverErr(...args);
};

// Catch error events
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('ResizeObserver') || e.message.includes('undelivered notifications'))) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
}, true);

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && e.reason.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);
