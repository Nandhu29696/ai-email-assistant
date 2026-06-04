import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardStats, TrendsResponse } from "@/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/dashboard/stats");
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useDashboardTrends(days = 30) {
  return useQuery<TrendsResponse>({
    queryKey: ["dashboard", "trends", days],
    queryFn: async () => {
      const { data } = await api.get("/api/dashboard/trends", {
        params: { days },
      });
      return data;
    },
    refetchInterval: 60_000,
  });
}
