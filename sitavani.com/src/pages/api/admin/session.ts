import type { APIRoute } from 'astro';
import { clearAdminSessionCookie, checkAdminAccessKey, createAdminSessionCookie, isAdminAuthenticated, validSameOrigin } from '../../../lib/adminAuth';
import { jsonError, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = ({ request }) => {
  if (isAdminAuthenticated(request)) return jsonResponse({ authenticated: true });
  if (!process.env.ADMIN_ACCESS_KEY || !process.env.ADMIN_SESSION_SECRET) {
    return jsonResponse({ authenticated: false, error: 'Admin access is not configured on this server.' }, 503);
  }
  return jsonResponse({ authenticated: false }, 200);
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }
  const candidate = body && typeof body === 'object' ? (body as { accessKey?: unknown }).accessKey : undefined;
  const result = checkAdminAccessKey(candidate, clientAddress || 'unknown');
  if (!result.ok) return jsonError(result.error, result.status);

  const cookie = createAdminSessionCookie();
  if (!cookie) return jsonError('Admin access is not configured on this server.', 503);
  return jsonResponse({ authenticated: true }, 200, { 'Set-Cookie': cookie });
};

export const DELETE: APIRoute = ({ request }) => {
  if (!validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);
  return jsonResponse({ authenticated: false }, 200, { 'Set-Cookie': clearAdminSessionCookie() });
};
