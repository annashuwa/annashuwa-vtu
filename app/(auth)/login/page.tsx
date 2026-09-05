import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { DEMO_CREDENTIALS } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your ANNASHUWA VTU account.">
      <div className="space-y-4">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">Demo accounts</div>
            <div className="mt-1 space-y-0.5">
              <div>Admin — {DEMO_CREDENTIALS.admin.email} / {DEMO_CREDENTIALS.admin.password}</div>
              <div>User — {DEMO_CREDENTIALS.user.email} / {DEMO_CREDENTIALS.user.password}</div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}