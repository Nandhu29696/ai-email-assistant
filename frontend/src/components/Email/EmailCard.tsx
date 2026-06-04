"use client";

import type { Email } from "@/types";
import {
  getSentimentColor,
  getPriorityColor,
  getCategoryColor,
  timeAgo,
  capitalize,
} from "@/lib/utils";
import Badge from "@/components/UI/Badge";
import { useUpdateEmail } from "@/hooks/useEmails";

interface EmailCardProps {
  email: Email;
  onOpen: () => void;
}

export default function EmailCard({ email, onOpen }: EmailCardProps) {
  const update = useUpdateEmail();

  const handleClick = () => {
    if (!email.is_read) {
      update.mutate({ id: email.id, body: { is_read: true } });
    }
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`block bg-white border rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-all ${
        !email.is_read ? "border-brand-300 bg-brand-50/20" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div
          className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
            !email.is_read ? "bg-brand-500" : "bg-transparent"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {email.subject || "(no subject)"}
            </p>
            <span className="text-[11px] text-slate-400 flex-shrink-0">
              {timeAgo(email.received_at)}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {email.sender_name || email.sender_email}
          </p>
          {email.analysis && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge colorClass={getSentimentColor(email.analysis.sentiment)}>
                {capitalize(email.analysis.sentiment)}
              </Badge>
              <Badge colorClass={getPriorityColor(email.analysis.priority)}>
                {capitalize(email.analysis.priority)}
              </Badge>
              <Badge colorClass={getCategoryColor(email.analysis.category)}>
                {capitalize(email.analysis.category)}
              </Badge>
              {email.analysis.routed_to && (
                <span className="text-[11px] text-slate-400">
                  → {email.analysis.routed_to}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
