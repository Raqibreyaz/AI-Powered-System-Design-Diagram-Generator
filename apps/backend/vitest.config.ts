import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    alias: {
      "@diagram-forge/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
