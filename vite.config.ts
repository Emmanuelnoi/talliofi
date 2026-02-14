import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const CSP_META_REGEX =
  /(<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=")([^"]*)("[^>]*>)/i;

function relaxCspForDev(html: string): string {
  return html.replace(CSP_META_REGEX, (_match, prefix, content, suffix) => {
    let next = content;

    if (!/script-src[^;]*'unsafe-inline'/i.test(next)) {
      next = next.replace(
        /script-src\s+([^;]+)/i,
        (_directive: string, sources: string) =>
          `script-src ${sources} 'unsafe-inline'`,
      );
    }

    next = next.replace(
      /connect-src\s+([^;]+)/i,
      (_directive: string, sources: string) =>
        `connect-src ${sources} ws://localhost:* wss://localhost:*`,
    );

    next = next.replace(/;\s*upgrade-insecure-requests\s*;?/i, ';');

    return `${prefix}${next}${suffix}`;
  });
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'radix-ui': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'data-layer': ['dexie', '@tanstack/react-query', 'zustand', 'zod'],
          'date-utils': ['date-fns'],
          forms: ['react-hook-form', '@hookform/resolvers'],
          supabase: ['@supabase/supabase-js'],
          'ui-utils': [
            'sonner',
            'nuqs',
            'cmdk',
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'dev-csp-relaxation',
      apply: 'serve',
      transformIndexHtml(html) {
        return relaxCspForDev(html);
      },
    },
    {
      name: 'prod-csp-supabase-scope',
      apply: 'build',
      transformIndexHtml(html) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) return html;
        // Narrow wildcard *.supabase.co to specific project URL
        const host = new URL(supabaseUrl).host;
        return html
          .replace('https://*.supabase.co', `https://${host}`)
          .replace('wss://*.supabase.co', `wss://${host}`);
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Talliofi',
        short_name: 'Talliofi',
        description: 'Personal budget planning and expense tracking',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Keep heavy optional/reporting assets out of first-load precache.
        globIgnores: [
          '**/jspdf*',
          '**/html2canvas*',
          '**/chart-*.js',
          '**/index.es-*.js',
        ],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache-first for static assets
            urlPattern: /\.(?:js|css|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Network-first for API calls (if any)
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
      },
      devOptions: {
        // Enable PWA in development for testing
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
