import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'charts', test: /recharts|d3-/ }, { name: 'supabase', test: /@supabase/ }] } } },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'GainLab – Weight Gain Planner',
        short_name: 'GainLab',
        description: 'Adaptive workout, nutrition and progress tracker for gaining weight',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['mediapipe/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Pose-analysis engine + model are big: cache on first use instead of precaching
        runtimeCaching: [
          { urlPattern: /\/mediapipe\//, handler: 'CacheFirst', options: { cacheName: 'mediapipe-wasm' } },
          { urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//, handler: 'CacheFirst', options: { cacheName: 'mediapipe-models' } },
          // Exercise demo photos: cached after first view so guided workouts work offline in the gym
          { urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/yuhonas\/free-exercise-db/, handler: 'CacheFirst', options: { cacheName: 'exercise-images', expiration: { maxEntries: 400 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
})
