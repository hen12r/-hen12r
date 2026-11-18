import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Only VITE_* variables reach the browser bundle. Never put secret keys in VITE_* variables.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, host: '0.0.0.0' },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
  },
});
