import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-11 rounded-xl" : size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-lg";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  const text = size === "lg" ? "text-xl" : size === "sm" ? "text-base" : "text-lg";
  const badge = size === "sm" ? "text-[9px]" : "text-[10px]";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-royal-500 via-royal-700 to-navy-900 shadow-lg shadow-royal-900/30 ring-1 ring-white/20",
          box
        )}
      >
        <Zap className={cn("text-gold-400 fill-gold-400", icon)} />
      </div>
      <div className="leading-none">
        <div className={cn("font-extrabold tracking-tight text-foreground", text)}>
          ANNASHUWA
          <span className="text-gradient-royal"> VTU</span>
        </div>
        <div className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground", badge)}>
          Recharge · Pay · Bill
        </div>
      </div>
    </div>
  );
}