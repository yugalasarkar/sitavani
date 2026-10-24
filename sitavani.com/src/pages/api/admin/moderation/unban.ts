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

  const { userAddress, resetWarnings } = body;
  if (!userAddress || typeof userAddress !== 'string') {
    return jsonError('User wallet address is required', 400);
  }

  try {
    await socialRepository.unbanUser(userAddress, adminAddress, Boolean(resetWarnings));
    return jsonResponse({
      success: true,
      userAddress: userAddress.toLowerCase(),
      resetWarnings: Boolean(resetWarnings),
      message: 'Wallet unbanned successfully'
    }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to unban wallet', 500);
  }
};
