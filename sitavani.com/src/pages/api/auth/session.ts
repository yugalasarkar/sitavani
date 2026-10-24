import type { APIRoute } from 'astro';
import { 
  parseUserSession, 
  parseAdminSession, 
  clearUserSessionCookie, 
  clearAdminSessionCookie,
  isWalletAdmin
} from '../../../lib/walletAuth';
import { socialRepository } from '../../../data/socialRepository';

export const GET: APIRoute = async ({ request }) => {
  const userSession = parseUserSession(request);
  const adminSession = parseAdminSession(request);

  if (!userSession && !adminSession) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const address = userSession?.address || adminSession?.address;
  const user = address ? await socialRepository.getUser(address) : null;

  return new Response(JSON.stringify({
    authenticated: true,
    address,
    user,
    isAdmin: isWalletAdmin(address)
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', clearUserSessionCookie());
  headers.append('Set-Cookie', clearAdminSessionCookie());

  return new Response(JSON.stringify({ authenticated: false }), {
    status: 200,
    headers
  });
};
