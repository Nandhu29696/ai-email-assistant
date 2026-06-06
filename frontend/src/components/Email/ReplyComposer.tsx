"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Paperclip, Sparkles, X } from "lucide-react";
import { useCreateReply } from "@/hooks/useReplies";

interface ReplyComposerProps {
  emailId: string | number;
  emailSubject: string;
  suggestedReply?: string;
}

interface AttachedFile {
  filename: string;
  size: number;
  /** local object URL for preview (not sent to server) */
  objectUrl?: string;
}

export default function ReplyComposer({
  emailId,
  emailSubject,
  suggestedReply = "",
}: ReplyComposerProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`Re: ${emailSubject}`);
  const [body, setBody] = useState(suggestedReply);
  const [isEditing, setIsEditing] = useState(!suggestedReply);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [done, setDone] = useState<"sent" | "draft" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useCreateReply(emailId);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: AttachedFile[] = Array.from(files).map((f) => ({
      filename: f.name,
      size: f.size,
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (send: boolean) => {
    mutate(
      {
        subject,
        body,
        attachments: attachments.map(({ filename, size }) => ({ filename, size })),
        send,
      },
      {
        onSuccess: () => setDone(send ? "sent" : "draft"),
      },
    );
  };

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
        {done === "sent" ? "Reply sent successfully." : "Draft saved."}
        <button
          className="ml-4 underline text-green-600 hover:text-green-800"
          onClick={() => {
            setDone(null);
            setBody(suggestedReply);
            setAttachments([]);
            setIsEditing(!suggestedReply);
          }}
        >
          Write another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Collapsed header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Reply</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
          {/* Subject */}
          <div className="pt-3">
            <label className="block text-xs text-slate-500 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500">Body</label>
              {suggestedReply && (
                <button
                  onClick={() => {
                    setBody(suggestedReply);
                    setIsEditing(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Sparkles size={12} />
                  Use AI draft
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                placeholder="Type your reply…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 resize-none"
              />
            ) : (
              <div className="relative">
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[120px] font-sans text-slate-700">
                  {body}
                </pre>
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-2 right-2 text-xs text-brand-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
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
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Paperclip size={13} />
              Attach files
            </button>

            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1"
                  >
                    <Paperclip size={11} className="shrink-0" />
                    <span className="flex-1 truncate">{f.filename}</span>
                    <span className="text-slate-400">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isPending || !body.trim()}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={isPending || !body.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
