import type { APIRoute } from 'astro';
import { getFeed } from '../../data/store';
import { dataErrorResponse, jsonError, jsonResponse } from '../../lib/api';

const validCategories = new Set(['HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL']);

export const GET: APIRoute = async ({ url }) => {
  const category = url.searchParams.get('category') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const rawLimit = url.searchParams.get('limit');
  const rawOffset = url.searchParams.get('offset');
  const limit = rawLimit === null ? 30 : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  if (category && category !== 'ALL' && !validCategories.has(category)) return jsonError('Unknown category.', 400);
  if (search && search.length > 200) return jsonError('Search text must be no longer than 200 characters.', 400);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return jsonError('Limit must be an integer from 1 to 100.', 400);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    return jsonError('Offset must be an integer from 0 to 1000000.', 400);
  }

  try {
    const data = await getFeed(category, search, limit, offset);
    return jsonResponse(data, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
