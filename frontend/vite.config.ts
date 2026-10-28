import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({ routeFileIgnorePattern: ".(test|spec).(tsx?|js)" }),
    tailwindcss(),
  ],
  // Read .env from the repo root, shared with the backend.
  envDir: resolve(import.meta.dirname, ".."),
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5175,
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // Playwright specs live in e2e/ and run with `npm run test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
