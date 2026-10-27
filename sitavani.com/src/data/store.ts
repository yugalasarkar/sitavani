import type { ArticleStatus, NewsCategory, Source } from '../types';
import { EditorialInputError, newsRepository, type EditorialActionInput } from './repository';

const validCategories = new Set<NewsCategory>([
  'HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL'
]);
const validStatuses = new Set<ArticleStatus>(['PENDING', 'APPROVED', 'PUBLISHED', 'DISCARDED']);

export async function getFeed(category?: string, search?: string, limit = 30, offset = 0) {
  return newsRepository.listPublishedArticles({
    category: category && category !== 'ALL' && validCategories.has(category as NewsCategory) ? category as NewsCategory : undefined,
    search,
    limit,
    offset
  });
}

export function getPublishedArticle(id: string) {
  return newsRepository.findPublishedArticle(id);
}

export function getRelatedArticles(category: NewsCategory, currentId: string, limit = 3) {
  return newsRepository.findRelatedArticles(category, currentId, limit);
}

export function getStats() {
  return newsRepository.getStats();
}

export async function getPendingArticles() {
  const articles = await newsRepository.getPendingArticles();
  return { articles, count: articles.length };
}

export async function getAllArticles(status?: string, category?: string) {
  const normalizedStatus = status && status !== 'ALL' && validStatuses.has(status as ArticleStatus)
    ? status as ArticleStatus
    : undefined;
  const normalizedCategory = category && category !== 'ALL' && validCategories.has(category as NewsCategory)
    ? category as NewsCategory
    : undefined;
  const articles = await newsRepository.listArticles(normalizedStatus, normalizedCategory);
  return { articles, count: articles.length };
}

export type EditorialAction = EditorialActionInput['action'];

export function executeAction(data: EditorialActionInput) {
  return newsRepository.executeEditorialAction(data);
}

export async function getSources() {
  return { sources: await newsRepository.listSources() };
}

export async function addSource(data: { name: string; base_url?: string; rss_endpoint: string; is_active?: boolean }) {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const baseUrl = data.base_url?.trim() || '';
  const rssEndpoint = typeof data.rss_endpoint === 'string' ? data.rss_endpoint.trim() : '';
  if (!name || name.length > 120 || !rssEndpoint || rssEndpoint.length > 2048 || baseUrl.length > 2048) {
    return { error: 'Provide a source name (up to 120 characters) and an RSS URL (up to 2048 characters).', status: 400 as const };
  }

  try {
    const feedUrl = new URL(rssEndpoint);
    const siteUrl = baseUrl ? new URL(baseUrl) : undefined;
    if (feedUrl.protocol !== 'https:' || feedUrl.username || feedUrl.password ||
      (siteUrl && (siteUrl.protocol !== 'https:' || siteUrl.username || siteUrl.password))) {
      return { error: 'Source URLs must use HTTPS and must not include credentials.', status: 400 as const };
    }
  } catch {
    return { error: 'Provide valid absolute HTTPS source URLs.', status: 400 as const };
  }

  const source: Omit<Source, 'id' | 'created_at' | 'articles_count'> = {
    name,
    base_url: baseUrl || new URL(rssEndpoint).origin,
    rss_endpoint: rssEndpoint,
    is_active: data.is_active ?? true
  };
  const created = await newsRepository.insertSource(source);
  if (!created) return { error: 'A source with this RSS URL already exists.', status: 409 as const };
  return { success: true, source: created };
}

export async function toggleSource(id: number) {
  const source = await newsRepository.toggleSource(id);
  if (!source) return { error: 'Source not found', status: 404 as const };
  return { success: true, source };
}

export async function deleteSource(id: number) {
  const ok = await newsRepository.deleteSource(id);
  if (!ok) return { error: 'Source not found', status: 404 as const };
  return { success: true, id };
}

export async function getKeywords() {
  return { keywords: await newsRepository.listKeywords() };
}

export async function addKeyword(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    return { error: 'Keyword must be between 1 and 80 characters.', status: 400 as const };
  }
  await newsRepository.insertKeyword(value.trim().toLocaleLowerCase());
  return { keywords: await newsRepository.listKeywords() };
}

export async function getLogs() {
  return { logs: await newsRepository.listLogs() };
}

export function recordUnavailableIngestion() {
  return {
    error: 'News ingestion is not configured. No articles were fetched or added.',
    status: 503 as const
  };
}

export function isEditorialInputError(error: unknown): error is EditorialInputError {
  return error instanceof EditorialInputError;
}
