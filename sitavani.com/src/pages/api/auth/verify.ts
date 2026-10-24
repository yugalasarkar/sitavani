import type { APIRoute } from 'astro';
import { 
  verifyWalletSignature, 
  generateAuthChallenge, 
  createUserSessionCookie, 
  createAdminSessionCookie, 
  isWalletAdmin 
} from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim().toLowerCase() : '';
    const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
    const nonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';

    if (!/^0x[0-9a-f]{40}$/i.test(address) || !signature.startsWith('0x') || !nonce) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authentication parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nonceValid = await socialRepository.verifyAndConsumeNonce(address, nonce);
    if (!nonceValid) {
      return new Response(JSON.stringify({ error: 'Authentication challenge expired or invalid. Please re-sign.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const expectedMessage = generateAuthChallenge(address, nonce);
    const signatureValid = await verifyWalletSignature(address, expectedMessage, signature as `0x${string}`);

    if (!signatureValid) {
      return new Response(JSON.stringify({ error: 'Cryptographic signature verification failed.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await socialRepository.ensureUser(address);
    const isAdmin = isWalletAdmin(address);

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', createUserSessionCookie(address, user.role));

    if (isAdmin) {
      headers.append('Set-Cookie', createAdminSessionCookie(address));
    }

    return new Response(JSON.stringify({
      success: true,
      address,
      user,
      isAdmin
    }), {
      status: 200,
      headers
    });
  } catch (err) {
    console.error('Auth verification error:', err);
    return new Response(JSON.stringify({ error: 'Server authentication processing failure.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
