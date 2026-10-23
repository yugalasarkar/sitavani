import type { APIRoute } from 'astro';
import { getAllArticles } from '../../../../data/store';

export const GET: APIRoute = ({ url }) => {
  const status = url.searchParams.get('status') || undefined;
  const category = url.searchParams.get('category') || undefined;

  const data = getAllArticles(status, category);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
