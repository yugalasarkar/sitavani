import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { generateAuthChallenge } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

async function handleNonce(rawAddress: string) {
  const address = (rawAddress || '').trim().toLowerCase();

  if (!/^0x[0-9a-f]{40}$/i.test(address)) {
    return new Response(JSON.stringify({ error: 'Valid Ethereum/Kasturi hex address required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const nonce = randomBytes(16).toString('hex');
  await socialRepository.saveNonce(address, nonce);

  const message = generateAuthChallenge(address, nonce);

  return new Response(JSON.stringify({ nonce, message }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address') || '';
    return await handleNonce(address);
  } catch (err) {
    console.error('Nonce GET handler error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error processing nonce.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    let address = '';
    try {
      const body = await request.json();
      address = typeof body?.address === 'string' ? body.address : '';
    } catch {
      const url = new URL(request.url);
      address = url.searchParams.get('address') || '';
    }
    return await handleNonce(address);
  } catch (err) {
    console.error('Nonce POST handler error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error processing nonce.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
