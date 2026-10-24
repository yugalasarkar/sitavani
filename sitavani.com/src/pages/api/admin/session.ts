import type { APIRoute } from 'astro';
import { clearAdminSessionCookie, checkAdminAccessKey, createAdminSessionCookie, isAdminAuthenticated, validSameOrigin } from '../../../lib/adminAuth';
import { ADMIN_WALLET, generateAuthChallenge, verifyWalletSignature } from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';
import { jsonError, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = ({ request }) => {
  if (isAdminAuthenticated(request)) {
    return jsonResponse({ authenticated: true, address: ADMIN_WALLET });
  }
  return jsonResponse({ authenticated: false, adminWallet: ADMIN_WALLET }, 200);
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }

  // 1. Primary path: MetaMask Cryptographic Signature Auth
  if (body && typeof body.address === 'string' && typeof body.signature === 'string' && typeof body.nonce === 'string') {
    const address = body.address.toLowerCase();

    // Enforce strict designated admin address
    if (address !== ADMIN_WALLET) {
      return jsonError(`Access denied. Wallet ${address} is not the sovereign administrator (0xD229...329b).`, 403);
    }

    // Verify nonce
    const nonceValid = await socialRepository.verifyAndConsumeNonce(address, body.nonce);
    if (!nonceValid) {
      return jsonError('Authentication challenge expired or invalid. Please sign again.', 400);
    }

    // Reconstruct challenge message
    const message = generateAuthChallenge(address, body.nonce);

    // Cryptographically verify signature
    const signatureValid = await verifyWalletSignature(address, message, body.signature);
    if (!signatureValid) {
      return jsonError('Cryptographic signature verification failed.', 401);
    }

    // Ensure admin user profile exists with full authority
    await socialRepository.ensureUser(address);

    const cookie = createAdminSessionCookie(address);
    return jsonResponse({ authenticated: true, address, role: 'ADMIN' }, 200, { 'Set-Cookie': cookie });
  }

  // 2. Fallback path: Legacy access key
  const candidate = body && typeof body === 'object' ? (body as { accessKey?: unknown }).accessKey : undefined;
  if (candidate) {
    const result = checkAdminAccessKey(candidate, clientAddress || 'unknown');
    if (!result.ok) return jsonError(result.error, result.status);

    const cookie = createAdminSessionCookie(ADMIN_WALLET);
    return jsonResponse({ authenticated: true, address: ADMIN_WALLET }, 200, { 'Set-Cookie': cookie });
  }

  return jsonError('Invalid authentication credentials provided.', 400);
};

export const DELETE: APIRoute = ({ request }) => {
  if (!validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);
  return jsonResponse({ authenticated: false }, 200, { 'Set-Cookie': clearAdminSessionCookie() });
};
