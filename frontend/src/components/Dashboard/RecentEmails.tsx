"use client";

import Link from "next/link";
import type { Email } from "@/types";
import { timeAgo, getSentimentColor, getPriorityColor, capitalize } from "@/lib/utils";
import Badge from "@/components/UI/Badge";

export default function RecentEmails({ emails }: { emails: Email[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Recent Emails</h3>
      </div>
      <ul className="divide-y divide-slate-50">
        {emails.map((email) => (
          <li key={email.id}>
            <Link
              href={`/email/${email.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {email.subject || "(no subject)"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {email.sender_name || email.sender_email}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {email.analysis?.sentiment && (
                  <Badge colorClass={getSentimentColor(email.analysis.sentiment)}>
                    {capitalize(email.analysis.sentiment)}
                  </Badge>
                )}
                {email.analysis?.priority && (
                  <Badge colorClass={getPriorityColor(email.analysis.priority)}>
                    {capitalize(email.analysis.priority)}
                  </Badge>
                )}
                <span className="text-[11px] text-slate-400">
                  {timeAgo(email.received_at)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
