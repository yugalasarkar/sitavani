import type { APIRoute } from 'astro';
import { parseUserSession, isWalletAdmin } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const sabha = url.searchParams.get('sabha') || undefined;
  const sort = (url.searchParams.get('sort') || 'hot') as 'hot' | 'new' | 'top';
  const search = url.searchParams.get('search') || undefined;
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

  const session = parseUserSession(request);
  const data = await socialRepository.listPosts({
    sabha,
    sort,
    search,
    limit,
    offset,
    viewerAddress: session?.address
  });

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Authentication required. Connect MetaMask wallet.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const sabha_slug = typeof body.sabha_slug === 'string' ? body.sabha_slug.trim().toLowerCase() : 'varta';
    const media_url = typeof body.media_url === 'string' ? body.media_url.trim() : undefined;
    const media_type = (['IMAGE', 'LINK', 'TEXT'].includes(body.media_type) ? body.media_type : (media_url ? 'IMAGE' : 'TEXT')) as 'IMAGE' | 'LINK' | 'TEXT';
    const original_url = typeof body.original_url === 'string' ? body.original_url.trim() : undefined;

    if (title.length < 3 || title.length > 300) {
      return new Response(JSON.stringify({ error: 'Title must be between 3 and 300 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = isWalletAdmin(session.address);
    const is_pinned = isAdmin && Boolean(body.is_pinned);
    const is_official_dispatch = isAdmin;

    const post = await socialRepository.createPost({
      title,
      content,
      sabha_slug,
      author_address: session.address,
      media_url,
      media_type,
      original_url,
      is_pinned,
      is_official_dispatch
    });

    return new Response(JSON.stringify({ success: true, post }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating post:', err);
    return new Response(JSON.stringify({ error: 'Failed to record post.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
