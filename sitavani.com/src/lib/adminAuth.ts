import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { jsonError } from './api';

const COOKIE_NAME = 'sitavani_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failedLogins = new Map<string, number[]>();

function configuredSecrets() {
  const accessKey = process.env.ADMIN_ACCESS_KEY || '';
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || '';
  if (accessKey.length < 32 || sessionSecret.length < 32) return undefined;
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

export function createAdminSessionCookie() {
  const secrets = configuredSecrets();
  if (!secrets) return undefined;
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  const value = `${expiry}.${signature(expiry, secrets.sessionSecret)}`;
  return `${COOKIE_NAME}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secureCookie()}`;
}

export function clearAdminSessionCookie() {
  return `${COOKIE_NAME}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureCookie()}`;
}

export function isAdminAuthenticated(request: Request) {
  const secrets = configuredSecrets();
  if (!secrets) return false;
  const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!cookie) return false;

  const [expiry, suppliedSignature] = cookie.split('.');
  if (!expiry || !suppliedSignature || !/^\d+$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  return matches(suppliedSignature, signature(expiry, secrets.sessionSecret));
}

export function checkAdminAccessKey(candidate: unknown, clientAddress: string) {
  const secrets = configuredSecrets();
  if (!secrets) return { ok: false as const, status: 503, error: 'Admin access is not configured on this server.' };

  const now = Date.now();
  const failures = (failedLogins.get(clientAddress) || []).filter(timestamp => now - timestamp < FAILURE_WINDOW_MS);
  if (failures.length >= MAX_FAILURES) {
    failedLogins.set(clientAddress, failures);
    return { ok: false as const, status: 429, error: 'Too many login attempts. Try again later.' };
  }

  if (typeof candidate !== 'string' || !matches(candidate, secrets.accessKey)) {
    failures.push(now);
    failedLogins.set(clientAddress, failures);
    return { ok: false as const, status: 401, error: 'Invalid admin access key.' };
  }

  failedLogins.delete(clientAddress);
  return { ok: true as const };
}

export function protectAdminRequest(request: Request, mutating = false) {
  if (!configuredSecrets()) return jsonError('Admin access is not configured on this server.', 503);
  if (mutating && !validSameOrigin(request)) return jsonError('Request origin could not be verified.', 403);
  if (!isAdminAuthenticated(request)) return jsonError('Authentication required.', 401);
  return undefined;
}
