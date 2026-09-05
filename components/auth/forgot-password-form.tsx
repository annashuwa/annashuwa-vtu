"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type LoginInput } from "@/lib/validators";
import { apiFetch } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

type ForgotInput = Pick<LoginInput, "email">;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotInput) {
    const res = await apiFetch<{ devResetLink?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setDevLink(res.data?.devResetLink ?? null);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            If an account exists for that address, a password reset link has been sent. The link
            expires in 15 minutes.
          </p>
        </div>
        {devLink && (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <div className="text-xs font-semibold text-foreground">Development reset link</div>
            <a href={devLink} className="mt-1 block break-all text-xs font-medium text-primary hover:underline">
              {devLink}
            </a>
          </div>
        )}
        <Separator />
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}