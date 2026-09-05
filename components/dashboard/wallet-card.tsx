import Link from "next/link";
import { ArrowUpRight, Wallet as WalletIcon, ShieldCheck, Clock } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export function WalletCard({ balance, available, pending }: { balance: number; available?: number; pending?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-royal-900 p-6 text-white shadow-lg">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-royal-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/60">
            <WalletIcon className="size-4 text-gold-400" />
            Wallet balance
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
            <ShieldCheck className="size-3" /> Secured
          </span>
        </div>
        <div className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {formatNaira(balance)}
        </div>
        {typeof available === "number" && (
          <div className="mt-1.5 text-sm text-white/60">
            Available balance: <span className="font-semibold text-white/90">{formatNaira(available)}</span>
            {typeof pending === "number" && pending > 0 && (
              <span className="ml-2">
                Pending: <span className="font-semibold text-gold-300">{formatNaira(pending)}</span>
              </span>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition hover:from-gold-300 hover:to-gold-500"
          >
            Fund wallet <ArrowUpRight className="size-4" />
          </Link>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Clock className="size-4" /> History
          </Link>
        </div>
      </div>
    </div>
  );
}