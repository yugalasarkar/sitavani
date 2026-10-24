import type { APIRoute } from 'astro';
import { getPendingArticles } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonResponse } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request);
  if (denied) return denied;
  try {
    return jsonResponse(await getPendingArticles());
  } catch (error) {
    return dataErrorResponse(error);
  }
};
