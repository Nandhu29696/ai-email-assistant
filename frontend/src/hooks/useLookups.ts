import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SentimentOption, PriorityOption, CategoryOption } from "@/types";

export function useSentiments() {
  return useQuery<SentimentOption[]>({
    queryKey: ["lookups", "sentiments"],
    queryFn: async () => {
      const { data } = await api.get("/api/lookups/sentiments");
      return data;
    },
    staleTime: Infinity, // static data — never refetch automatically
  });
}

export function usePriorities() {
  return useQuery<PriorityOption[]>({
    queryKey: ["lookups", "priorities"],
    queryFn: async () => {
      const { data } = await api.get("/api/lookups/priorities");
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCategories() {
  return useQuery<CategoryOption[]>({
    queryKey: ["lookups", "categories"],
    queryFn: async () => {
      const { data } = await api.get("/api/lookups/categories");
      return data;
    },
    staleTime: Infinity,
  });
}
