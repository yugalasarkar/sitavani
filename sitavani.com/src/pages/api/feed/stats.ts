import type { APIRoute } from 'astro';
import { getStats } from '../../../data/store';
import { dataErrorResponse, jsonResponse } from '../../../lib/api';

export const GET: APIRoute = async () => {
  try {
    return jsonResponse(await getStats(), 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
