import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // funciona en la subcarpeta de GitHub Pages (usuario.github.io/repositorio/)
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1,2 MB; no es un problema
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  plugins: [
    VitePWA({
      // 'prompt': cuando publiques una versión nueva, el juego muestra un aviso para actualizar.
      registerType: 'prompt',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Muda',
        short_name: 'Muda',
        description: 'Plataformas 2D: un cangrejo ermitaño aprende que para crecer hay que soltar la casa que le queda chica.',
        lang: 'es-CL',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#0C2A30',
        theme_color: '#0C2A30',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda todo el juego en el teléfono para que funcione sin internet.
        globPatterns: ['**/*.{js,css,html,png,webp,jpg,svg,json,woff,woff2,m4a,mp3,ogg}'],
        // El límite por defecto es 2 MB; Phaser lo supera.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
