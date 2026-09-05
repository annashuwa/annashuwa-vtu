/**
 * Non-destructive migration for the foundation redesign.
 *
 * Backfills newly-added fields on existing documents WITHOUT dropping data:
 *   - Wallets:   availableBalance / pendingBalance (preserve the balance split)
 *   - Transactions: idempotencyKey (derived from unique reference)
 *   - DataPlans / ServicePackages: costPrice / providerPlans placeholders
 *
 * Run: npm run db:migrate
 */
import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import { Wallet, Transaction, DataPlan, ServicePackage } from "../models";

async function migrateWallets() {
  const cursor = Wallet.find({}).cursor();
  let updated = 0;
  for await (const w of cursor) {
    if (w.availableBalance == null || w.pendingBalance == null) {
      const bal = Number(w.balance ?? 0);
      await Wallet.updateOne({ _id: w._id }, { $set: { availableBalance: bal, pendingBalance: 0 } });
      updated++;
    }
  }
  console.log(`[migrate] wallets backfilled: ${updated} of ${await Wallet.countDocuments({})}`);
}

async function migrateTransactions() {
  const cursor = Transaction.find({ idempotencyKey: null }).cursor();
  let updated = 0;
  for await (const t of cursor) {
    await Transaction.updateOne({ _id: t._id }, { $set: { idempotencyKey: t.reference } });
    updated++;
  }
  console.log(`[migrate] transactions backfilled idempotencyKey: ${updated}`);
}

async function migratePlans() {
  const dpUpdated = await DataPlan.updateMany(
    { costPrice: { $exists: false } },
    { $set: { costPrice: null, providerPlans: {} } }
  );
  const spUpdated = await ServicePackage.updateMany(
    { costPrice: { $exists: false } },
    { $set: { costPrice: null, providerPlans: {} } }
  );
  console.log(`[migrate] data plans updated: ${dpUpdated.modifiedCount}`);
  console.log(`[migrate] service packages updated: ${spUpdated.modifiedCount}`);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("[migrate] connected", mongoose.connection.name);
  await migrateWallets();
  await migrateTransactions();
  await migratePlans();
  await mongoose.disconnect();
  console.log("[migrate] done — existing data preserved");
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
