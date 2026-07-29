import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `globals: false` in vitest.config.ts means RTL's own auto-cleanup (which
// relies on registering against a global `afterEach`) never fires — without
// this, every test in a file renders into the same document and later
// queries can match leftover elements from earlier tests.
afterEach(() => {
  cleanup();
});
