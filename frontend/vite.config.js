import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'SignRelay',
        short_name: 'SignRelay',
        description: 'Pakistan Sign Language communication app',
        theme_color: '#1B2340',
        background_color: '#EEF1F3',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Hand model, letter model and MediaPipe files are big: they are saved on first use
        // (so they work offline after the first visit) instead of at install time.
        globIgnores: ['models/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'signrelay-models',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 20 }
            }
          }
        ]
      }
    })
  ],
})
