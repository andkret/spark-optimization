import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/spark-optimization/',
  plugins: [react()],
  // other settings can stay the same
})
