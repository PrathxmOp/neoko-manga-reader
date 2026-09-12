import React from 'react';

/**
 * Wraps React.lazy to automatically retry dynamic imports if they fail
 * due to network blips, long tab idle, or new application deployments.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  interval = 1000
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (retriesLeft: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            const isChunkError =
              error?.name === 'TypeError' ||
              /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(
                error?.message || ''
              );

            if (retriesLeft > 0) {
              setTimeout(() => {
                attempt(retriesLeft - 1);
              }, interval);
            } else if (isChunkError) {
              // On persistent chunk load failure, reload page to fetch newly deployed assets
              const storageKey = 'neoko_chunk_reload_attempt';
              const lastReload = sessionStorage.getItem(storageKey);
              const now = Date.now();
              if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem(storageKey, now.toString());
                window.location.reload();
                return;
              }
              reject(error);
            } else {
              reject(error);
            }
          });
      };
      attempt(retries);
    })
  );
}
