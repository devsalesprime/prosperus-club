import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // remova se não usar React

export default defineConfig({
  // Use './' para que os assets sejam referenciados de forma relativa
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})