import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/rest/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
      '/auth/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
      '/functions/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always needed on first paint
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Radix UI + utility libraries — shared across most pages
          'vendor-ui': [
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          // Chart/analytics — only on report and dashboard pages
          'vendor-charts': ['recharts'],
        },
      },
    },
    // Warn when a chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,
  },
}));
