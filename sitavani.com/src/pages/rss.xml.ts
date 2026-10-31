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
    const { articles } = await getFeed(undefined, undefined, 50);
    const siteUrl = 'https://sitavani.com';
    const now = new Date().toUTCString();

    const itemsXml = articles.map((article) => {
      const link = `${siteUrl}/articles/${encodeURIComponent(article.id)}`;
      const pubDate = new Date(article.published_at || article.approved_at || article.created_at).toUTCString();
      const title = escapeXml(article.title);
      const description = escapeXml(article.summary || article.title);
      const category = escapeXml(article.category);
      const enclosure = article.image_url
        ? `<enclosure url="${escapeXml(article.image_url.startsWith('http') ? article.image_url : `${siteUrl}${article.image_url}`)}" type="image/jpeg" length="0" />`
        : '';

      return `
    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${description}</description>
      <category>${category}</category>
      <pubDate>${pubDate}</pubDate>
      <source url="${escapeXml(article.original_url)}">${escapeXml(article.source_name)}</source>
      ${enclosure}
    </item>`;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>SITAVANI | सीतावाणी — Sovereign Attributed News Wire</title>
    <link>${siteUrl}/</link>
    <description>Source-attributed reporting and civilizational intelligence across heritage, science, technology, defense, and Bhartiya traditions.</description>
    <language>en-in</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/images/junagadh_rock_sudarshana_dam_1792956730374.jpg</url>
      <title>SITAVANI News Wire</title>
      <link>${siteUrl}/</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600'
      }
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
