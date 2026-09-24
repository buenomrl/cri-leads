import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Espelha o "paths" do tsconfig.json: a camada de regra pura mora junto
      // das Edge Functions e e' consumida pelo front por este alias.
      '@shared': fileURLToPath(new URL('./supabase/functions/_shared', import.meta.url)),
    },
  },
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
});
