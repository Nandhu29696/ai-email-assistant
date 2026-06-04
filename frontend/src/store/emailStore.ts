import { create } from "zustand";
import type { Notification, EmailFilters } from "@/types";

interface EmailStore {
  // Notification state
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;

  // Filter state
  filters: EmailFilters;
  setFilters: (filters: Partial<EmailFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: EmailFilters = { page: 1, page_size: 20 };

export const useEmailStore = create<EmailStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + (n.is_read ? 0 : 1),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),

  filters: DEFAULT_FILTERS,

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial, page: 1 },
    })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
