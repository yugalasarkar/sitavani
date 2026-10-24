import type { APIRoute } from 'astro';
import { parseUserSession } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) return jsonError('Authentication required', 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const { recipientAddress, targetType, targetId, amountNila, chainTxHash } = body;
  if (!recipientAddress || !targetId || !amountNila || !chainTxHash) {
    return jsonError('Missing required tip parameters', 400);
  }

  try {
    const tip = await socialRepository.recordNilaTip({
      senderAddress: session.address,
      recipientAddress,
      targetType: targetType === 'COMMENT' ? 'COMMENT' : 'POST',
      targetId,
      amountNila: Number(amountNila),
      chainTxHash
    });

    return jsonResponse({ success: true, tip }, 201);
  } catch (err: any) {
    return jsonError(err.message || 'Failed to record tip', 500);
  }
};
