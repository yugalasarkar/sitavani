export type ArticleStatus = 'PENDING' | 'APPROVED' | 'DISCARDED';

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
  url_hash: string; // SHA-256 hash of original URL
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
  approved_at: string | null;
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
  total_pending: number;
  total_discarded: number;
  total_sources: number;
  active_sources: number;
  category_counts: Record<NewsCategory, number>;
  last_daemon_run: string;
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
