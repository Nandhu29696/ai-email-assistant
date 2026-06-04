import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  colorClass?: string;
  sub?: string;
}

export default function StatsCard({
  label,
  value,
  icon,
  colorClass = "text-brand-600 bg-brand-50",
  sub,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl", colorClass)}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
