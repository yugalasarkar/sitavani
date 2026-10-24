import type { APIRoute } from 'astro';
import { parseUserSession } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Connect your MetaMask wallet to cast accord (सम्मति) or dissent (असम्मति).' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const targetType = body.targetType === 'COMMENT' ? 'COMMENT' : 'POST';
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
    const value = body.value === -1 ? -1 : 1;

    if (!targetId) {
      return new Response(JSON.stringify({ error: 'Target ID required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await socialRepository.castVote(session.address, targetType, targetId, value);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Vote failure:', err);
    return new Response(JSON.stringify({ error: 'Vote processing failure.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
