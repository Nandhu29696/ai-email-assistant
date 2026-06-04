"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ToggleLeft, ToggleRight, Globe, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import type { AllowedDomain } from "@/types";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Fetch all domains ──────────────────────────────────────
  const { data: domains = [], isLoading } = useQuery<AllowedDomain[]>({
    queryKey: ["domains"],
    queryFn: async () => {
      const { data } = await api.get("/api/domains/");
      return data;
    },
  });

  function flash(msg: string, type: "success" | "error") {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
    else                    { setError(msg);   setTimeout(() => setError(""),   4000); }
  }

  // ── Create ─────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (payload: { domain: string; notes?: string }) =>
      api.post("/api/domains/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains"] });
      setNewDomain("");
      setNewNotes("");
      flash("Domain added", "success");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      flash(msg ?? "Failed to add domain", "error");
    },
  });

  // ── Toggle active ──────────────────────────────────────────
  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/api/domains/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  // ── Delete ─────────────────────────────────────────────────
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/domains/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains"] });
      flash("Domain removed", "success");
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const raw = newDomain.trim().toLowerCase().replace(/^@/, "");
    if (!raw || !raw.includes(".")) {
      flash("Enter a valid domain (e.g. gmail.com)", "error");
      return;
    }
    create.mutate({ domain: raw, notes: newNotes.trim() || undefined });
  }

  const activeCount  = domains.filter((d) => d.is_active).length;
  const totalCount   = domains.length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage which sender domains are allowed into this mailbox.
        </p>
      </div>

      {/* ── Info banner ──────────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          When at least one domain is <strong>active</strong>, emails from domains
          not in this list are automatically rejected with an auto-reply.
          {totalCount === 0 && " Add your first domain below to enable filtering."}
          {totalCount > 0 && ` Currently allowing <strong>${activeCount}</strong> of ${totalCount} domains.`}
        </span>
      </div>

      {/* ── Feedback toasts ──────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* ── Add domain form ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Allowed Domains
          </h2>
        </div>

        <form onSubmit={handleAdd} className="px-5 py-4 flex gap-2 border-b border-slate-100">
          <input
            type="text"
            placeholder="e.g. gmail.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-40 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {create.isPending ? "Adding…" : "Add"}
          </button>
        </form>

        {/* ── Domain list ─────────────────────────────────────── */}
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : domains.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No domains added yet. All emails will be accepted.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {domains.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex-1 text-sm font-mono font-medium ${d.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  @{d.domain}
                </span>
                {d.notes && (
                  <span className="text-xs text-slate-500 truncate max-w-[140px]">{d.notes}</span>
                )}
                {/* toggle */}
                <button
                  onClick={() => toggle.mutate({ id: d.id, is_active: !d.is_active })}
                  title={d.is_active ? "Disable" : "Enable"}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {d.is_active
                    ? <ToggleRight className="w-5 h-5 text-indigo-600" />
                    : <ToggleLeft  className="w-5 h-5" />
                  }
                </button>
                {/* delete */}
                <button
                  onClick={() => {
                    if (confirm(`Remove @${d.domain}?`)) remove.mutate(d.id);
                  }}
                  title="Delete"
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

