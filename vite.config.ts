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
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // Inline registration in index.html so tools (e.g. PWABuilder report card) that scan HTML
      // can see the SW without parsing the main bundle. With default `auto` + `virtual:pwa-register`
      // in the app bundle, the plugin does not inject into HTML.
      injectRegister: "inline",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
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
        display_override: ["tabbed", "window-controls-overlay", "standalone"],
        // Microsoft Edge: opt in to pinning the installed PWA in the browser side panel.
        // https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/sidebar
        edge_side_panel: {
          preferred_width: 480,
        },
        tab_strip: {
          home_tab: {
            scope_patterns: [{ pathname: "/" }],
          },
          new_tab_button: {
            url: "/events",
          },
        },
        orientation: "portrait-primary",
        scope: "/",
        // Additional origins that should be treated as "in-scope" for the PWA.
        // Requires a matching `/.well-known/web-app-origin-association` on the extended origin(s).
        scope_extensions: [
          {
            type: "origin",
            origin: `https://${org.domain}`,
          },
          {
            type: "origin",
            origin: `https://www.${org.domain}`,
          },
        ],
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
        share_target: {
          action: "/",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        launch_handler: {
          // With `display_override` tabbed mode, opens launches in a new in-app tab when possible.
          client_mode: "navigate-new",
        },
        protocol_handlers: [
          {
            protocol: "web+dspnu",
            url: "/pwa-protocol?uri=%s",
          },
        ],
        file_handlers: [
          {
            action: "/pwa-open",
            accept: {
              "text/calendar": [".ics"],
              "text/csv": [".csv"],
              "application/pdf": [".pdf"],
            },
            launch_type: "single-client",
          },
        ],
        widgets: [
          {
            name: `${org.shortName} — At a glance`,
            short_name: "Glance",
            description: "Shortcuts to Events, Members, and Home",
            tag: "chapter-glance",
            template: "content-item",
            data: "/pwa-widgets/glance.data.json",
            type: "application/json",
            ms_ac_template: "/pwa-widgets/glance.ac.json",
            auth: true,
            update: 3600,
            actions: [
              { action: "events", title: "Events" },
              { action: "members", title: "Members" },
              { action: "home", title: "Home" },
            ],
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
