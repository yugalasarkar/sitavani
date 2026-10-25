export type ArticleStatus = 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'DISCARDED';

export type NewsCategory = 
  | 'HERITAGE' 
  | 'MANDIR' 
  | 'DEFENSE' 
  | 'SCIENCE' 
  | 'SANSKRIT' 
  | 'GOVERNANCE' 
  | 'NARRATIVE_FACTS' 
  | 'GENERAL';

export type DisplayLanguage = 'en' | 'hi' | 'dual';

export interface Article {
  id: string;
  source_id: number;
  source_name: string;
  source_identifier?: string;
  url_hash: string;
  original_url: string;
  title: string;
  title_hi: string;
  summary: string;
  summary_hi: string;
  content_raw?: string;
  image_url?: string;
  category: NewsCategory;
  status: ArticleStatus;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  approved_at: string | null;
  published_at?: string | null;
  editorial_notes: string | null;
  matched_keywords?: string[];
  salience?: 'LEAD' | 'FEATURE' | 'WIRE';
}

export interface Source {
  id: number;
  name: string;
  base_url: string;
  rss_endpoint: string;
  is_active: boolean;
  created_at: string;
  last_polled_at?: string;
  articles_count?: number;
}

export interface DaemonLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'FILTER' | 'INGEST';
  message: string;
  details?: Record<string, any>;
}

export interface FeedStats {
  total_approved: number;
  total_published: number;
  total_pending: number;
  total_discarded: number;
  total_sources: number;
  active_sources: number;
  category_counts: Record<NewsCategory, number>;
  last_daemon_run: string | null;
}

export interface BharatShaktiMetric {
  id: string;
  label: string;
  label_hi: string;
  value: string;
  change: string;
  unit: string;
  trend: 'up' | 'stable';
  icon: string;
}

export interface VedicInsight {
  id: string;
  verse_sanskrit: string;
  translation_en: string;
  translation_hi: string;
  source: string;
  modern_achievement_en: string;
  modern_achievement_hi: string;
  category: string;
}

export interface StateProjectMap {
  id: string;
  state_code: string;
  state_name: string;
  state_name_hi: string;
  active_projects_count: number;
  category: NewsCategory;
  lead_project: string;
  lead_project_hi: string;
  description_en: string;
  description_hi: string;
  status_badge: string;
}

export interface FactVsMythCard {
  id: string;
  myth_en: string;
  myth_hi: string;
  fact_en: string;
  fact_hi: string;
  metric_value: string;
  metric_label: string;
  metric_label_hi: string;
  source_citation: string;
}

// Social Platform Types
export type UserRole = 'JIJNASU' | 'SADHAKA' | 'PANDITA' | 'ACHARYA' | 'ADMIN';

export interface User {
  wallet_address: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  role: UserRole;
  karma_score: number;
  is_verified_authority: boolean;
  warnings_count?: number;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  banned_by?: string | null;
  total_nila_received?: number;
  created_at: string;
}

export interface Sabha {
  slug: string;
  name_sa: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  icon: string;
  color: string;
  is_official: boolean;
  creator_address?: string;
}

export interface Post {
  id: string;
  sabha_slug: string;
  author_address: string;
  author_name?: string;
  author_role?: UserRole;
  author_is_verified?: boolean;
  author_warnings?: number;
  author_is_banned?: boolean;
  title: string;
  content: string;
  media_url?: string | null;
  media_type: 'IMAGE' | 'LINK' | 'TEXT';
  original_url?: string | null;
  is_pinned: boolean;
  is_official_dispatch: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
  comments_count: number;
  chain_tx_hash?: string | null;
  is_deleted?: boolean;
  deleted_reason?: string | null;
  is_misinformation?: boolean;
  admin_warning_note?: string | null;
  tips_total?: number;
  tips_count?: number;
  user_vote?: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id?: string | null;
  author_address: string;
  author_name?: string;
  author_role?: UserRole;
  author_is_verified?: boolean;
  author_warnings?: number;
  author_is_banned?: boolean;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  is_deleted?: boolean;
  deleted_reason?: string | null;
  user_vote?: number;
  created_at: string;
  replies?: Comment[];
}

export interface UserWarning {
  id: number;
  user_address: string;
  warned_by: string;
  reason: string;
  target_type: 'POST' | 'COMMENT' | 'DIRECT';
  target_id?: string | null;
  warning_index: number;
  created_at: string;
}

export interface ModerationLog {
  id: number;
  admin_address: string;
  action_type: string;
  target_id?: string | null;
  target_address?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface AppNotification {
  id: number;
  recipient_address: string;
  sender_address?: string | null;
  type: 'REPLY_POST' | 'REPLY_COMMENT' | 'ACCORD_MILESTONE' | 'OFFICIAL_DISPATCH' | 'WARNING_STRIKE' | 'NILA_TIP';
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NilaTip {
  id: number;
  sender_address: string;
  recipient_address: string;
  target_type: 'POST' | 'COMMENT';
  target_id: string;
  amount_nila: number;
  chain_tx_hash: string;
  created_at: string;
}

export interface SabhaReputation {
  sabha_slug: string;
  name_sa: string;
  name_en: string;
  icon: string;
  posts_count: number;
  score_sum: number;
}

export interface UserProfileData {
  user: User;
  posts_count: number;
  comments_count: number;
  sabha_reputation: SabhaReputation[];
  tips_received_total: number;
}

export interface PollSummary {
  question: string;
  options: { label: string; votes: number }[];
  totalVotes: number;
  userSelectedOption?: number;
}
