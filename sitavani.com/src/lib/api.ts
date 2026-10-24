import { DatabaseUnavailableError } from '../data/database';

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...Object.fromEntries(new Headers(headers).entries())
    }
  });
}

export function jsonError(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

export function dataErrorResponse(error: unknown) {
  const cause = error instanceof DatabaseUnavailableError ? error.cause : undefined;
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
  console.error('Sitavani data request failed:', error instanceof Error ? error.name : 'UnknownError', code || 'no-code');
  if (error instanceof DatabaseUnavailableError) {
    return jsonError(error.message, 503);
  }
  return jsonError('The request could not be completed.', 500);
}
