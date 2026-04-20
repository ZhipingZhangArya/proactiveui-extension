import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "legacy"],
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/core/**",
        "src/app/api/intent/**",
        "src/app/api/auth/signup/**",
      ],
      exclude: ["**/__tests__/**"],
      thresholds: {
        lines: 70,
        statements: 70,
        branches: 70,
        functions: 70,
      },
    },
  },
});
