import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Reuse the existing public/manifest.webmanifest (already linked in index.html).
      manifest: false,
      workbox: {
        // Precache the hashed build output (JS/CSS/fonts/icons) for instant
        // repeat-visit app-shell loads. Fonts are now tiny WOFF2, so this is cheap.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        navigateFallback: '/index.html',
        // Runtime-cache only the card art / sprite CDNs. Firestore, auth and the
        // TCG API JSON are intentionally NOT matched — they must stay live.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === 'images.pokemontcg.io' || url.hostname === 'img.pokemondb.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tcg-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into their own chunks so they cache across deploys
        // and don't bloat the page-route chunks. Each entry is a stable browser cache key.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['motion', 'motion/react'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-styled': ['styled-components'],
          'vendor-radix': ['@radix-ui/react-dialog', '@radix-ui/react-navigation-menu', '@radix-ui/react-select'],
          'vendor-icons': ['@tabler/icons-react'],
        },
      },
    },
    // Bumped from the default 500 — the page chunks are appropriately sized;
    // the warning was for the now-split vendors.
    chunkSizeWarningLimit: 700,
  },
})
