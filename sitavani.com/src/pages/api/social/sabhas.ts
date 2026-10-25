import type { APIRoute } from 'astro';
import { socialRepository } from '../../../data/socialRepository';
import { parseUserSession } from '../../../lib/walletAuth';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const sabhas = await socialRepository.listSabhas();
    return new Response(JSON.stringify({ sabhas }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to list Sabhas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session || !session.address) {
    return new Response(JSON.stringify({ error: 'Authentication required. Please connect MetaMask.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { slug, nameSa, nameEn, nameHi, descriptionEn, descriptionHi, icon, color } = body;

    if (!slug || !nameSa || !nameEn || !nameHi) {
      return new Response(JSON.stringify({ error: 'Slug and names in Sanskrit, English, and Hindi are mandatory.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sabha = await socialRepository.createSabha({
      slug,
      nameSa,
      nameEn,
      nameHi,
      descriptionEn,
      descriptionHi,
      icon,
      color,
      creatorAddress: session.address
    });

    return new Response(JSON.stringify({ success: true, sabha }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to create Sub-Sitavani Sabha.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
