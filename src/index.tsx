import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
// Clean dual authentication: Admin (local) + Passenger (Supabase OAuth)
import { AdminAuthProvider } from './hooks/useAdminAuth';
import { PassengerAuthProvider } from './hooks/usePassengerAuth';

console.log('index.tsx script starting');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating React root');
const root = ReactDOM.createRoot(rootElement);

console.log('Rendering React app');
root.render(
  <React.StrictMode>
    <HashRouter>
      {/* Supabase passenger auth (Google OAuth support) with local admin auth (demo mode) */}
      <PassengerAuthProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </PassengerAuthProvider>
    </HashRouter>
  </React.StrictMode>
);
console.log('React render method called');

// Let the document know when React has finished rendering
window.addEventListener('load', () => {
  console.log('Window loaded event fired');
  document.dispatchEvent(new Event('reactRendered'));
});
