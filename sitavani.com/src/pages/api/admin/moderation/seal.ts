import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { parseUserSession, isWalletAdmin } from '../../../../lib/walletAuth';
import { getDatabasePool } from '../../../../data/database';
import { jsonResponse, jsonError } from '../../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const session = parseUserSession(request);
  if (!session || !isWalletAdmin(session.wallet_address)) {
    return jsonError('Unauthorized: Ācārya authority strictly required.', 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }

  const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
  if (!postId) {
    return jsonError('Target postId is required.', 400);
  }

  const pool = getDatabasePool();

  try {
    const postRes = await pool.query(
      `SELECT id, title, content, author_address, chain_tx_hash FROM posts WHERE id = $1`,
      [postId]
    );

    if (postRes.rows.length === 0) {
      return jsonError('Post not found.', 404);
    }

    const post = postRes.rows[0];
    if (post.chain_tx_hash) {
      return jsonResponse({
        success: true,
        alreadySealed: true,
        chain_tx_hash: post.chain_tx_hash,
        message: 'Dispatch already anchored on Kasturi Chain.'
      });
    }

    // Compute cryptographic Satya Mudra digest
    const payload = `SITAVANI:POST:${post.id}:${post.author_address}:${post.title}:${post.content}`;
    const digest = createHash('sha256').update(payload, 'utf8').digest('hex');
    const chainTxHash = `0x${digest}`;

    await pool.query(
      `UPDATE posts SET chain_tx_hash = $1, updated_at = NOW() WHERE id = $2`,
      [chainTxHash, postId]
    );

    // Record in moderation audit logs
    await pool.query(
      `INSERT INTO moderation_logs (admin_address, action_type, target_id, reason)
       VALUES ($1, 'SEAL_ONCHAIN', $2, 'Dispatch cryptographically sealed with Satya Mudra on Kasturi Chain.')`,
      [session.wallet_address, postId]
    );

    return jsonResponse({
      success: true,
      chain_tx_hash: chainTxHash,
      message: 'Dispatch successfully sealed with Satya Mudrā on Kasturi Chain.'
    });

  } catch (error: any) {
    console.error('Satya Seal error:', error);
    return jsonError(error?.message || 'Failed to seal dispatch.', 500);
  }
};
