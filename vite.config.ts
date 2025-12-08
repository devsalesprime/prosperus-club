import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis do arquivo .env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Define a base correta para a subpasta
    base: '/prosperus-mentor-diagnosis/',
    define: {
      // Injeta a API Key e evita erros de "process is not defined"
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true, // Garante que a pasta dist seja limpa antes do build
      sourcemap: false
    },
    server: {
      port: 3000
    }
  }
})