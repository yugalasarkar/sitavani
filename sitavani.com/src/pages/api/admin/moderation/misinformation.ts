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

  const { postId, note } = body;
  if (!postId || typeof postId !== 'string') {
    return jsonError('Post ID is required', 400);
  }
  if (!note || typeof note !== 'string' || !note.trim()) {
    return jsonError('A fact-check warning note is required', 400);
  }

  try {
    await socialRepository.markMisinformation(postId, adminAddress, note.trim());
    return jsonResponse({
      success: true,
      postId,
      note: note.trim(),
      message: 'Post flagged with Asatya (Falsehood) badge'
    }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to mark post', 500);
  }
};
