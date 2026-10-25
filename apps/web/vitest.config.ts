import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./vitest.empty.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"]
  }
});
