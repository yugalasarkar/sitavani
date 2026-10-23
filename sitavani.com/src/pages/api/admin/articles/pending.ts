import type { APIRoute } from 'astro';
import { getPendingArticles } from '../../../../data/store';

export const GET: APIRoute = () => {
  const data = getPendingArticles();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
