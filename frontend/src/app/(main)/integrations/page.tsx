"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Integration } from "@/types";
import { Zap, Trash2, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [configError, setConfigError] = useState<string | null>(null);

  // Pick up ?error= or ?connected= from OAuth redirect
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      const messages: Record<string, string> = {
        access_denied: "You denied access. Please try again and allow the requested permissions.",
        redirect_uri_mismatch:
          "Redirect URI mismatch — make sure http://localhost:8000/api/integrations/gmail/callback is listed as an Authorized redirect URI in Google Cloud Console.",
        missing_code: "OAuth flow did not return an authorization code.",
      };
      setConfigError(messages[err] ?? `OAuth error: ${err}`);
    }
  }, [searchParams]);

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await api.get("/api/integrations");
      return data;
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => api.delete(`/api/integrations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const connectGmail = async () => {
    try {
      setConfigError(null);
      const { data } = await api.get("/api/integrations/gmail/auth-url");
      window.location.href = data.auth_url;
    } catch (err: any) {
      setConfigError(
        err?.response?.data?.detail ??
          "Failed to start Gmail OAuth. Check backend configuration."
      );
    }
  };

  const connectOutlook = async () => {
    try {
      setConfigError(null);
      const { data } = await api.get("/api/integrations/outlook/auth-url");
      window.location.href = data.auth_url;
    } catch (err: any) {
      setConfigError(
        err?.response?.data?.detail ??
          "Failed to start Outlook OAuth. Check backend configuration."
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800">Email Integrations</h1>

      {/* OAuth config error banner */}
      {configError && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">OAuth not configured</p>
            <p className="mt-0.5 text-amber-700">{configError}</p>
            <p className="mt-1 text-amber-600">
              Add your credentials to <code className="bg-amber-100 px-1 rounded">backend/.env</code> and restart the server.
            </p>
          </div>
        </div>
      )}

      {/* Connect buttons */}
      <div className="flex gap-3">
        <button
          onClick={connectGmail}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
        >
          <Zap size={15} /> Connect Gmail
        </button>
        <button
          onClick={connectOutlook}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
        >
          <Zap size={15} /> Connect Outlook
        </button>
      </div>

      {/* Active integrations */}
      {!isLoading && integrations.length > 0 && (
        <ul className="space-y-3">
          {integrations.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {i.email_address}
                </p>
                <p className="text-xs text-slate-400 capitalize">{i.provider}</p>
              </div>
              <button
                onClick={() => disconnect.mutate(i.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Disconnect"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && integrations.length === 0 && (
        <p className="text-sm text-slate-400">No email accounts connected.</p>
      )}
    </div>
  );
}
