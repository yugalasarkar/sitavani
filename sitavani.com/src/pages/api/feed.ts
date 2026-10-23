import type { APIRoute } from 'astro';
import { getFeed } from '../../data/store';

export const GET: APIRoute = ({ url }) => {
  const category = url.searchParams.get('category') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const limit = Number(url.searchParams.get('limit')) || 30;
  const offset = Number(url.searchParams.get('offset')) || 0;

  const data = getFeed(category, search, limit, offset);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
