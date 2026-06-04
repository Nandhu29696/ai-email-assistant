import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  colorClass?: string;
}

export default function Badge({
  children,
  colorClass = "text-slate-600 bg-slate-100",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        colorClass
      )}
    >
      {children}
    </span>
  );
}
