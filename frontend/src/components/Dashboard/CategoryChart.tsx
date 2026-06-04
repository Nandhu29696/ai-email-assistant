"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { CategoryBreakdown } from "@/types";

const PALETTE = [
  "#3b82f6", "#ef4444", "#8b5cf6", "#f97316",
  "#14b8a6", "#eab308", "#94a3b8",
];

export default function CategoryChart({
  category,
}: {
  category: CategoryBreakdown;
}) {
  const data = Object.entries(category)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        Category Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={PALETTE[index % PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
