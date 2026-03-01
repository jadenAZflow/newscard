import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // GEMINI_API_KEY removed for security, handled by Vercel Serverless Functions
      'process.env.USERNAME': JSON.stringify(env.USERNAME),
      'process.env.PASSWORD': JSON.stringify(env.PASSWORD)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
