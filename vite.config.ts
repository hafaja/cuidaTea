import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "CuidaTEA",
        short_name: "CuidaTEA",
        description: "Tableros de pictogramas para niños y adolescentes autistas, compartidos entre familia y centro.",
        lang: "es",
        start_url: "/",
        display: "standalone",
        background_color: "#fbf5ec",
        theme_color: "#2f5d46",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Pictogramas ARASAAC: se guardan para que el tablero funcione sin conexión
            urlPattern: /^https:\/\/static\.arasaac\.org\/.*/,
            handler: "CacheFirst",
            options: { cacheName: "arasaac", expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
});
