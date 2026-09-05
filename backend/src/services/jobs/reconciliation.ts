/**
 * Background job: reconciliation of pending VTU transactions.
 *
 * Purchases that a provider left in PENDING / PROCESSING (accepted but not
 * resolved) are checked against the provider and finalized:
 *   - provider confirms SUCCESS   -> mark SUCCESSFUL
 *   - provider confirms FAILURE   -> refund + mark REFUNDED
 *   - still pending / unverifiable
 *       - within max-age window   -> leave for a later run
 *       - past max-age window     -> refund + mark REFUNDED (never hold user
 *                                    funds indefinitely)
 *
 * Runs on a configurable interval and can be triggered manually via the admin
 * endpoint. A single in-process guard prevents overlapping runs.
 */
import type { ClientSession } from "mongoose";
import { Transaction } from "../../models";
import { getVtuProvider } from "../vtu";
import { updateTransactionStatus } from "../transaction.service";
import { creditWallet } from "../wallet.service";
import { createNotification } from "../notification.service";
import { createAuditLog } from "../../lib/audit";
import { logError, logInfo } from "../../lib/logger";
import { withDbTransaction } from "../../lib/mongo-tx";
import { round2 } from "../../lib/utils";
import {
  JOB_RECONCILE_BATCH,
  JOB_RECONCILE_ENABLED,
  JOB_RECONCILE_GRACE_MS,
  JOB_RECONCILE_INTERVAL_MS,
  JOB_RECONCILE_MAX_AGE_MS,
} from "../../config";

export interface ReconcileSummary {
  examined: number;
  resolved: number;
  refunded: number;
  stillPending: number;
  errors: number;
}

interface JobStatus {
  enabled: boolean;
  intervalMs: number;
  graceMs: number;
  maxAgeMs: number;
  running: boolean;
  lastRun: string | null;
  lastSummary: ReconcileSummary | null;
}

const status: JobStatus = {
  enabled: JOB_RECONCILE_ENABLED,
  intervalMs: JOB_RECONCILE_INTERVAL_MS,
  graceMs: JOB_RECONCILE_GRACE_MS,
  maxAgeMs: JOB_RECONCILE_MAX_AGE_MS,
  running: false,
  lastRun: null,
  lastSummary: null,
};

let runner: NodeJS.Timeout | null = null;

export function getReconciliationStatus(): JobStatus {
  return { ...status };
}

async function refundTransaction(id: string, userId: string, total: number, reference: string, reason: string, session?: ClientSession) {
  await creditWallet({
    userId,
    amount: total,
    type: "REFUND",
    reference: `${reference}-RCJD`,
    description: `Refund for unresolved transaction ${reference}`,
    transactionId: id,
    session,
  });
  await updateTransactionStatus(
    id,
    "REFUNDED",
    {
      description: reason,
      refundedAmount: total,
      adminNote: "Refunded by reconciliation job (provider did not confirm delivery)",
      session,
    }
  );
}

/**
 * Runs one reconciliation pass. Resolves aged PENDING/PROCESSING VTU
 * transactions against their provider. Safe to call concurrently with normal
 * request handling; a per-process guard prevents overlapping job runs.
 */
export async function reconcilePendingTransactions(): Promise<ReconcileSummary> {
  if (status.running) return { examined: 0, resolved: 0, refunded: 0, stillPending: 0, errors: 0 };
  status.running = true;
  const summary: ReconcileSummary = { examined: 0, resolved: 0, refunded: 0, stillPending: 0, errors: 0 };
  const now = Date.now();
  const cutoff = new Date(now - JOB_RECONCILE_GRACE_MS);

  try {
    const pending = await Transaction.find({
      status: { $in: ["PENDING", "PROCESSING"] },
      serviceType: { $ne: "WALLET_FUNDING" },
      updatedAt: { $lt: cutoff },
    })
      .sort({ updatedAt: 1 })
      .limit(JOB_RECONCILE_BATCH);

    for (const txn of pending) {
      summary.examined++;
      const ageMs = now - new Date(txn.updatedAt).getTime();
      const total = round2(Number(txn.amount ?? 0) + Number(txn.fee ?? 0));
      const reference = txn.reference;
      const userId = txn.userId;

      try {
        const provider = getVtuProvider(txn.providerId ?? undefined);
        const checkRef = txn.providerReference ?? reference;
        let outcome: "SUCCESSFUL" | "FAILED" | "PENDING" | "UNKNOWN";
        try {
          const res = await provider.checkStatus(checkRef);
          outcome = res.status;
        } catch {
          outcome = "UNKNOWN";
        }

        if (outcome === "SUCCESSFUL") {
          await updateTransactionStatus(txn._id.toString(), "SUCCESSFUL", {
            providerReference: checkRef,
            adminNote: "Marked SUCCESSFUL by reconciliation job",
          });
          await createNotification({
            userId,
            title: "Transaction completed",
            message: `Your ${txn.serviceType.replace(/_/g, " ").toLowerCase()} of ₦${txn.amount} is now successful. Reference: ${reference}`,
            type: "SUCCESS",
          });
          summary.resolved++;
        } else if (outcome === "FAILED" || ageMs >= JOB_RECONCILE_MAX_AGE_MS) {
          await withDbTransaction(async (session) => {
            await refundTransaction(txn._id.toString(), userId, total, reference, outcome === "FAILED" ? "Provider rejected the transaction" : "Not resolved within the max-age window", session);
          });
          await createNotification({
            userId,
            title: "Transaction refunded",
            message: `Your ${txn.serviceType.replace(/_/g, " ").toLowerCase()} could not be completed and ₦${total.toLocaleString()} was refunded. Reference: ${reference}`,
            type: "WARNING",
          });
          await createAuditLog({
            userId,
            action: "RECONCILE_REFUND",
            entityType: "Transaction",
            entityId: txn._id.toString(),
            details: { reference, total, reason: outcome === "FAILED" ? "provider_failed" : "max_age_exceeded" },
          });
          summary.refunded++;
        } else {
          summary.stillPending++;
        }
      } catch (err) {
        summary.errors++;
        logError("reconcile_txn_error", { txn: txn._id.toString(), reference, error: (err as Error).message });
      }
    }
  } finally {
    status.running = false;
    status.lastRun = new Date().toISOString();
    status.lastSummary = summary;
    logInfo("reconciliation_complete", { ...summary });
  }

  return summary;
}

/** Starts the periodic reconciliation job. Safe to call multiple times. */
export function startReconciliationJob(): void {
  if (runner || !JOB_RECONCILE_ENABLED) return;
  runner = setInterval(() => {
    void reconcilePendingTransactions();
  }, JOB_RECONCILE_INTERVAL_MS);
  if (typeof runner.unref === "function") runner.unref();
  // Run an initial pass shortly after boot.
  const first = setTimeout(() => {
    void reconcilePendingTransactions();
  }, 5000);
  if (typeof first.unref === "function") first.unref();
}

/** Stops the periodic job (used on shutdown). */
export function stopReconciliationJob(): void {
  if (runner) {
    clearInterval(runner);
    runner = null;
  }
}
