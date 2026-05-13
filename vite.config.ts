import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const DEV_API_URL = 'https://friendly-ai-sessions-development.up.railway.app';
// SECURITY: Never hardcode Stripe keys in source code.
// Set VITE_STRIPE_PUBLISHABLE_KEY as an environment variable in Vercel (dev environment).

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // When building in development mode (dev branch), hardcode the dev backend URL
  // This overrides any VITE_API_URL set in Vercel project settings
  ...(mode === 'development' ? {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(DEV_API_URL),
      // VITE_STRIPE_PUBLISHABLE_KEY is set via Vercel environment variables (dev environment)
    }
  } : {}),
  server: {
    host: "::",
    port: 8080,
    allowedHosts: 'all',
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
        manualChunks(id) {
          // Core React runtime — always needed on first paint
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          // Radix UI + utility libraries — shared across most pages
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui';
          }
          // Chart/analytics — only on report and dashboard pages
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
        },
      },
    },
    // Warn when a chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,
  },
}));
