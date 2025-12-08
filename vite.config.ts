import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // ou o plugin que usa

export default defineConfig({
  // Ajuste base conforme deployment; './' para arquivos relativos (bom para arquivos locais/containers)
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})