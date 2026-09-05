import { Transaction, User } from "../models";
import { moneyToString } from "../lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-NG", { weekday: "short" });
}

export async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalTransactions,
    successfulCount,
    failedCount,
    pendingCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "ACTIVE" }),
    User.countDocuments({ status: "SUSPENDED" }),
    Transaction.countDocuments(),
    Transaction.countDocuments({ status: "SUCCESSFUL" }),
    Transaction.countDocuments({ status: "FAILED" }),
    Transaction.countDocuments({ status: { $in: ["PENDING", "PROCESSING"] } }),
  ]);

  const [revenueAgg, serviceAgg, volumeAgg, recentUsers, recentTxnAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: "SUCCESSFUL" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { status: "SUCCESSFUL" } },
      { $group: { _id: "$serviceType", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Transaction.aggregate([
      {
        $match: { createdAt: { $gte: new Date(Date.now() - 6 * DAY_MS) } },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            bucket: {
              $cond: [
                { $eq: ["$status", "SUCCESSFUL"] },
                "successful",
                { $cond: [{ $in: ["$status", ["PENDING", "PROCESSING"]] }, "pending", "failed"] },
              ],
            },
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    User.find().sort({ createdAt: -1 }).limit(5).select("fullName email role status createdAt"),
    Transaction.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const totalRevenue = Number(revenueAgg[0]?.total ?? 0).toFixed(2);
  const volumeByService = serviceAgg.map((g) => ({
    serviceType: g._id as string,
    total: moneyToString(g.total) ?? "0",
    count: Number(g.count),
  }));

  const volumeMap = new Map<
    string,
    { successful: number; failed: number; pending: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS);
    volumeMap.set(date.toISOString().slice(0, 10), { successful: 0, failed: 0, pending: 0 });
  }
  for (const row of volumeAgg) {
    const key = (row._id as { date: string; bucket: string }).date;
    const bucket = (row._id as { date: string; bucket: string }).bucket as
      | "successful"
      | "failed"
      | "pending";
    const entry = volumeMap.get(key);
    if (entry) entry[bucket] = Number(row.total ?? 0);
  }
  const volumeByDay = [...volumeMap.entries()].map(([date, v]) => ({
    day: dayLabel(new Date(`${date}T12:00:00`)),
    successful: Number(v.successful).toFixed(2),
    failed: Number(v.failed).toFixed(2),
    pending: Number(v.pending).toFixed(2),
  }));

  const recentTransactions = recentTxnAgg.map((t) => ({
    id: t._id,
    reference: t.reference,
    serviceType: t.serviceType,
    provider: t.provider,
    amount: moneyToString(t.amount) ?? "0",
    status: t.status,
    user: t.u?.fullName ?? "Deleted user",
    createdAt: new Date(t.createdAt).toISOString(),
  }));

  const recentUsersList = recentUsers.map((u) => ({
    id: u._id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: new Date(u.createdAt).toISOString(),
  }));

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalTransactions,
    successfulTransactions: successfulCount,
    failedTransactions: failedCount,
    pendingTransactions: pendingCount,
    totalRevenue,
    volumeByDay,
    volumeByService,
    recentUsers: recentUsersList,
    recentTransactions,
  };
}