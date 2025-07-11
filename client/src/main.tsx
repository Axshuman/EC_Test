import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress WebSocket syntax errors from Replit devtools and Vite HMR conflicts
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorString = args.join(' ');
    // Filter out specific WebSocket syntax errors from devtools
    if (errorString.includes('The string did not match the expected pattern') ||
        errorString.includes('eruda') || 
        errorString.includes('Invalid url for WebSocket')) {
      return; // Silently ignore these specific errors
    }
    originalError.apply(console, args);
  };
  
  // Prevent unhandled promise rejections from WebSocket failures
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        event.reason.message.includes('The string did not match the expected pattern')) {
      event.preventDefault(); // Prevent the error from being logged
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
