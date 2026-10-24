import type { APIRoute } from 'astro';
import { getFeed } from '../data/store';
import { dataErrorResponse } from '../lib/api';

const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[character] as string));

export const GET: APIRoute = async () => {
  try {
  const { articles } = await getFeed(undefined, undefined, 100);
  const siteUrl = 'https://sitavani.com';
  const categories = ['HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL'];
  const urls = [
    `<url><loc>${siteUrl}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    ...categories.map(category => `<url><loc>${siteUrl}/?category=${category}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`),
    ...articles.map(article => {
      const location = `${siteUrl}/articles/${encodeURIComponent(article.id)}`;
      const date = article.published_at || article.approved_at || article.created_at;
      const lastmod = escapeXml(new Date(date).toISOString());
      const title = (article.title || '').replaceAll(']]>', ']]]]><![CDATA[>');
      return `<url><loc>${escapeXml(location)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.9</priority><news:news><news:publication><news:name>SITAVANI</news:name><news:language>en</news:language></news:publication><news:publication_date>${lastmod}</news:publication_date><news:title><![CDATA[${title}]]></news:title></news:news></url>`;
    })
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls.join('')}</urlset>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
