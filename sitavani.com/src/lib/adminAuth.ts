import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { jsonError } from './api';
import { parseAdminSession, ADMIN_WALLET } from './walletAuth';

const COOKIE_NAME = 'sitavani_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failedLogins = new Map<string, number[]>();

function configuredSecrets() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'sitavani-sovereign-session-secret-key-32-chars-min';
  const accessKey = process.env.ADMIN_ACCESS_KEY || '';
  return { accessKey, sessionSecret };
}

function matches(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(expiry: string, secret: string) {
  return createHmac('sha256', secret).update(expiry).digest('hex');
}

function secureCookie() {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function validSameOrigin(request: Request) {
  const originHeader = request.headers.get('origin');
  const requestHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host');
  if (!originHeader || !requestHost) return false;
  try {
    const origin = new URL(originHeader);
    return (origin.protocol === 'https:' || origin.protocol === 'http:') && origin.host === requestHost;
  } catch {
    return false;
  }
}

export function createAdminSessionCookie(address: string = ADMIN_WALLET) {
  const secrets = configuredSecrets();
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  const normalized = address.toLowerCase();
  const payload = `${normalized}:ADMIN:${expiry}`;
  const sig = createHmac('sha256', secrets.sessionSecret).update(payload).digest('hex');
  const value = `${payload}:${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secureCookie()}`;
}

export function clearAdminSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureCookie()}`;
}

export function isAdminAuthenticated(request: Request): boolean {
  // 1. Primary check: Cryptographic MetaMask Wallet Session
  const walletSession = parseAdminSession(request);
  if (walletSession && walletSession.address.toLowerCase() === ADMIN_WALLET) {
    return true;
  }

  // 2. Cookie check for multi-field format
  const secrets = configuredSecrets();
  const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!cookie) return false;

  const parts = cookie.split(':');
  if (parts.length === 4) {
    const [addr, role, expiryStr, suppliedSig] = parts;
    if (addr.toLowerCase() !== ADMIN_WALLET || role !== 'ADMIN') return false;
    if (Number(expiryStr) <= Math.floor(Date.now() / 1000)) return false;
    const payload = `${addr}:${role}:${expiryStr}`;
    const expectedSig = createHmac('sha256', secrets.sessionSecret).update(payload).digest('hex');
    return matches(suppliedSig, expectedSig);
  }

  // 3. Fallback check for legacy timestamp-signature cookie
  const [expiry, suppliedSignature] = cookie.split('.');
  if (expiry && suppliedSignature && /^\d+$/.test(expiry) && Number(expiry) > Math.floor(Date.now() / 1000)) {
    return matches(suppliedSignature, signature(expiry, secrets.sessionSecret));
  }

  return false;
}

export function checkAdminAccessKey(candidate: unknown, clientAddress: string) {
  const secrets = configuredSecrets();
  if (!secrets || !secrets.accessKey) return { ok: false as const, status: 503, error: 'Legacy access is not configured.' };

  const now = Date.now();
  const failures = (failedLogins.get(clientAddress) || []).filter(timestamp => now - timestamp < FAILURE_WINDOW_MS);
  if (failures.length >= MAX_FAILURES) {
    failedLogins.set(clientAddress, failures);
    return { ok: false as const, status: 429, error: 'Too many login attempts. Try again later.' };
  }

  if (typeof candidate !== 'string' || !matches(candidate, secrets.accessKey)) {
    failures.push(now);
    failedLogins.set(clientAddress, failures);
    return { ok: false as const, status: 401, error: 'Invalid admin access credentials.' };
  }

  failedLogins.delete(clientAddress);
  return { ok: true as const };
}

export function protectAdminRequest(request: Request, mutating = false) {
  if (mutating && !validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);
  if (!isAdminAuthenticated(request)) {
    return jsonError('Authentication required. Only the sovereign administrator wallet (0xD229...329b) may access this editorial endpoint.', 401);
  }
  return undefined;
}
