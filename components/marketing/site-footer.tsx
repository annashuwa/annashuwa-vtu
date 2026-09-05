import Link from "next/link";

import { Logo } from "@/components/shared/logo";

const serviceLinks = [
  { href: "/airtime", label: "Airtime" },
  { href: "/data", label: "Data bundles" },
  { href: "/electricity", label: "Electricity" },
  { href: "/cable", label: "Cable TV" },
  { href: "/exam-pins", label: "Exam PINs" },
];

const accountLinks = [
  { href: "/register", label: "Create account" },
  { href: "/login", label: "Log in" },
  { href: "/wallet", label: "Fund wallet" },
  { href: "/transactions", label: "Transactions" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            Fast and reliable VTU & digital payments — airtime, data, electricity, cable TV and exam pins at the best rates.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Local demo build · mock payments enabled · &copy; {new Date().getFullYear()} ANNASHUWA VTU
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Services</h4>
          <ul className="space-y-2">
            {serviceLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Account</h4>
          <ul className="space-y-2">
            {accountLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Demo accounts</h4>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="font-semibold text-foreground">Admin</div>
              <div className="mt-0.5">admin@annashuwa.com</div>
              <div>Admin@1234</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="font-semibold text-foreground">User (wallet ₦25,000)</div>
              <div className="mt-0.5">user@annashuwa.com</div>
              <div>User@1234</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}