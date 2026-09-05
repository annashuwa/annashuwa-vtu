import { Logo } from "@/components/shared/logo";
import { ShieldCheck, Zap, Wifi, Lightbulb, Tv, GraduationCap } from "lucide-react";

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-royal-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div
          className="absolute -top-32 -right-32 size-96 rounded-full bg-royal-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-0 -left-32 size-80 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Logo size="lg" className="[&_*]:text-white [&_.text-gradient-royal]:bg-none [&_.text-gradient-royal]:text-gold-400" />
        </div>
        <div className="relative space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              Recharge, pay bills and
              <br />
              <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
                stay in control.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              Airtime, data, electricity, cable TV and exam PINs — all from one secure wallet.
              Fast, reliable and available 24/7.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, label: "Instant Airtime" },
              { icon: Wifi, label: "Data Plans" },
              { icon: Lightbulb, label: "Electricity Bills" },
              { icon: Tv, label: "Cable TV" },
              { icon: GraduationCap, label: "Exam PINs" },
              { icon: ShieldCheck, label: "Bank-grade Security" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <f.icon className="size-4 text-gold-400" />
                <span className="text-xs font-medium text-white/90">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-white/40">
          © {new Date().getFullYear()} ANNASHUWA VTU · Secure payments in Nigeria
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}