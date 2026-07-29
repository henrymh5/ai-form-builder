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
    // Integration tests run under plain Node, not Next's build pipeline, which is what
    // normally strips the `server-only` import guard. Alias it to a no-op here so
    // repository/engine modules (`import "server-only"`) can be imported directly instead
    // of every integration test having to re-implement their DB calls via the raw client.
    alias: {
      "server-only": new URL("./vitest.server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    testTimeout: 20000,
  },
});
