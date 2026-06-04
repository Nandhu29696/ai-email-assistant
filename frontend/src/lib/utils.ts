import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import type { Sentiment, Priority, Category } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy h:mm a");
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function getSentimentColor(sentiment: Sentiment): string {
  return {
    positive: "text-green-600 bg-green-50",
    neutral: "text-slate-500 bg-slate-100",
    negative: "text-red-600 bg-red-50",
  }[sentiment];
}

export function getPriorityColor(priority: Priority): string {
  return {
    critical: "text-red-700 bg-red-100",
    high: "text-orange-700 bg-orange-100",
    medium: "text-yellow-700 bg-yellow-100",
    low: "text-green-700 bg-green-100",
  }[priority];
}

export function getCategoryColor(category: Category): string {
  return {
    complaint: "text-red-600 bg-red-50",
    support: "text-blue-600 bg-blue-50",
    sales: "text-purple-600 bg-purple-50",
    refund: "text-orange-600 bg-orange-50",
    invoice: "text-indigo-600 bg-indigo-50",
    feedback: "text-teal-600 bg-teal-50",
    general: "text-slate-500 bg-slate-100",
  }[category];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
