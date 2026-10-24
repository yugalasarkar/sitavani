import type { APIRoute } from 'astro';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { parseAdminSession, ADMIN_WALLET } from '../../../../lib/walletAuth';
import { socialRepository } from '../../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const protectionError = protectAdminRequest(request, true);
  if (protectionError) return protectionError;

  const adminSession = parseAdminSession(request);
  const adminAddress = adminSession?.address || ADMIN_WALLET;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const { type, id, reason } = body;
  if (!id || typeof id !== 'string') {
    return jsonError('Target item ID is required', 400);
  }
  const deleteReason = (reason && typeof reason === 'string') ? reason.trim() : 'Purged by Sovereign Editorial Authority';

  try {
    if (type === 'COMMENT') {
      await socialRepository.deleteComment(id, adminAddress, deleteReason);
    } else {
      await socialRepository.deletePost(id, adminAddress, deleteReason);
    }

    return jsonResponse({
      success: true,
      id,
      type: type || 'POST',
      message: 'Item purged from public view successfully'
    }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to delete item', 500);
  }
};
