import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { org } from "./src/config/org";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: `${org.name} - ${org.chapterName}`,
        short_name: org.shortName,
        id: "/",
        description: org.meta.description,
        theme_color: org.meta.themeColor,
        background_color: org.meta.backgroundColor,
        lang: "en",
        dir: "ltr",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        iarc_rating_id: process.env.VITE_IARC_RATING_ID,
        related_applications: [],
        prefer_related_applications: false,
        screenshots: [
          {
            src: "/screenshots/app-home-mobile.png",
            sizes: "1170x2532",
            type: "image/png",
            form_factor: "narrow",
            label: "Mobile dashboard overview",
          },
          {
            src: "/screenshots/app-home-desktop.png",
            sizes: "1440x900",
            type: "image/png",
            form_factor: "wide",
            label: "Desktop dashboard overview",
          },
        ],
        icons: [
          { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
        ],
        categories: ["business", "productivity"],
        shortcuts: [
          { name: "Events", url: "/events", description: `View ${org.terms.chapter.toLowerCase()} events` },
          { name: "Members", url: "/people", description: "View member directory" },
        ],
      },
      workbox: {
        // Work around intermittent terser exits during SW generation.
        mode: "development",
        // Our main bundle can exceed Workbox's default 2MiB precache limit.
        // Increasing this prevents production builds from failing when the app grows.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Never cache auth/session endpoints to avoid stale session behavior under load.
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Election data should always be fresh during active voting.
            urlPattern:
              /^https:\/\/.*\.supabase\.co\/rest\/v1\/(election_votes|election_positions|election_candidates|elections).*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
