import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 30000,
    isolate: true,
    pool: "threads",
    // Sequential: all files share one test database, so parallel workers would
    // wipe/seed under each other. Per-file wipe + sequential run = isolation.
    maxWorkers: 1,
  },
});
