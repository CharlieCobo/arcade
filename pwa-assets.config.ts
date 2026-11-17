import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // El logo ya trae su margen: apple sin padding; maskable con un poco para caber en el círculo seguro
    maskable: { ...minimal2023Preset.maskable, padding: 0.14, resizeOptions: { background: '#0f1020' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0f1020' } },
  },
  images: ['public/logo.svg'],
})
