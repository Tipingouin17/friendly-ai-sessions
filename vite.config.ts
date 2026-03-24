import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
