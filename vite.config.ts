
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    root: '.',
    base: './',
    // This defines process.env.API_KEY for the browser code
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY || env.GEMINI_API_KEY || ""),
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
