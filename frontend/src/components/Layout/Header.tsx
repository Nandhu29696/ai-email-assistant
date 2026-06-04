"use client";

import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { useEmailStore } from "@/store/emailStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  searchValue?: string;
  onSearch?: (q: string) => void;
}

export default function Header({ searchValue = "", onSearch }: HeaderProps) {
  const unreadCount = useEmailStore((s) => s.unreadCount);
  const [panelOpen, setPanelOpen] = useState(false);

  // Bootstrap notifications fetch + WebSocket on app load
  useNotifications();

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
      </div>

      {panelOpen && (
        <NotificationPanel onClose={() => setPanelOpen(false)} />
      )}
    </header>
  );
}
