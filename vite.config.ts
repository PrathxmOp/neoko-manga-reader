import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

declare const process: { cwd: () => string; env: Record<string, string> };
declare const Buffer: { from: (str: string) => { toString: (encoding: string) => string } };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const authUser = env.VITE_SUWAYOMI_AUTH_USER || env.SUWAYOMI_USER;
  const authPass = env.VITE_SUWAYOMI_AUTH_PASS || env.SUWAYOMI_PASS;
  const basicAuthHeader = (authUser && authPass) ? ('Basic ' + Buffer.from(`${authUser}:${authPass}`).toString('base64')) : undefined;
  const proxyHeaders: Record<string, string> = basicAuthHeader ? { Authorization: basicAuthHeader } : {};

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'NEOKO Manga Reader',
          short_name: 'NEOKO',
          description: 'Next-gen modern manga reader powered by Suwayomi',
          theme_color: '#0c0c14',
          background_color: '#0c0c14',
          display: 'standalone',
          icons: [
            {
              src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=192&q=80',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=512&q=80',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          navigationPreload: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'manga-covers-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/(manga|chapter|source)\/.*\/thumbnail/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'manga-thumbnails-cache',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/v1\/(?:manga\/[^\/]+\/)?chapter\/.*\/page\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'manga-pages-cache',
                expiration: {
                  maxEntries: 1000,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'icons': ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4567',
          changeOrigin: true,
          secure: false,
          headers: proxyHeaders,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              if (proxyRes.statusCode === 401) {
                delete proxyRes.headers['www-authenticate'];
              }
            });
          },
        },
      },
    },
    preview: {
      port: 3000,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4567',
          changeOrigin: true,
          secure: false,
          headers: proxyHeaders,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              if (proxyRes.statusCode === 401) {
                delete proxyRes.headers['www-authenticate'];
              }
            });
          },
        },
      },
    },
  };
});
