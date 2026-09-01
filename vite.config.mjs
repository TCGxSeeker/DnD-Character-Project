import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Arcane Observatory",
        short_name: "Observatory",
        description: "A local-first D&D 5e character studio and level-up companion.",
        theme_color: "#10201d",
        background_color: "#07110f",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.open5e\.com\/v2\//,
          handler: "NetworkFirst",
          options: { cacheName: "open5e-v2", networkTimeoutSeconds: 5, expiration: { maxEntries: 80, maxAgeSeconds: 604800 } },
        }],
      },
    }),
  ],
});
