import Link from "next/link";
import {
  Smile,
  Wifi,
  Lightbulb,
  Tv,
  GraduationCap,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
  BadgePercent,
  Headset,
  CheckCircle2,
  FlaskConical,
} from "lucide-react";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    icon: Smile,
    title: "Airtime top-up",
    desc: "Instant top-up for MTN, Airtel, Glo and 9mobile.",
    href: "/airtime",
    color: "text-emerald-600 bg-emerald-500/10",
  },
  {
    icon: Wifi,
    title: "Data bundles",
    desc: "Daily to monthly bundles at unbeatable rates.",
    href: "/data",
    color: "text-royal-600 bg-royal-500/10",
  },
  {
    icon: Lightbulb,
    title: "Electricity",
    desc: "Pay prepaid & postpaid across all nine DisCos.",
    href: "/electricity",
    color: "text-gold-600 bg-gold-500/10",
  },
  {
    icon: Tv,
    title: "Cable TV",
    desc: "DStv, GOtv and StarTimes easy renewal.",
    href: "/cable",
    color: "text-violet-600 bg-violet-500/10",
  },
  {
    icon: GraduationCap,
    title: "Exam PINs",
    desc: "WAEC, NECO, NABTEB and JAMB pins instantly.",
    href: "/exam-pins",
    color: "text-rose-600 bg-rose-500/10",
  },
  {
    icon: Wallet,
    title: "Wallet & funding",
    desc: "One wallet, instant funding via test gateway.",
    href: "/wallet",
    color: "text-cyan-600 bg-cyan-500/10",
  },
];

const steps = [
  { n: "01", title: "Create your account", desc: "Sign up in seconds with just your name, email and phone." },
  { n: "02", title: "Fund your wallet", desc: "Top up with the built-in test payment gateway." },
  { n: "03", title: "Buy any service", desc: "Airtime, data, electricity, cable or exam pins — delivered instantly." },
];

const features = [
  { icon: Zap, title: "Instant delivery", desc: "Transactions are delivered in seconds, 24/7." },
  { icon: BadgePercent, title: "Best rates", desc: "Competitive prices with transparency and no hidden fees." },
  { icon: ShieldCheck, title: "Secure wallet", desc: "JWT sessions, hashed passwords and audited wallet movements." },
  { icon: Headset, title: "24/7 support", desc: "We're here whenever you need us." },
];

const faqs = [
  { q: "How fast are transactions delivered?", a: "Airtime and data are delivered instantly after payment. Electricity tokens and exam PINs are generated and shown right away." },
  { q: "How do I fund my wallet?", a: "Go to the Wallet page, enter an amount and choose a payment method. In this local demo you can approve or decline a simulated test payment." },
  { q: "Is this a real payment platform?", a: "No — this is a full-featured local demo running on your machine with mock providers and a test payment gateway. Real gateways (Paystack, Flutterwave, Monnify) can be plugged in with API keys." },
  { q: "Can I test the admin panel?", a: "Yes. Log in with admin@annashuwa.com / Admin@1234 to manage users, wallets, transactions and services." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(16,185,129,0.18),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
            <Badge variant="muted" className="mb-5 gap-1.5">
              <FlaskConical className="size-3.5" /> Local demo — mock mode enabled
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Airtime, data, bills — all in <span className="text-gradient-royal">one place</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Recharge your phone, buy data bundles, pay electricity and cable, and get exam pins instantly with ANNASHUWA VTU.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get started free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" /> 0% platform fees on demo</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" /> Runs entirely on localhost</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" /> Admin panel included</span>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">Everything you need, instantly</h2>
            <p className="mt-2 text-muted-foreground">Buy any of these services in a few clicks.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.title} href={s.href}>
                <Card className="group h-full gap-0 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-royal-900/10">
                  <CardContent className="space-y-3 p-5">
                    <div className={`flex size-12 items-center justify-center rounded-xl ${s.color}`}>
                      <s.icon className="size-6" />
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{s.title}</h3>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">How it works</h2>
              <p className="mt-2 text-muted-foreground">Three simple steps from signup to delivery.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="relative rounded-2xl border border-border/70 bg-card p-6">
                  <div className="text-gradient-royal text-4xl font-extrabold">{s.n}</div>
                  <h3 className="mt-3 font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why us */}
        <section id="why-us" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">Why ANNASHUWA VTU</h2>
            <p className="mt-2 text-muted-foreground">Built like a production platform, scoped for a local demo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="gap-0">
                <CardContent className="space-y-2 p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">Frequently asked</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl border border-border/70 bg-card p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-gradient-to-br from-royal-700 to-navy-900 p-8 text-center sm:p-14">
            <div className="mx-auto mb-6 flex justify-center">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to top up in seconds?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/70">
              Create a free account on localhost and try every service end-to-end, including the simulated payment gateway.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="gold" asChild>
                <Link href="/register">Create account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/30 bg-white/5 text-white hover:bg-white/15">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}