import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/novacore/",   // 👈 repo name here
  plugins: [react()],
})
