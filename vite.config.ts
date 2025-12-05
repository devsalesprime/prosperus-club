import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/prosperus-mentor-diagnosis/',
    define: {
      // Previne erro de "process is not defined" e injeta a chave
      'process.env': {},
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      port: 3000
    }
  }
})