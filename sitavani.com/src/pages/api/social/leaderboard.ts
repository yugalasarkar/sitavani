import type { APIRoute } from 'astro';
import { getDatabasePool } from '../../../data/database';
import { jsonResponse, jsonError } from '../../../lib/api';

export const GET: APIRoute = async () => {
  const pool = getDatabasePool();

  try {
    // 1. Top Punya (Merit) Seekers & Scholars
    const punyaRes = await pool.query(
      `SELECT u.wallet_address, u.display_name, u.role, u.karma_score, u.total_nila_received,
              u.is_verified_authority, u.avatar_url,
              COUNT(p.id)::int as total_posts
       FROM users u
       LEFT JOIN posts p ON u.wallet_address = p.author_address AND (p.is_deleted IS FALSE OR p.is_deleted IS NULL)
       WHERE (u.is_banned IS FALSE OR u.is_banned IS NULL)
       GROUP BY u.wallet_address
       ORDER BY u.karma_score DESC
       LIMIT 50`
    );

    // 2. Top Nila Tip Recipients
    const nilaRes = await pool.query(
      `SELECT u.wallet_address, u.display_name, u.role, u.total_nila_received, u.karma_score,
              u.is_verified_authority, u.avatar_url,
              COUNT(nt.id)::int as tips_received_count
       FROM users u
       LEFT JOIN nila_tips nt ON u.wallet_address = nt.recipient_address
       WHERE (u.is_banned IS FALSE OR u.is_banned IS NULL)
         AND u.total_nila_received > 0
       GROUP BY u.wallet_address
       ORDER BY u.total_nila_received DESC
       LIMIT 50`
    );

    // 3. Top Accord Dispatches
    const postsRes = await pool.query(
      `SELECT p.id, p.title, p.sabha_slug as sabha, p.score, p.comments_count, p.created_at, p.chain_tx_hash,
              u.wallet_address as author_address, u.display_name as author_name, u.role as author_role
       FROM posts p
       LEFT JOIN users u ON p.author_address = u.wallet_address
       WHERE (p.is_deleted IS FALSE OR p.is_deleted IS NULL)
       ORDER BY p.score DESC, p.created_at DESC
       LIMIT 25`
    );

    return jsonResponse({
      topPunya: punyaRes.rows,
      topNila: nilaRes.rows,
      topPosts: postsRes.rows,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return jsonError(error?.message || 'Leaderboard fetch failed', 500);
  }
};
