/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// En GitHub Pages la app vive en /<nombre del repo>/ (hoy /baulix/). En local, en la raíz.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  resolve: {
    alias: [
      { find: /^@games$/, replacement: src('games/index.ts') },
      { find: /^@games\//, replacement: src('games/') },
      { find: /^@core\//, replacement: src('core/') },
      { find: /^@app\//, replacement: src('app/') },
    ],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true },
      manifest: {
        name: 'Baulix',
        short_name: 'Baulix',
        description: 'Baúl de minijuegos para jugar en el móvil, incluso sin conexión.',
        lang: 'es',
        theme_color: '#0f1020',
        background_color: '#0f1020',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
