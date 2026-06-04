// ─── Core domain types matching backend schemas ───────────────────────────────

export type Sentiment = "positive" | "neutral" | "negative";
export type Priority = "critical" | "high" | "medium" | "low";
export type Category =
  | "complaint"
  | "support"
  | "sales"
  | "refund"
  | "invoice"
  | "feedback"
  | "general";
export type Emotion =
  | "anger"
  | "frustration"
  | "urgency"
  | "concern"
  | "satisfaction"
  | "excitement"
  | "neutral";
export type Provider = "gmail" | "outlook" | "imap";

export interface EmotionItem {
  emotion: Emotion;
  score: number;
}

export interface EmailAnalysis {
  id: string;
  email_id: string;
  sentiment: Sentiment;
  sentiment_score: number;
  primary_emotion: Emotion;
  emotions_json: EmotionItem[];
  category: Category;
  category_confidence: number;
  priority: Priority;
  priority_score: number;
  ai_summary: string;
  suggested_reply: string;
  routed_to: string;
  routing_reason: string;
  model_version: string;
  processing_time_ms: number;
  created_at: string;
}

export interface Email {
  id: string;
  message_id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  body_plain: string;
  body_clean: string;
  received_at: string;
  processed_at: string | null;
  is_read: boolean;
  is_archived: boolean;
  thread_id: string | null;
  analysis: EmailAnalysis | null;
  created_at: string;
}

export interface EmailListOut {
  items: Email[];
  total: number;
  page: number;
  page_size: number;
}

export interface EmailUpdateRequest {
  is_read?: boolean;
  is_archived?: boolean;
}

export interface Integration {
  id: string;
  provider: Provider;
  email_address: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  email_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Lookup types (static reference data for dropdowns) ──────────────────────

export interface SentimentOption {
  id: number;
  value: string;
  label: string;
  color?: string;
  sort_order: number;
}

export interface PriorityOption {
  id: number;
  value: string;
  label: string;
  color?: string;
  score?: number;
  sort_order: number;
}

export interface CategoryOption {
  id: number;
  value: string;
  label: string;
  description?: string;
  sort_order: number;
}

// ─── Reply types ──────────────────────────────────────────────────────────────

// ─── Domain whitelist types ───────────────────────────────────────────────────

export interface AllowedDomain {
  id: number;
  domain: string;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
}

export interface EmailReply {
  id: string;
  email_id: string;
  subject: string | null;
  body: string;
  attachments_json: Array<{ filename: string; size?: number }>;
  is_draft: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface ReplyCreate {
  subject?: string;
  body: string;
  attachments?: Array<{ filename: string; size?: number }>;
  send?: boolean;
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface PriorityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CategoryBreakdown {
  complaint: number;
  support: number;
  sales: number;
  refund: number;
  invoice: number;
  feedback: number;
  general: number;
}


export interface TrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface DashboardStats {
  total_emails: number;
  unread_emails: number;
  processed_emails: number;
  critical_emails: number;
  avg_sentiment_score: number;
  sentiment: SentimentBreakdown;
  priority: PriorityBreakdown;
  category: CategoryBreakdown;
}

export interface TrendsResponse {
  trends: TrendPoint[];
  period_days: number;
}

// ─── API filter / query types ─────────────────────────────────────────────────

export interface EmailFilters {
  page?: number;
  page_size?: number;
  sentiment?: Sentiment;
  priority?: Priority;
  category?: Category;
  is_read?: boolean;
  search?: string;
}
