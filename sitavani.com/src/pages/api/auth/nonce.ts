import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { generateAuthChallenge } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim().toLowerCase() : '';

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
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error processing nonce.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
