import type { APIRoute } from 'astro';
import { parseUserSession } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) return jsonError('Authentication required', 401);

  try {
    const data = await socialRepository.listNotifications(session.address);
    return jsonResponse(data, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to fetch notifications', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) return jsonError('Authentication required', 401);

  try {
    await socialRepository.markNotificationsRead(session.address);
    return jsonResponse({ success: true, message: 'Notifications marked as read' }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to update notifications', 500);
  }
};
