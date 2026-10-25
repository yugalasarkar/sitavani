import type { APIRoute } from 'astro';
import { socialRepository } from '../../../data/socialRepository';
import { parseUserSession } from '../../../lib/walletAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session || !session.address) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const posts = await socialRepository.listBookmarkedPosts(session.address);
    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch bookmarks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session || !session.address) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { postId } = await request.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await socialRepository.toggleBookmark(session.address, postId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Bookmark toggle failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
