import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join ANNASHUWA VTU and start recharging in minutes."
    >
      <RegisterForm />
    </AuthLayout>
  );
}