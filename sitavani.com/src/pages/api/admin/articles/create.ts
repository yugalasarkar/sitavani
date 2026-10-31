import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../../lib/api';
import { getDatabasePool } from '../../../../data/database';

const validCategories = new Set(['HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL']);
const validSaliences = new Set(['LEAD', 'FEATURE', 'WIRE']);

export const POST: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;

  let body: any;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON payload.', 400);
    }
  } catch {
    return jsonError('Invalid JSON format.', 400);
  }

  const {
    title,
    title_hi = '',
    category,
    salience = 'FEATURE',
    summary,
    summary_hi = '',
    content_raw = '',
    image_url = null,
    source_name = 'SITAVANI Editorial Desk',
    original_url,
    keywords = []
  } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 300) {
    return jsonError('A title between 1 and 300 characters is required.', 400);
  }

  if (!category || !validCategories.has(category)) {
    return jsonError('A valid category is required.', 400);
  }

  if (!validSaliences.has(salience)) {
    return jsonError('Salience must be LEAD, FEATURE, or WIRE.', 400);
  }

  if (!summary || typeof summary !== 'string' || summary.trim().length === 0 || summary.length > 5000) {
    return jsonError('A summary between 1 and 5000 characters is required.', 400);
  }

  const articleId = `art-ed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const canonicalUrl = original_url && typeof original_url === 'string' && original_url.startsWith('http')
    ? original_url
    : `https://sitavani.com/articles/${articleId}`;

  const urlHash = createHash('sha256').update(canonicalUrl.trim()).digest('hex');
  const now = new Date();

  // If new article is LEAD, optionally demote previous LEADs to FEATURE
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    if (salience === 'LEAD') {
      await client.query("UPDATE articles SET salience = 'FEATURE' WHERE salience = 'LEAD'");
    }

    const keywordArray = Array.isArray(keywords)
      ? keywords.map(k => String(k).trim()).filter(Boolean)
      : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : []);

    const insertRes = await client.query(
      `INSERT INTO articles (
        id, source_id, source_name, original_url, url_hash,
        title, title_hi, summary, summary_hi, content_raw,
        image_url, category, status, salience,
        created_at, updated_at, reviewed_at, reviewed_by, approved_at, published_at,
        matched_keywords
      ) VALUES (
        $1, 1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, 'PUBLISHED', $12,
        $13, $13, $13, 'ACHARYA_PEETHAM', $13, $13,
        $14
      )
      RETURNING *`,
      [
        articleId,
        source_name.slice(0, 120),
        canonicalUrl,
        urlHash,
        title.trim().slice(0, 300),
        String(title_hi).trim().slice(0, 300),
        summary.trim().slice(0, 5000),
        String(summary_hi).trim().slice(0, 5000),
        content_raw ? String(content_raw) : summary.trim(),
        image_url ? String(image_url).trim().slice(0, 2048) : null,
        category,
        salience,
        now,
        keywordArray
      ]
    );

    return jsonResponse({
      success: true,
      article_id: articleId,
      article: insertRes.rows[0],
      url_hash: urlHash
    }, 201);
  } catch (error) {
    return dataErrorResponse(error);
  } finally {
    client.release();
  }
};
