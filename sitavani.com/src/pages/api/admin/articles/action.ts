import type { APIRoute } from 'astro';
import { executeAction } from '../../../../data/store';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = executeAction(body);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status || 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
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
