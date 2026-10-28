import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real SPA against the real Django API. Both servers
// get their own ports (backend 8016, frontend 5185) so a running `just dev`
// stack is left alone. The backend uses core.settings.e2e (SQLite, no Docker).
const BACKEND_URL = "http://127.0.0.1:8016";
const FRONTEND_URL = "http://127.0.0.1:5185";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "uv run python manage.py migrate --noinput && uv run python manage.py runserver 127.0.0.1:8016 --noreload",
      cwd: "../backend",
      url: `${BACKEND_URL}/api/health/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DJANGO_SETTINGS_MODULE: "core.settings.e2e",
        SECRET_KEY: process.env.SECRET_KEY ?? "e2e-only-insecure-secret-key-not-for-production-use",
        E2E_CORS_ALLOWED_ORIGINS: FRONTEND_URL,
        VIRTUAL_ENV: "",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5185 --strictPort",
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_BASE_URL: BACKEND_URL },
    },
  ],
});
