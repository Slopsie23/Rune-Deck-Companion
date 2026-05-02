import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500, // To hide the chunk size warning in Vercel
    },
    server: {
      proxy: {
        '/api/sf': {
          target: 'https://api.scryfall.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sf/, ''),
          headers: {
            'User-Agent': 'RuneDeckCompanion/1.0',
            'Accept': '*/*, application/json'
          }
        },
        '/api/ad': {
          target: 'https://archidekt.com/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ad/, '/decks'),
          headers: {
            'User-Agent': 'RuneDeckCompanion/1.0',
            'Accept': '*/*, application/json'
          }
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
