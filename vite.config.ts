import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We use '' as the third argument to load all environment variables regardless of the VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Prioritize keys found in the Hostinger screenshot
  const apiKey = env.API_KEY || 
                 env.GOOGLE_API_KEY || 
                 env.VITE_GOOGLE_API_KEY || 
                 env.GEMINI_API_KEY || 
                 env.VITE_GEMINI_API_KEY || 
                 "";

  return {
    plugins: [react()],
    root: '.',
    base: './',
    // The 'define' object replaces 'process.env.API_KEY' in your code with the actual key string during build.
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
    server: {
      port: 3000,
      host: true,
    },
  };
});
