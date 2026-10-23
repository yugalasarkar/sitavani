import type { APIRoute } from 'astro';
import { getKeywords, addKeyword } from '../../../../data/store';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(getKeywords()), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { keyword } = await request.json();
    return new Response(JSON.stringify(addKeyword(keyword)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
