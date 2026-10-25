import type { APIRoute } from 'astro';
import { socialRepository } from '../../../data/socialRepository';
import { parseUserSession } from '../../../lib/walletAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const postId = url.searchParams.get('postId');
  if (!postId) {
    return new Response(JSON.stringify({ error: 'Post ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const session = parseUserSession(request);
    const data = await socialRepository.getPollVotes(postId, session?.address);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to load poll data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session || !session.address) {
    return new Response(JSON.stringify({ error: 'Authentication required to vote in referendum' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { postId, optionIndex } = body;

    if (!postId || optionIndex === undefined || typeof optionIndex !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid post ID or option index' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await socialRepository.recordPollVote(postId, session.address, optionIndex);
    const data = await socialRepository.getPollVotes(postId, session.address);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Poll voting failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
