"use client";

import {
  Mail,
  MailOpen,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import StatsCard from "@/components/Dashboard/StatsCard";
import SentimentChart from "@/components/Dashboard/SentimentChart";
import PriorityChart from "@/components/Dashboard/PriorityChart";
import CategoryChart from "@/components/Dashboard/CategoryChart";
import RecentEmails from "@/components/Dashboard/RecentEmails";
import LoadingSpinner from "@/components/UI/LoadingSpinner";
import { useDashboardStats, useDashboardTrends } from "@/hooks/useDashboard";
import { useEmails } from "@/hooks/useEmails";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: trendsData, isLoading: trendsLoading } = useDashboardTrends(30);
  const { data: emailsData } = useEmails();

  if (statsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Emails"
          value={stats.total_emails}
          icon={<Mail size={20} />}
          colorClass="text-brand-600 bg-brand-50"
        />
        <StatsCard
          label="Unread"
          value={stats.unread_emails}
          icon={<MailOpen size={20} />}
          colorClass="text-orange-600 bg-orange-50"
        />
        <StatsCard
          label="Critical"
          value={stats.critical_emails}
          icon={<AlertTriangle size={20} />}
          colorClass="text-red-600 bg-red-50"
        />
        <StatsCard
          label="Avg Sentiment"
          value={stats.avg_sentiment_score.toFixed(2)}
          icon={<TrendingUp size={20} />}
          colorClass="text-green-600 bg-green-50"
          sub="−1 → +1 scale"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!trendsLoading && trendsData && (
          <SentimentChart trends={trendsData.trends} />
        )}
        <PriorityChart priority={stats.priority} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryChart category={stats.category} />
        {emailsData && emailsData.items.length > 0 && (
          <RecentEmails emails={emailsData.items.slice(0, 8)} />
        )}
      </div>
    </div>
  );
}
