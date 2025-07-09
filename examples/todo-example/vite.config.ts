import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mirrorStatePlugin } from '../../packages/vite-plugin-mirrorstate/dist'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mirrorStatePlugin()],
  resolve: {
    alias: {
      'react-mirrorstate': path.resolve(__dirname, '../../packages/react-mirrorstate/dist'),
      'vite-plugin-mirrorstate': path.resolve(__dirname, '../../packages/vite-plugin-mirrorstate/dist'),
    }
  }
})
