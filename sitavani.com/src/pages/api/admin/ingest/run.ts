import type { APIRoute } from 'astro';
import { recordUnavailableIngestion } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { jsonError } from '../../../../lib/api';

export const POST: APIRoute = ({ request }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;
  const result = recordUnavailableIngestion();
  return jsonError(result.error, result.status);
};
