"use client";

import { formatDate } from "@/lib/utils";
import type { Email } from "@/types";
import EmailAnalysisPanel from "./EmailAnalysis";
import ReplyComposer from "./ReplyComposer";
import { useAnalyzeEmail } from "@/hooks/useEmails";
import { useReplies } from "@/hooks/useReplies";
import LoadingSpinner from "@/components/UI/LoadingSpinner";
import { Paperclip, Send } from "lucide-react";

export default function EmailDetail({ email }: { email: Email }) {
  const analyze = useAnalyzeEmail();
  const { data: replies = [] } = useReplies(email.id);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main email content */}
      <div className="xl:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h1 className="text-lg font-bold text-slate-800">
            {email.subject || "(no subject)"}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span>
              <strong className="text-slate-700">From:</strong>{" "}
              {email.sender_name
                ? `${email.sender_name} <${email.sender_email}>`
                : email.sender_email}
            </span>
            <span>{formatDate(email.received_at)}</span>
          </div>
          <hr className="my-4 border-slate-100" />
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {email.body_clean || email.body_plain}
          </div>
        </div>

        {/* Reply composer — always shown */}
        <ReplyComposer
          emailId={email.id}
          emailSubject={email.subject ?? ""}
          suggestedReply={email.analysis?.suggested_reply ?? ""}
        />

        {/* Reply history */}
        {replies.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Reply history ({replies.length})
            </h3>
            {replies.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.is_draft
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {r.is_draft ? "Draft" : "Sent"}
                  </span>
                  {r.subject && (
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {r.subject}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">
                    {r.sent_at
                      ? formatDate(r.sent_at)
                      : formatDate(r.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
                  {r.body}
                </p>
                {r.attachments_json?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Paperclip size={11} />
                    {r.attachments_json.length} attachment
                    {r.attachments_json.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI analysis sidebar */}
      <div className="xl:col-span-1">
        {email.analysis ? (
          <EmailAnalysisPanel analysis={email.analysis} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500 mb-4">
              This email has not been analyzed yet.
            </p>
            <button
              onClick={() => analyze.mutate(email.id)}
              disabled={analyze.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              {analyze.isPending && <LoadingSpinner size={14} />}
              Analyze Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
