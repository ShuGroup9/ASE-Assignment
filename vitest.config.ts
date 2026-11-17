import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Three Vitest projects; see docs/testing.md.
 *   unit        tests/unit/**        plain Node, no I/O, milliseconds
 *   component   tests/component/**   React components in jsdom (simulated browser)
 *   integration tests/integration/** real PostgreSQL + Mailpit via Testcontainers (needs Docker)
 * Browser end-to-end tests are Playwright, not Vitest (playwright.config.ts, tests/e2e/).
 */
const root = import.meta.dirname;
const alias = {
  "@": path.resolve(root, "src"),
  // `server-only` throws outside the React server bundler; tests run in plain Node.
  "server-only": path.resolve(root, "tests/helpers/empty-module.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    passWithNoTests: true,
    reporters: ["default", "json"],
    outputFile: { json: "reports/vitest.json" },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "reports/coverage",
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          setupFiles: ["tests/helpers/setup-component.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          testTimeout: 30000,
          hookTimeout: 180000,
          fileParallelism: false,
        },
      },
    ],
  },
});
