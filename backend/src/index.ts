import app from "./app";
import { connectDB } from "./db";
import { PORT } from "./config";
import { providerManager } from "./services/vtu/providers/registry";
import { startReconciliationJob, stopReconciliationJob } from "./services/jobs/reconciliation";

async function main() {
  await connectDB();
  await providerManager.initActiveFromDb();
  startReconciliationJob();
  console.log(`[db] connected`);
  const server = app.listen(PORT, () => {
    console.log(`[api] ANNASHUWA VTU backend listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] ${signal} received, shutting down...`);
    stopReconciliationJob();
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  async function disconnect() {
    const { disconnectDB } = await import("./db");
    await disconnectDB();
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[api] failed to start", err);
  process.exit(1);
});