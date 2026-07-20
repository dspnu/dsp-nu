import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

async function bootstrap() {
  // Service workers are unreliable in Capacitor WKWebView — keep PWA SW for web only.
  if (!Capacitor.isNativePlatform()) {
    try {
      const { registerSW } = await import("virtual:pwa-register");
      registerSW({ immediate: true });
    } catch (e) {
      console.warn("PWA service worker registration skipped:", e);
    }
  } else if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* ignore */
    }
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
