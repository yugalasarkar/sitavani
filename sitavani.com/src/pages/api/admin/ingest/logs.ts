import type { APIRoute } from 'astro';
import { getLogs } from '../../../../data/store';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(getLogs()), {
    headers: { 'Content-Type': 'application/json' }
  });
};
