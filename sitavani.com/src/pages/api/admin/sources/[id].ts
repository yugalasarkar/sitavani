import type { APIRoute } from 'astro';
import { toggleSource, deleteSource } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../../lib/api';

export const PATCH: APIRoute = async ({ request, params }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;
  const rawId = params.id || '';
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id < 1) return jsonError('Invalid source ID.', 400);

  try {
    const result = await toggleSource(id);
    if ('error' in result) return jsonError(result.error, result.status || 404);
    return jsonResponse(result);
  } catch (error) {
    return dataErrorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;
  const rawId = params.id || '';
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id < 1) return jsonError('Invalid source ID.', 400);

  try {
    const result = await deleteSource(id);
    if ('error' in result) return jsonError(result.error, result.status || 404);
    return jsonResponse(result);
  } catch (error) {
    return dataErrorResponse(error);
  }
};
