"use client";

import type { EmailAnalysis } from "@/types";
import Badge from "@/components/UI/Badge";
import {
  getSentimentColor,
  getPriorityColor,
  getCategoryColor,
  capitalize,
} from "@/lib/utils";

export default function EmailAnalysisPanel({
  analysis,
}: {
  analysis: EmailAnalysis;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <h2 className="text-sm font-semibold text-slate-700">AI Analysis</h2>

      {/* Sentiment */}
      <Section label="Sentiment">
        <div className="flex items-center gap-2">
          <Badge colorClass={getSentimentColor(analysis.sentiment)}>
            {capitalize(analysis.sentiment)}
          </Badge>
          <span className="text-xs text-slate-400">
            score: {analysis.sentiment_score.toFixed(2)}
          </span>
        </div>
      </Section>

      {/* Emotions */}
      <Section label="Primary Emotion">
        <Badge colorClass="text-purple-700 bg-purple-50">
          {capitalize(analysis.primary_emotion)}
        </Badge>
        {analysis.emotions_json?.length > 0 && (
          <div className="mt-2 space-y-1">
            {analysis.emotions_json.slice(0, 4).map((e) => (
              <div key={e.emotion} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20">
                  {capitalize(e.emotion)}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min(e.score * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Category + Priority */}
      <Section label="Category">
        <Badge colorClass={getCategoryColor(analysis.category)}>
          {capitalize(analysis.category)}
        </Badge>
        <span className="ml-2 text-xs text-slate-400">
          {(analysis.category_confidence * 100).toFixed(0)}% confident
        </span>
      </Section>

      <Section label="Priority">
        <Badge colorClass={getPriorityColor(analysis.priority)}>
          {capitalize(analysis.priority)}
        </Badge>
      </Section>

      {/* Routing */}
      {analysis.routed_to && (
        <Section label="Routed To">
          <span className="text-sm text-slate-700">{analysis.routed_to}</span>
          {analysis.routing_reason && (
            <p className="text-xs text-slate-400 mt-0.5">
              {analysis.routing_reason}
            </p>
          )}
        </Section>
      )}

      {/* AI Summary */}
      {analysis.ai_summary && (
        <Section label="Summary">
          <p className="text-sm text-slate-700 leading-relaxed">
            {analysis.ai_summary}
          </p>
        </Section>
      )}

      <p className="text-[10px] text-slate-300 pt-1">
        Model: {analysis.model_version} · {analysis.processing_time_ms}ms
      </p>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      {children}
    </div>
  );
}
