import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept all native fetch calls to automatically append the X-User-Id header for iframe compatibility (sameSite issue)
const originalFetch = window.fetch;
const interceptFetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : (input && typeof input === "object" && "url" in input ? (input as any).url : "");
  if (url && (url.startsWith("/api/") || url.includes("/api/"))) {
    const storedUser = localStorage.getItem("user_session");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        if (userObj && userObj.id) {
          init = init || {};
          init.headers = init.headers || {};
          if (init.headers instanceof Headers) {
            init.headers.set("X-User-Id", userObj.id);
          } else if (Array.isArray(init.headers)) {
            const idx = init.headers.findIndex(h => h[0].toLowerCase() === "x-user-id");
            if (idx > -1) {
              init.headers[idx] = ["X-User-Id", userObj.id];
            } else {
              init.headers.push(["X-User-Id", userObj.id]);
            }
          } else {
            (init.headers as any)["X-User-Id"] = userObj.id;
          }
        }
      } catch (e) {
        console.error("Error parsing user_session for fetch override", e);
      }
    }
  }
  return originalFetch(input, init);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: interceptFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to redefine window.fetch via Object.defineProperty, trying assignment as fallback", e);
  try {
    (window as any).fetch = interceptFetch;
  } catch (err) {
    console.error("Critical: Could not intercept window.fetch", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

