"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

const schema = z.object({
  fullName: z.string().min(3, "Full name is too short"),
  phone: z.string().min(10).max(15).regex(/^\+?[\d\s-]+$/, "Enter a valid phone number"),
});

type Input = z.infer<typeof schema>;

export function ProfileForm({ user }: { user: { fullName: string; phone: string } }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user.fullName, phone: user.phone },
  });

  async function onSubmit(data: Input) {
    const res = await apiFetch("/api/user/profile", { method: "PATCH", body: JSON.stringify(data) });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Profile updated");
    location.reload();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" type="tel" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}