import type { APIRoute } from 'astro';
import { getSources, addSource } from '../../../data/store';
import { protectAdminRequest } from '../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request);
  if (denied) return denied;
  try {
    return jsonResponse(await getSources());
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
  const input = body as Record<string, unknown>;
  if (typeof input.name !== 'string' || typeof input.rss_endpoint !== 'string' ||
    (input.base_url !== undefined && typeof input.base_url !== 'string') ||
    (input.is_active !== undefined && typeof input.is_active !== 'boolean')) {
    return jsonError('Source name and RSS URL must be text; active status must be a boolean.', 400);
  }
  try {
    const result = await addSource(input as Parameters<typeof addSource>[0]);

    if ('error' in result) {
      return jsonError(result.error, result.status || 400);
    }

    return jsonResponse(result, 201);
  } catch (error) {
    return dataErrorResponse(error);
  }
};
