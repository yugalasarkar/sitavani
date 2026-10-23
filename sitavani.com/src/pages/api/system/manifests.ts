import type { APIRoute } from 'astro';
import { getManifests } from '../../../data/store';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(getManifests()), {
    headers: { 'Content-Type': 'application/json' }
  });
};
