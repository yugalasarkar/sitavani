import type { APIRoute } from 'astro';
import { getFeed } from '../data/store';

export const GET: APIRoute = async () => {
  const feedData = getFeed(undefined, undefined, 100);
  const articles = feedData.articles || [];

  const siteUrl = 'https://sitavani.com';
  const categories = ['HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS'];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>

  ${categories.map(cat => `
  <url>
    <loc>${siteUrl}/?category=${cat}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}

  ${articles.map(art => `
  <url>
    <loc>${siteUrl}/#dispatch-${art.id}</loc>
    <lastmod>${art.approved_at ? new Date(art.approved_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <news:news>
      <news:publication>
        <news:name>SITAVANI</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${art.approved_at ? new Date(art.approved_at).toISOString() : new Date().toISOString()}</news:publication_date>
      <news:title><![CDATA[${art.title}]]></news:title>
    </news:news>
  </url>
  `).join('')}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
