"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEmailStore } from "@/store/emailStore";
import type { Notification } from "@/types";

// Module-level guard: only one WebSocket connection app-wide
let _wsActive = false;

export function useNotifications() {
  const qc = useQueryClient();
  const { setNotifications, addNotification, markNotificationRead } =
    useEmailStore();

  // Initial fetch
  const query = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get(
        "/api/analysis/notifications?unread_only=false&limit=50"
      );
      return data;
    },
  });

  // Sync fetched data into Zustand store (replaces deprecated onSuccess)
  useEffect(() => {
    if (query.data) {
      setNotifications(query.data);
    }
  }, [query.data, setNotifications]);

  // WebSocket for live updates (singleton — guard prevents duplicates)
  useEffect(() => {
    if (_wsActive) return;
    _wsActive = true;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws") ||
      "ws://localhost:8000";
    const ws = new WebSocket(`${wsUrl}/ws/notifications`);

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        // Ignore keepalive pings
        if (data.type === "ping") return;
        // Only add if it looks like a real Notification (has id + title)
        if (data.id && data.title) {
          addNotification(data as Notification);
        }
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["emails"] });
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => ws.close();
    ws.onclose = () => {
      _wsActive = false;
    };

    return () => {
      ws.close();
      _wsActive = false;
    };
  }, [addNotification, qc]);

  const markRead = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/analysis/notifications/${id}/read`),
    onSuccess: (_data, id) => markNotificationRead(id),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/api/analysis/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { query, markRead, markAllRead };
}
