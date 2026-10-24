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
  bio?: string | null;
  role: UserRole;
  karma_score: number;
  is_verified_authority: boolean;
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
}

export interface Post {
  id: string;
  sabha_slug: string;
  author_address: string;
  author_name?: string;
  author_role?: UserRole;
  author_is_verified?: boolean;
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
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: number;
  created_at: string;
  replies?: Comment[];
}
