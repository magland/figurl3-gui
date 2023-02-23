import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA( // this may have been causing problems. disabling for now
    //   {
    //     registerType: 'autoUpdate',
    //     devOptions: {
    //       enabled: true
    //     }
    //   }
    // )
  ],
  resolve: {
    alias: {
      "simple-peer": "simple-peer/simplepeer.min.js"
    }
  }
})
