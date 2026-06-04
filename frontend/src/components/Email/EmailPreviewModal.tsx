"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEmail, useUpdateEmail } from "@/hooks/useEmails";
import { useCreateReply, useReplies } from "@/hooks/useReplies";
import LoadingSpinner from "@/components/UI/LoadingSpinner";
import { formatDate, timeAgo } from "@/lib/utils";

interface EmailPreviewModalProps {
  emailId: string;
  onClose: () => void;
}

type Tab = "reply" | "email";

interface AttachedFile {
  filename: string;
  size: number;
}

export default function EmailPreviewModal({
  emailId,
  onClose,
}: EmailPreviewModalProps) {
  const { data: email, isLoading } = useEmail(emailId);
  const update = useUpdateEmail();
  const { data: replies = [] } = useReplies(emailId);
  const { mutate: createReply, isPending } = useCreateReply(emailId);

  const [activeTab, setActiveTab] = useState<Tab>("reply");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [done, setDone] = useState<"sent" | "draft" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark as read on open
  useEffect(() => {
    if (email && !email.is_read) {
      update.mutate({ id: emailId, body: { is_read: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id]);

  // Pre-fill reply fields when email/analysis loads
  useEffect(() => {
    if (email) {
      setSubject(`Re: ${email.subject ?? ""}`);
      if (email.analysis?.suggested_reply) {
        setBody(email.analysis.suggested_reply);
      }
    }
  }, [email?.id, email?.analysis?.suggested_reply]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ filename: f.name, size: f.size })),
    ]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (send: boolean) => {
    createReply(
      { subject, body, attachments, send },
      { onSuccess: () => setDone(send ? "sent" : "draft") },
    );
  };

  const aiDraft = email?.analysis?.suggested_reply ?? "";
  const isAiDraft = !!aiDraft && body === aiDraft;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative ml-auto h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-white">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="h-5 w-56 bg-slate-100 rounded animate-pulse" />
            ) : (
              <h2 className="text-base font-semibold text-slate-800 truncate leading-snug">
                {email?.subject || "(no subject)"}
              </h2>
            )}
            {email && (
              <p className="text-xs text-slate-400 mt-1 truncate">
                From:{" "}
                {email.sender_name
                  ? `${email.sender_name} <${email.sender_email}>`
                  : email.sender_email}
                {" · "}
                {timeAgo(email.received_at)} ({formatDate(email.received_at)})
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {email && (
              <Link
                href={`/email/${emailId}`}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <ExternalLink size={12} />
                Full view
              </Link>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          {(["reply", "email"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "reply" ? "Reply" : "Email"}
              {tab === "reply" && replies.length > 0 && (
                <span className="ml-1.5 text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                  {replies.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner size={28} />
            </div>
          ) : activeTab === "email" ? (
            /* ── Email body tab ── */
            <div className="p-6">
              {email?.body_clean || email?.body_plain ? (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {email.body_clean || email.body_plain}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No body content.
                </p>
              )}
            </div>
          ) : (
            /* ── Reply tab ── */
            <div className="p-6 space-y-4">
              {done ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
                  {done === "sent"
                    ? "Reply sent successfully."
                    : "Draft saved."}
                  <button
                    className="ml-4 underline text-green-600 hover:text-green-800"
                    onClick={() => {
                      setDone(null);
                      setBody(aiDraft);
                      setAttachments([]);
                    }}
                  >
                    Write another
                  </button>
                </div>
              ) : (
                <>
                  {/* AI draft banner */}
                  {aiDraft && isAiDraft && (
                    <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-700">
                      <Sparkles size={13} className="shrink-0" />
                      AI-generated draft — edit freely below
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 transition"
                    />
                  </div>

                  {/* Message body — always in edit mode */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-500">
                        Message
                      </label>
                      {aiDraft && !isAiDraft && (
                        <button
                          onClick={() => setBody(aiDraft)}
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                        >
                          <Sparkles size={11} />
                          Restore AI draft
                        </button>
                      )}
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      placeholder={
                        isLoading
                          ? "Loading AI draft…"
                          : "Type your reply…"
                      }
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-200 resize-none transition"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-4 py-2 transition-colors"
                    >
                      <Paperclip size={13} />
                      Add attachments
                    </button>

                    {attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {attachments.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded px-2.5 py-1.5"
                          >
                            <Paperclip
                              size={11}
                              className="shrink-0 text-slate-400"
                            />
                            <span className="flex-1 truncate">{f.filename}</span>
                            <span className="text-slate-400">
                              {(f.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              onClick={() => removeAttachment(i)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              aria-label="Remove"
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer — sticky send controls ── */}
        {activeTab === "reply" && !done && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-400 truncate">
              To: {email?.sender_email ?? "—"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isPending || !body.trim()}
                className="px-4 py-2 text-sm border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={isPending || !body.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
                {isPending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
