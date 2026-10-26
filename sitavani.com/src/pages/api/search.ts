import type { APIRoute } from 'astro';
import { getDatabasePool } from '../../data/database';
import { jsonResponse, jsonError } from '../../lib/api';

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') || '').trim();
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 100);

  if (!query) {
    return jsonResponse({
      query: '',
      type,
      results: {
        posts: [],
        articles: [],
        sabhas: [],
        users: []
      },
      counts: {
        posts: 0,
        articles: 0,
        sabhas: 0,
        users: 0,
        total: 0
      }
    });
  }

  const pool = getDatabasePool();
  const pattern = `%${query}%`;

  try {
    let posts: any[] = [];
    let articles: any[] = [];
    let sabhas: any[] = [];
    let users: any[] = [];

    if (type === 'all' || type === 'posts') {
      const postsRes = await pool.query(
        `SELECT p.id, p.title, p.content, p.sabha_slug as sabha, p.author_address, p.score as karma_score,
                p.comments_count, p.created_at, p.chain_tx_hash, p.is_misinformation, p.admin_warning_note,
                u.display_name as author_name, u.role as author_role
         FROM posts p
         LEFT JOIN users u ON p.author_address = u.wallet_address
         WHERE (p.is_deleted IS FALSE OR p.is_deleted IS NULL)
           AND (p.title ILIKE $1 OR p.content ILIKE $1)
         ORDER BY p.score DESC, p.created_at DESC
         LIMIT $2`,
        [pattern, limit]
      );
      posts = postsRes.rows;
    }

    if (type === 'all' || type === 'articles') {
      const articlesRes = await pool.query(
        `SELECT id, title, title_hi, summary, summary_hi, category, status, published_at, source_name, original_url, image_url
         FROM articles
         WHERE status = 'PUBLISHED'
           AND (title ILIKE $1 OR title_hi ILIKE $1 OR summary ILIKE $1 OR summary_hi ILIKE $1 OR category ILIKE $1)
         ORDER BY published_at DESC
         LIMIT $2`,
        [pattern, limit]
      );
      articles = articlesRes.rows;
    }

    if (type === 'all' || type === 'sabhas') {
      const sabhasRes = await pool.query(
        `SELECT s.slug, s.name_sa, s.name_en, s.description_en as description, s.icon as icon_name, s.color as accent_color,
                COUNT(p.id)::int as posts_count
         FROM sabhas s
         LEFT JOIN posts p ON s.slug = p.sabha_slug AND (p.is_deleted IS FALSE OR p.is_deleted IS NULL)
         WHERE (s.slug ILIKE $1 OR s.name_sa ILIKE $1 OR s.name_en ILIKE $1 OR s.description_en ILIKE $1)
         GROUP BY s.slug, s.name_sa, s.name_en, s.description_en, s.icon, s.color
         ORDER BY posts_count DESC
         LIMIT $2`,
        [pattern, limit]
      );
      sabhas = sabhasRes.rows;
    }

    if (type === 'all' || type === 'users') {
      const usersRes = await pool.query(
        `SELECT wallet_address, display_name, bio, role, karma_score, total_nila_received, is_verified_authority
         FROM users
         WHERE (display_name ILIKE $1 OR wallet_address ILIKE $1 OR bio ILIKE $1)
         ORDER BY karma_score DESC
         LIMIT $2`,
        [pattern, limit]
      );
      users = usersRes.rows;
    }

    const counts = {
      posts: posts.length,
      articles: articles.length,
      sabhas: sabhas.length,
      users: users.length,
      total: posts.length + articles.length + sabhas.length + users.length
    };

    return jsonResponse({
      query,
      type,
      results: { posts, articles, sabhas, users },
      counts
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return jsonError(error?.message || 'Search failed', 500);
  }
};
