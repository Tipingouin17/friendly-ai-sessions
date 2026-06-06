import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const DEV_API_URL = 'https://friendly-ai-sessions-development.up.railway.app';
// SECURITY: Never hardcode Stripe keys in source code.
// Set VITE_STRIPE_PUBLISHABLE_KEY as an environment variable in Vercel (dev environment).

const nonBlockingAppCssPlugin = (): Plugin => ({
  name: 'non-blocking-app-css',
  enforce: 'post',
  transformIndexHtml(html, context) {
    // Vite injects the compiled Tailwind bundle as a render-blocking stylesheet in production.
    // The landing page now has an inline critical mobile shell, so the full SPA stylesheet can
    // be loaded with print-media async CSS instead of a high-priority preload. This prevents the
    // full Tailwind bundle from competing with the first JavaScript and font requests on slow mobile.
    if (!context.bundle) {
      return html;
    }

    return html.replace(
      /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*)>/g,
      (match, beforeHref, href, afterHref) => {
        if (match.includes('media="print"') || match.includes('data-critical-async="true"')) {
          return match;
        }

        const attributes = `${beforeHref}${afterHref}`.trim();
        const safeAttributes = attributes ? ` ${attributes}` : '';

        return [
          `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'" data-critical-async="true"${safeAttributes}>`,
          `<noscript><link rel="stylesheet" href="${href}"${safeAttributes}></noscript>`,
        ].join('');
      }
    );
  },
});

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
    nonBlockingAppCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    modulePreload: false,
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
