"use client";

import { useEmail, useUpdateEmail } from "@/hooks/useEmails";
import EmailDetail from "@/components/Email/EmailDetail";
import LoadingSpinner from "@/components/UI/LoadingSpinner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function EmailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { data: email, isLoading, isError } = useEmail(id);
  const update = useUpdateEmail();

  // Auto-mark as read on open
  useEffect(() => {
    if (email && !email.is_read) {
      update.mutate({ id, body: { is_read: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id]);

  return (
    <div className="space-y-4">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={15} />
        Back to Inbox
      </Link>

      {isLoading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner size={32} />
        </div>
      )}
      {isError && (
        <p className="text-sm text-red-500 text-center py-12">
          Email not found.
        </p>
      )}
      {email && <EmailDetail email={email} />}
    </div>
  );
}
