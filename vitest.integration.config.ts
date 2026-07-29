import { defineConfig } from "vitest/config";

/**
 * Integration tests run against the real local Supabase stack (RLS
 * policies, triggers, functions) — Node environment, no jsdom, no shared
 * setup file with the unit-test project. Requires `pnpm exec supabase
 * start` to be running (plan §16 Phase-3 DoD).
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    testTimeout: 20000,
  },
});
