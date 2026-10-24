import type { APIRoute } from 'astro';
import { getKeywords, addKeyword } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request);
  if (denied) return denied;
  try {
    return jsonResponse(await getKeywords());
  } catch (error) {
    return dataErrorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Invalid request body.', 400);
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }
  try {
    const result = await addKeyword((body as { keyword?: unknown }).keyword);
    if ('error' in result) return jsonError(result.error, result.status || 400);
    return jsonResponse(result);
  } catch (error) {
    return dataErrorResponse(error);
  }
};
