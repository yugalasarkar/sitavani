import type { APIRoute } from 'astro';
import { getFeed } from '../data/store';
import { dataErrorResponse } from '../lib/api';

const escapeXml = (value: string) =>
  (value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[character] as string));

export const GET: APIRoute = async () => {
  try {
    const { articles } = await getFeed(undefined, undefined, 100);
    const siteUrl = 'https://sitavani.com';

    // Google News allows dispatches published in the last 48-72 hours, or latest top dispatches
    const newsUrls = articles.map((article) => {
      const location = `${siteUrl}/articles/${encodeURIComponent(article.id)}`;
      const pubDate = new Date(article.published_at || article.approved_at || article.created_at).toISOString();
      const title = (article.title || '').replace(/[\x00-\x1F\x7F]/g, '');

      return `  <url>
    <loc>${escapeXml(location)}</loc>
    <news:news>
      <news:publication>
        <news:name>SITAVANI</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(pubDate)}</news:publication_date>
      <news:title><![CDATA[${title}]]></news:title>
    </news:news>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsUrls.join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
