import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const tunnelHost =
    env.VITE_TUNNEL_HOST || env.TUNNEL_HOST || env.CF_TUNNEL_HOST;
  return {
    define: {
      // Gemini API Key (Google's native SDK)
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      // OpenRouter API Key (alternative provider with 300+ models)
      "process.env.OPENROUTER_API_KEY": JSON.stringify(env.OPENROUTER_API_KEY),
      "process.env.VITE_OPENROUTER_API_KEY": JSON.stringify(
        env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": [
              "@radix-ui/react-avatar",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-label",
              "@radix-ui/react-popover",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-select",
              "@radix-ui/react-separator",
              "@radix-ui/react-slot",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
              "lucide-react",
              "class-variance-authority",
              "clsx",
              "tailwind-merge",
              "tailwindcss-animate",
            ],
            "chart-vendor": ["recharts"],
            "ai-vendor": ["@google/generative-ai"],
            "db-vendor": ["@supabase/supabase-js"],
            "markdown-vendor": ["react-markdown", "remark-gfm"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // Allow all hosts (useful for Cloudflare Tunnels or custom dev domains)
      // NOTE: Dev-only. Prefer explicit hosts for better security when possible.
      allowedHosts: true,
      // Listen on all interfaces so the proxy/tunnel can reach the dev server
      host: true,
      // Help Vite HMR work over Cloudflare Tunnel. Set VITE_TUNNEL_HOST to your tunnel domain (no scheme).
      hmr: tunnelHost
        ? {
          host: tunnelHost,
          protocol: "wss",
          clientPort: 443,
        }
        : undefined,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
