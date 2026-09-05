import Link from "next/link";
import {
  Smartphone,
  Wifi,
  Lightbulb,
  Tv,
  GraduationCap,
  Wallet,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

const actions: { href: string; label: string; desc: string; icon: LucideIcon; accent: string }[] = [
  { href: "/airtime", label: "Buy Airtime", desc: "MTN, Airtel, Glo, 9mobile", icon: Smartphone, accent: "from-emerald-400 to-emerald-500" },
  { href: "/airtime-cash", label: "Airtime to Cash", desc: "Convert airtime to cash", icon: ArrowLeftRight, accent: "from-sky-500 to-cyan-600" },
  { href: "/data", label: "Buy Data", desc: "All networks & plans", icon: Wifi, accent: "from-emerald-500 to-emerald-600" },
  { href: "/electricity", label: "Electricity", desc: "IKEDC, AEDC & more", icon: Lightbulb, accent: "from-amber-500 to-orange-600" },
  { href: "/cable", label: "Cable TV", desc: "DStv, GOtv, StarTimes", icon: Tv, accent: "from-violet-500 to-purple-600" },
  { href: "/exam-pins", label: "Exam PINs", desc: "WAEC, NECO, JAMB", icon: GraduationCap, accent: "from-rose-500 to-pink-600" },
  { href: "/wallet", label: "Fund Wallet", desc: "Add money securely", icon: Wallet, accent: "from-gold-500 to-gold-600" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex flex-col items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${a.accent} text-white shadow-sm`}>
            <a.icon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{a.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{a.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}