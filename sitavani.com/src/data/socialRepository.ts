import { getDatabasePool } from './database';
import type { Post, Comment, Sabha, User } from '../types';
import { randomBytes, createHash } from 'node:crypto';

export class SocialRepository {
  private pool = getDatabasePool();

  async getSabhas(): Promise<Sabha[]> {
    const res = await this.pool.query<Sabha>(
      'SELECT slug, name_sa, name_en, name_hi, description_en, description_hi, icon, color, is_official FROM sabhas ORDER BY is_official DESC, slug ASC'
    );
    return res.rows;
  }

  async listPosts(options: {
    sabha?: string;
    sort?: 'hot' | 'new' | 'top';
    search?: string;
    limit?: number;
    offset?: number;
    viewerAddress?: string;
  }): Promise<{ posts: Post[]; total: number }> {
    const { sabha, sort = 'hot', search, limit = 25, offset = 0, viewerAddress } = options;
    const conditions: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (sabha && sabha !== 'all') {
      conditions.push(`p.sabha_slug = $${pIdx++}`);
      values.push(sabha.toLowerCase());
    }

    if (search && search.trim()) {
      conditions.push(`(p.title ILIKE $${pIdx} OR p.content ILIKE $${pIdx})`);
      values.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.is_pinned DESC, p.score DESC, p.created_at DESC';
    if (sort === 'new') {
      orderBy = 'p.is_pinned DESC, p.created_at DESC';
    } else if (sort === 'top') {
      orderBy = 'p.score DESC, p.created_at DESC';
    }

    const countQuery = `SELECT COUNT(*) FROM posts p ${whereClause}`;
    const countRes = await this.pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    let voteJoin = '';
    let voteSelect = 'NULL::int as user_vote';
    if (viewerAddress) {
      voteSelect = 'v.vote_value as user_vote';
      voteJoin = `LEFT JOIN votes v ON v.target_type = 'POST' AND v.target_id = p.id AND v.user_address = $${pIdx++}`;
      values.push(viewerAddress.toLowerCase());
    }

    const query = `
      SELECT 
        p.id, p.sabha_slug, p.author_address, p.title, p.content, p.media_url, 
        p.media_type, p.original_url, p.is_pinned, p.is_official_dispatch, 
        p.upvotes, p.downvotes, p.score, p.comments_count, p.chain_tx_hash, p.created_at,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        ${voteSelect}
      FROM posts p
      JOIN users u ON u.wallet_address = p.author_address
      ${voteJoin}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    values.push(limit, offset);

    const res = await this.pool.query(query, values);
    const posts: Post[] = res.rows.map(r => ({
      id: r.id,
      sabha_slug: r.sabha_slug,
      author_address: r.author_address,
      author_name: r.author_name || r.author_address.slice(0, 8),
      author_role: r.author_role,
      author_is_verified: r.author_is_verified,
      title: r.title,
      content: r.content,
      media_url: r.media_url,
      media_type: r.media_type,
      original_url: r.original_url,
      is_pinned: r.is_pinned,
      is_official_dispatch: r.is_official_dispatch,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      score: r.score,
      comments_count: r.comments_count,
      chain_tx_hash: r.chain_tx_hash,
      user_vote: r.user_vote ?? undefined,
      created_at: r.created_at
    }));

    return { posts, total };
  }

  async getPost(id: string, viewerAddress?: string): Promise<Post | null> {
    let voteJoin = '';
    let voteSelect = 'NULL::int as user_vote';
    const values: any[] = [id];

    if (viewerAddress) {
      voteSelect = 'v.vote_value as user_vote';
      voteJoin = `LEFT JOIN votes v ON v.target_type = 'POST' AND v.target_id = p.id AND v.user_address = $2`;
      values.push(viewerAddress.toLowerCase());
    }

    const query = `
      SELECT 
        p.id, p.sabha_slug, p.author_address, p.title, p.content, p.media_url, 
        p.media_type, p.original_url, p.is_pinned, p.is_official_dispatch, 
        p.upvotes, p.downvotes, p.score, p.comments_count, p.chain_tx_hash, p.created_at,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        ${voteSelect}
      FROM posts p
      JOIN users u ON u.wallet_address = p.author_address
      ${voteJoin}
      WHERE p.id = $1
    `;
    const res = await this.pool.query(query, values);
    if (!res.rows[0]) return null;

    const r = res.rows[0];
    return {
      id: r.id,
      sabha_slug: r.sabha_slug,
      author_address: r.author_address,
      author_name: r.author_name || r.author_address.slice(0, 8),
      author_role: r.author_role,
      author_is_verified: r.author_is_verified,
      title: r.title,
      content: r.content,
      media_url: r.media_url,
      media_type: r.media_type,
      original_url: r.original_url,
      is_pinned: r.is_pinned,
      is_official_dispatch: r.is_official_dispatch,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      score: r.score,
      comments_count: r.comments_count,
      chain_tx_hash: r.chain_tx_hash,
      user_vote: r.user_vote ?? undefined,
      created_at: r.created_at
    };
  }

  async createPost(data: {
    sabha_slug: string;
    author_address: string;
    title: string;
    content: string;
    media_url?: string;
    media_type?: 'IMAGE' | 'LINK' | 'TEXT';
    original_url?: string;
    is_pinned?: boolean;
    is_official_dispatch?: boolean;
    chain_tx_hash?: string;
  }): Promise<Post> {
    const id = 'post_' + randomBytes(8).toString('hex');
    const author = data.author_address.toLowerCase();

    // Ensure author exists
    await this.ensureUser(author);

    const query = `
      INSERT INTO posts (
        id, sabha_slug, author_address, title, content, media_url, media_type,
        original_url, is_pinned, is_official_dispatch, score, upvotes, downvotes, chain_tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 1, 0, $11)
      RETURNING *
    `;
    const values = [
      id,
      data.sabha_slug.toLowerCase(),
      author,
      data.title.trim(),
      data.content.trim(),
      data.media_url || null,
      data.media_type || (data.media_url ? 'IMAGE' : 'TEXT'),
      data.original_url || null,
      data.is_pinned ?? false,
      data.is_official_dispatch ?? false,
      data.chain_tx_hash || null
    ];

    const res = await this.pool.query(query, values);
    // Award +5 Karma to user
    await this.pool.query('UPDATE users SET karma_score = karma_score + 5 WHERE wallet_address = $1', [author]);

    const post = await this.getPost(id, author);
    return post!;
  }

  async listComments(postId: string, viewerAddress?: string): Promise<Comment[]> {
    let voteJoin = '';
    let voteSelect = 'NULL::int as user_vote';
    const values: any[] = [postId];

    if (viewerAddress) {
      voteSelect = 'v.vote_value as user_vote';
      voteJoin = `LEFT JOIN votes v ON v.target_type = 'COMMENT' AND v.target_id = c.id AND v.user_address = $2`;
      values.push(viewerAddress.toLowerCase());
    }

    const query = `
      SELECT 
        c.id, c.post_id, c.parent_id, c.author_address, c.content, c.upvotes, c.downvotes, c.score, c.created_at,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        ${voteSelect}
      FROM comments c
      JOIN users u ON u.wallet_address = c.author_address
      ${voteJoin}
      WHERE c.post_id = $1
      ORDER BY c.score DESC, c.created_at ASC
    `;
    const res = await this.pool.query(query, values);
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    for (const r of res.rows) {
      const comment: Comment = {
        id: r.id,
        post_id: r.post_id,
        parent_id: r.parent_id,
        author_address: r.author_address,
        author_name: r.author_name || r.author_address.slice(0, 8),
        author_role: r.author_role,
        author_is_verified: r.author_is_verified,
        content: r.content,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        score: r.score,
        user_vote: r.user_vote ?? undefined,
        created_at: r.created_at,
        replies: []
      };
      map.set(comment.id, comment);
    }

    for (const comment of map.values()) {
      if (comment.parent_id && map.has(comment.parent_id)) {
        map.get(comment.parent_id)!.replies!.push(comment);
      } else {
        roots.push(comment);
      }
    }

    return roots;
  }

  async addComment(data: {
    post_id: string;
    parent_id?: string;
    author_address: string;
    content: string;
  }): Promise<Comment> {
    const id = 'cm_' + randomBytes(8).toString('hex');
    const author = data.author_address.toLowerCase();

    await this.ensureUser(author);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO comments (id, post_id, parent_id, author_address, content, score, upvotes, downvotes) VALUES ($1, $2, $3, $4, $5, 1, 1, 0)',
        [id, data.post_id, data.parent_id || null, author, data.content.trim()]
      );
      await client.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [data.post_id]);
      await client.query('UPDATE users SET karma_score = karma_score + 2 WHERE wallet_address = $1', [author]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return {
      id,
      post_id: data.post_id,
      parent_id: data.parent_id || null,
      author_address: author,
      content: data.content.trim(),
      upvotes: 1,
      downvotes: 0,
      score: 1,
      created_at: new Date().toISOString()
    };
  }

  async castVote(userAddress: string, targetType: 'POST' | 'COMMENT', targetId: string, value: 1 | -1): Promise<{ score: number; userVote: number }> {
    const addr = userAddress.toLowerCase();
    await this.ensureUser(addr);

    const voteId = createHash('sha256').update(`${addr}:${targetType}:${targetId}`).digest('hex');
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existingVote = await client.query('SELECT vote_value FROM votes WHERE id = $1', [voteId]);
      let deltaScore = 0;
      let finalVote = value;

      if (existingVote.rows.length === 0) {
        // New vote
        await client.query(
          'INSERT INTO votes (id, user_address, target_type, target_id, vote_value) VALUES ($1, $2, $3, $4, $5)',
          [voteId, addr, targetType, targetId, value]
        );
        deltaScore = value;
      } else if (existingVote.rows[0].vote_value === value) {
        // Toggle vote off
        await client.query('DELETE FROM votes WHERE id = $1', [voteId]);
        deltaScore = -value;
        finalVote = 0;
      } else {
        // Reverse vote
        await client.query('UPDATE votes SET vote_value = $1 WHERE id = $2', [value, voteId]);
        deltaScore = 2 * value;
      }

      const table = targetType === 'POST' ? 'posts' : 'comments';
      const upDelta = finalVote === 1 ? 1 : (existingVote.rows[0]?.vote_value === 1 ? -1 : 0);
      const downDelta = finalVote === -1 ? 1 : (existingVote.rows[0]?.vote_value === -1 ? -1 : 0);

      const updateRes = await client.query(
        `UPDATE ${table} SET 
          score = score + $1,
          upvotes = GREATEST(0, upvotes + $2),
          downvotes = GREATEST(0, downvotes + $3)
         WHERE id = $4 RETURNING score, author_address`,
        [deltaScore, upDelta, downDelta, targetId]
      );

      const targetAuthor = updateRes.rows[0]?.author_address;
      if (targetAuthor && deltaScore !== 0) {
        await client.query('UPDATE users SET karma_score = karma_score + $1 WHERE wallet_address = $2', [deltaScore, targetAuthor]);
      }

      await client.query('COMMIT');
      return { score: updateRes.rows[0]?.score ?? 0, userVote: finalVote };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async ensureUser(walletAddress: string): Promise<User> {
    const addr = walletAddress.toLowerCase();
    const existing = await this.pool.query<User>('SELECT * FROM users WHERE wallet_address = $1', [addr]);
    if (existing.rows[0]) return existing.rows[0];

    const short = addr.slice(0, 6) + '...' + addr.slice(-4);
    const res = await this.pool.query<User>(
      'INSERT INTO users (wallet_address, username, display_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address RETURNING *',
      [addr, 'user_' + addr.slice(2, 10), short, 'JIJNASU']
    );
    return res.rows[0];
  }

  async getUser(walletAddress: string): Promise<User | null> {
    const res = await this.pool.query<User>('SELECT * FROM users WHERE wallet_address = $1', [walletAddress.toLowerCase()]);
    return res.rows[0] || null;
  }

  async saveNonce(walletAddress: string, nonce: string): Promise<void> {
    const addr = walletAddress.toLowerCase();
    await this.pool.query(
      'INSERT INTO auth_nonces (nonce, wallet_address, expires_at) VALUES ($1, $2, now() + interval \'10 minutes\') ON CONFLICT (nonce) DO NOTHING',
      [nonce, addr]
    );
  }

  async verifyAndConsumeNonce(walletAddress: string, nonce: string): Promise<boolean> {
    const addr = walletAddress.toLowerCase();
    const res = await this.pool.query(
      'DELETE FROM auth_nonces WHERE nonce = $1 AND wallet_address = $2 AND expires_at > now() RETURNING nonce',
      [nonce, addr]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }
}

export const socialRepository = new SocialRepository();
