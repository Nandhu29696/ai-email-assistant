"use client";

import { useState } from "react";
import { useEmails } from "@/hooks/useEmails";
import { useSentiments, usePriorities, useCategories } from "@/hooks/useLookups";
import { useEmailStore } from "@/store/emailStore";
import EmailCard from "./EmailCard";
import EmailPreviewModal from "./EmailPreviewModal";
import SearchBar from "@/components/UI/SearchBar";
import LoadingSpinner from "@/components/UI/LoadingSpinner";
import type { Sentiment, Priority, Category } from "@/types";

export default function EmailList() {
  const { filters, setFilters, resetFilters } = useEmailStore();
  const [search, setSearch] = useState(filters.search ?? "");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { data, isLoading, isError } = useEmails();

  const { data: sentiments = [] } = useSentiments();
  const { data: priorities = [] } = usePriorities();
  const { data: categories = [] } = useCategories();

  const handleSearch = (v: string) => {
    setSearch(v);
    setFilters({ search: v || undefined });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search emails…"
          />
        </div>

        <select
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          value={filters.sentiment ?? ""}
          onChange={(e) =>
            setFilters({ sentiment: (e.target.value as Sentiment) || undefined })
          }
        >
          <option value="">All Sentiments</option>
          {sentiments.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          value={filters.priority ?? ""}
          onChange={(e) =>
            setFilters({ priority: (e.target.value as Priority) || undefined })
          }
        >
          <option value="">All Priorities</option>
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          value={filters.category ?? ""}
          onChange={(e) =>
            setFilters({ category: (e.target.value as Category) || undefined })
          }
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Reset
        </button>
      </div>

      {/* List */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      )}
      {isError && (
        <p className="text-sm text-red-500 text-center py-8">
          Failed to load emails.
        </p>
      )}
      {data && (
        <>
          <p className="text-xs text-slate-400">
            {data.total} email{data.total !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {data.items.map((email) => (
              <li key={email.id}>
                <EmailCard
                  email={email}
                  onOpen={() => setSelectedEmailId(email.id)}
                />
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="flex items-center gap-2 pt-2">
            <button
              disabled={(filters.page ?? 1) <= 1}
              onClick={() =>
                setFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })
              }
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {filters.page ?? 1} of{" "}
              {Math.max(1, Math.ceil(data.total / (filters.page_size ?? 20)))}
            </span>
            <button
              disabled={
                (filters.page ?? 1) >=
                Math.ceil(data.total / (filters.page_size ?? 20))
              }
              onClick={() =>
                setFilters({ page: (filters.page ?? 1) + 1 })
              }
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
      {selectedEmailId && (
        <EmailPreviewModal
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
        />
      )}
    </div>
  );
}
