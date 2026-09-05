import mongoose from "mongoose";
import { MONGODB_URI } from "../config";

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();
  const dbName = mongoose.connection.name;
  await mongoose.disconnect();
  console.log(`[db] dropped database "${dbName}"`);
}

main().catch((err) => {
  console.error("[db] drop failed", err);
  process.exit(1);
});