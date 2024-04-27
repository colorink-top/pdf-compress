import {defineConfig} from 'vite'
import { resolve, dirname } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import url from 'url'

const _filename = url.fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /gs\..+\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })],
    build: {
      target: 'esnext',
        rollupOptions: { 
          input: { 
            index: resolve(_dirname, "index.html"),
            index2: resolve(_dirname, "index2.html"),
            }, 
        }, 
    },
    base: "/pdf-compress"
})
