import type { APIRoute } from 'astro';
import { toggleSource } from '../../../../../data/store';

export function getStaticPaths() {
  return [
    { params: { id: '1' } },
    { params: { id: '2' } },
    { params: { id: '3' } },
    { params: { id: '4' } },
    { params: { id: '5' } },
    { params: { id: '6' } },
  ];
}

export const PATCH: APIRoute = ({ params }) => {
  const id = Number(params.id);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid source ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = toggleSource(id);
  if (result.error) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status || 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
