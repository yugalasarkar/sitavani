import type { APIRoute } from 'astro';
import { runIngestion } from '../../../../data/store';

export const POST: APIRoute = () => {
  const result = runIngestion();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
