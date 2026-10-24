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

  const { userAddress, reason, targetType, targetId } = body;
  if (!userAddress || typeof userAddress !== 'string') {
    return jsonError('Target user wallet address is required', 400);
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return jsonError('A stated reason for this civilizational warning is required', 400);
  }

  // Prevent admin from warning the admin address
  if (userAddress.toLowerCase() === ADMIN_WALLET) {
    return jsonError('The sovereign administrator address cannot receive warnings', 400);
  }

  try {
    const result = await socialRepository.issueWarning({
      userAddress,
      adminAddress,
      reason: reason.trim(),
      targetType: targetType || 'POST',
      targetId
    });

    return jsonResponse({
      success: true,
      userAddress: userAddress.toLowerCase(),
      warnings_count: result.warnings_count,
      is_banned: result.is_banned,
      warning_index: result.warning_index,
      message: result.is_banned
        ? `User accumulated 8 warnings (8/8) and has been permanently banned (अष्ट-चेतावनी-उल्लङ्घनेन निष्कासितः).`
        : `Warning #${result.warnings_count} of 8 recorded for user.`
    }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to issue warning', 500);
  }
};
