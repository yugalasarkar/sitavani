import type { APIRoute } from 'astro';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { socialRepository } from '../../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const protectionError = protectAdminRequest(request, false);
  if (protectionError) return protectionError;

  try {
    const [flaggedUsers, moderationLogs] = await Promise.all([
      socialRepository.listWarnedAndBannedUsers(),
      socialRepository.listModerationLogs(100)
    ]);

    return jsonResponse({
      users: flaggedUsers,
      logs: moderationLogs
    }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to fetch moderation data', 500);
  }
};
