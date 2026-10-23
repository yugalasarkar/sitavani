import type { APIRoute } from 'astro';
import { getSources, addSource } from '../../../data/store';

export const GET: APIRoute = () => {
  const data = getSources();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = addSource(body);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status || 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
