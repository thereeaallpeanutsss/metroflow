import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  // Support custom base, GitHub Actions auto-detection, or relative base
  const ghRepo = process.env.GITHUB_REPOSITORY;
  const repoName = ghRepo ? `/${ghRepo.split('/')[1]}/` : undefined;
  const basePath = process.env.VITE_BASE || process.env.BASE_URL || repoName || './';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        workbox: {
          navigateFallback: null,
        },
        manifest: {
          name: 'MetroFlow - ÄÄPIZRM Metro Router',
          short_name: 'MetroFlow',
          description: 'Modern iOS-optimized metro trip planner and interactive transit navigator for the ÄÄPIZRM 044 U-Bahn system.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || __dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
