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
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const rss_endpoint = typeof input.rss_endpoint === 'string' ? input.rss_endpoint.trim() : (typeof input.rss === 'string' ? input.rss.trim() : '');
  const base_url = typeof input.base_url === 'string' ? input.base_url.trim() : (typeof input.url === 'string' ? input.url.trim() : '');
  const is_active = typeof input.is_active === 'boolean' ? input.is_active : true;

  if (!name || !rss_endpoint) {
    return jsonError('Source name and RSS / Atom URL are required.', 400);
  }

  try {
    const result = await addSource({
      name,
      base_url,
      rss_endpoint,
      is_active
    });

    if ('error' in result) {
      return jsonError(result.error, result.status || 400);
    }

    return jsonResponse(result, 201);
  } catch (error) {
    return dataErrorResponse(error);
  }
};
