import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Providers } from '@/app/providers';
import { router } from '@/app/router';
import './index.css';

// Listen for service worker updates and notify the user
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New version available — show toast
          void import('sonner').then(({ toast }) => {
            toast('App updated', {
              description: 'A new version is available.',
              action: {
                label: 'Refresh',
                onClick: () => window.location.reload(),
              },
              duration: Infinity,
            });
          });
        }
      });
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
