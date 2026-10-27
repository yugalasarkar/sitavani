import 'dotenv/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { verifyMessage } from 'viem';

export const ADMIN_WALLET = '0xd22913b647d905d931e4dbbc36b2eecabb78329b'.toLowerCase();
export const KASTURI_CHAIN_ID = 108108;

const COOKIE_USER = 'sitavani_user_session';
const COOKIE_ADMIN = 'sitavani_admin';
const USER_SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
const ADMIN_SESSION_TTL = 8 * 60 * 60; // 8 hours

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'sitavani-secret-salt-key-minimum-32-chars-long';
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function matches(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secureFlag(): string {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function generateAuthChallenge(address: string, nonce: string): string {
  return [
    'SITAVANI Sovereign Network Authentication',
    'Sign-In with Kasturi Chain / Ethereum Wallet',
    '',
    `Address: ${address.toLowerCase()}`,
    `Chain ID: ${KASTURI_CHAIN_ID}`,
    `Nonce: ${nonce}`,
    '',
    'Notice: Signing this message verifies ownership of your wallet without gas fees or state mutation.'
  ].join("\n");
}

export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: `0x${string}`
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature
    });
    return valid;
  } catch (err) {
    console.error('Signature verification failed:', err);
    return false;
  }
}

export function createUserSessionCookie(address: string, role: string): string {
  const secret = getSecret();
  const normalized = address.toLowerCase();
  const expiry = Math.floor(Date.now() / 1000) + USER_SESSION_TTL;
  const payload = `${normalized}:${role}:${expiry}`;
  const sig = signValue(payload, secret);
  const cookieValue = `${payload}:${sig}`;
  return `${COOKIE_USER}=${cookieValue}; Path=/; Domain=.sitavani.com; HttpOnly; SameSite=Lax; Max-Age=${USER_SESSION_TTL}${secureFlag()}`;
}

export function createAdminSessionCookie(address: string): string {
  const secret = getSecret();
  const normalized = address.toLowerCase();
  const expiry = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL;
  const payload = `${normalized}:ADMIN:${expiry}`;
  const sig = signValue(payload, secret);
  const cookieValue = `${payload}:${sig}`;
  return `${COOKIE_ADMIN}=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_TTL}${secureFlag()}`;
}

export function clearUserSessionCookie(): string {
  return `${COOKIE_USER}=; Path=/; Domain=.sitavani.com; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag()}`;
}

export function clearAdminSessionCookie(): string {
  return `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag()}`;
}

export function parseUserSession(request: Request): { address: string; role: string } | null {
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE_USER}=`));
  if (!match) return null;

  const raw = match.slice(COOKIE_USER.length + 1);
  const parts = raw.split(':');
  if (parts.length !== 4) return null;

  const [address, role, expiryStr, sig] = parts;
  const expiry = Number(expiryStr);
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) return null;

  const payload = `${address}:${role}:${expiryStr}`;
  const expectedSig = signValue(payload, getSecret());
  if (!matches(sig, expectedSig)) return null;

  return { address: address.toLowerCase(), role };
}

export function parseAdminSession(request: Request): { address: string } | null {
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE_ADMIN}=`));
  if (!match) return null;

  const raw = match.slice(COOKIE_ADMIN.length + 1);
  const parts = raw.split(':');
  if (parts.length !== 4) return null;

  const [address, role, expiryStr, sig] = parts;
  if (role !== 'ADMIN') return null;
  if (address.toLowerCase() !== ADMIN_WALLET) return null;

  const expiry = Number(expiryStr);
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) return null;

  const payload = `${address}:${role}:${expiryStr}`;
  const expectedSig = signValue(payload, getSecret());
  if (!matches(sig, expectedSig)) return null;

  return { address: address.toLowerCase() };
}

export function isWalletAdmin(address?: string | null): boolean {
  if (!address) return false;
  return address.toLowerCase() === ADMIN_WALLET;
}
