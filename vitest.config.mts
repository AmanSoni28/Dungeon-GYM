import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    setupFiles: ["src/test/setup.ts"],
    restoreMocks: true,
    // accessibility-role queries in jsdom are slow when many test files run in parallel
    testTimeout: 20000,
  },
});
