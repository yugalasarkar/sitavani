import type { APIRoute } from 'astro';
import { parseUserSession } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');
  if (!address) return jsonError('Wallet address is required', 400);

  try {
    const profile = await socialRepository.getUserProfile(address);
    if (!profile) return jsonError('User profile not found', 404);

    return jsonResponse(profile, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to fetch user profile', 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) return jsonError('Authentication required', 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  try {
    const updated = await socialRepository.updateUserProfile(session.address, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      bio: typeof body.bio === 'string' ? body.bio : undefined,
      avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
      bannerUrl: typeof body.bannerUrl === 'string' ? body.bannerUrl : undefined
    });

    return jsonResponse({ success: true, user: updated }, 200);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to update profile', 500);
  }
};
