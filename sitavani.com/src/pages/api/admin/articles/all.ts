import type { APIRoute } from 'astro';
import { getAllArticles } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../../lib/api';

const validStatuses = new Set(['ALL', 'PENDING', 'APPROVED', 'PUBLISHED', 'DISCARDED']);
const validCategories = new Set(['ALL', 'HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL']);

export const GET: APIRoute = async ({ request, url }) => {
  const denied = protectAdminRequest(request);
  if (denied) return denied;
  const status = url.searchParams.get('status') || undefined;
  const category = url.searchParams.get('category') || undefined;
  if (status && !validStatuses.has(status)) return jsonError('Unknown article status.', 400);
  if (category && !validCategories.has(category)) return jsonError('Unknown article category.', 400);
  try {
    return jsonResponse(await getAllArticles(status, category));
  } catch (error) {
    return dataErrorResponse(error);
  }
};
