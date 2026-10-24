import type { APIRoute } from 'astro';
import { parseUserSession } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');
  if (!postId) {
    return new Response(JSON.stringify({ error: 'Post ID required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = parseUserSession(request);
  const comments = await socialRepository.listComments(postId, session?.address);

  return new Response(JSON.stringify({ comments }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Connect MetaMask wallet to write a commentary (टिप्पणी).' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : undefined;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!postId || content.length < 1 || content.length > 5000) {
      return new Response(JSON.stringify({ error: 'Valid post ID and content (1-5000 characters) required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const comment = await socialRepository.addComment({
      post_id: postId,
      parent_id: parentId,
      author_address: session.address,
      content
    });

    return new Response(JSON.stringify({ success: true, comment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Error adding comment:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to record commentary.' }), {
      status: err?.message?.includes('banned') ? 403 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
