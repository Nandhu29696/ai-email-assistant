"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useEmailStore } from "@/store/emailStore";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const notifications = useEmailStore((s) => s.notifications);
  const { markRead, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-14 right-4 z-50 w-96 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="font-semibold text-sm text-slate-800">
          Notifications
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-brand-600 hover:underline"
          >
            Mark all read
          </button>
          <button onClick={onClose}>
            <X size={16} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      </div>

      <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-400">
            No notifications
          </li>
        ) : (
          notifications.slice(0, 30).map((n) => (
            <li
              key={n.id}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                !n.is_read ? "bg-blue-50/50" : ""
              }`}
            >
              <p className="text-sm font-medium text-slate-800">{n.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {timeAgo(n.created_at)}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
