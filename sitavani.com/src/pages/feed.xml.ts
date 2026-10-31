import type { APIRoute } from 'astro';
import { GET as getRss } from './rss.xml';

export const GET: APIRoute = async (context) => {
  return getRss(context);
};
