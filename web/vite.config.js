import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Field Shift",
        short_name: "Field Shift",
        description: "Crop-rotation advisor for farmers and national planners, built on NASA Earth data.",
        theme_color: "#184f95",
        background_color: "#f9f9f7",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /^https:\/\/api\.open-meteo\.com\//, handler: "NetworkFirst", options: { cacheName: "forecast", expiration: { maxEntries: 60, maxAgeSeconds: 7 * 86400 } } },
          { urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//, handler: "CacheFirst", options: { cacheName: "basemap", expiration: { maxEntries: 400, maxAgeSeconds: 30 * 86400 } } },
          { urlPattern: /^https:\/\/gibs\.earthdata\.nasa\.gov\//, handler: "CacheFirst", options: { cacheName: "gibs", expiration: { maxEntries: 400, maxAgeSeconds: 30 * 86400 } } },
        ],
      },
    }),
  ],
  server: { port: 5173, host: true, allowedHosts: true },
  preview: { port: 4173, host: true, allowedHosts: true },
});
