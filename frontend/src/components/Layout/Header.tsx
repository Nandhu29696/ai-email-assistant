"use client";

import { useState } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEmailStore } from "@/store/emailStore";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  searchValue?: string;
  onSearch?: (q: string) => void;
}

export default function Header({ searchValue = "", onSearch }: HeaderProps) {
  const unreadCount = useEmailStore((s) => s.unreadCount);
  const [panelOpen, setPanelOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Bootstrap notifications fetch + WebSocket on app load
  useNotifications();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="h-14 flex items-center gap-4 px-6 bg-white border-b border-slate-200 relative">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-md bg-slate-50 rounded-lg px-3 py-1.5 gap-2">
        <Search size={16} className="text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search emails…"
          value={searchValue}
          onChange={(e) => onSearch?.(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Current user badge */}
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{user.full_name ?? user.username}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
              {user.role}
            </span>
          </div>
        )}

        {/* Notification bell */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Logout"
          title="Sign out"
        >
          <LogOut size={20} className="text-slate-600" />
        </button>
      </div>

      {panelOpen && (
        <NotificationPanel onClose={() => setPanelOpen(false)} />
      )}
    </header>
  );
}
