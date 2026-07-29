// No-op stand-in for the `server-only` import guard when running integration
// tests under plain Node (see vitest.integration.config.ts) — the guard's
// only job is to fail a client-bundle build, which doesn't apply here.
export {};
