"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: SearchBarProps) {
  return (
    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 gap-2">
      <Search size={15} className="text-slate-400 flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
      />
      {value && (
        <button onClick={() => onChange("")}>
          <X size={14} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
    </div>
  );
}
