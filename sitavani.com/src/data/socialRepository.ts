import { getDatabasePool } from './database';
import type { 
  Post, 
  Comment, 
  Sabha, 
  User, 
  UserWarning, 
  ModerationLog, 
  AppNotification, 
  NilaTip, 
  UserProfileData 
} from '../types';
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
    authorAddress?: string;
    limit?: number;
    offset?: number;
    viewerAddress?: string;
  }): Promise<{ posts: Post[]; total: number }> {
    const { sabha, sort = 'hot', search, authorAddress, limit = 25, offset = 0, viewerAddress } = options;
    const conditions: string[] = ['p.is_deleted = FALSE'];
    const values: any[] = [];
    let pIdx = 1;

    if (sabha && sabha !== 'all') {
      conditions.push(`p.sabha_slug = $${pIdx++}`);
      values.push(sabha.toLowerCase());
    }

    if (authorAddress) {
      conditions.push(`p.author_address = $${pIdx++}`);
      values.push(authorAddress.toLowerCase());
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
        p.is_deleted, p.deleted_reason, p.is_misinformation, p.admin_warning_note,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        u.warnings_count as author_warnings, u.is_banned as author_is_banned,
        COALESCE(SUM(nt.amount_nila), 0)::numeric as tips_total,
        COUNT(nt.id)::int as tips_count,
        ${voteSelect}
      FROM posts p
      JOIN users u ON u.wallet_address = p.author_address
      LEFT JOIN nila_tips nt ON nt.target_type = 'POST' AND nt.target_id = p.id
      ${voteJoin}
      ${whereClause}
      GROUP BY p.id, u.display_name, u.role, u.is_verified_authority, u.warnings_count, u.is_banned ${viewerAddress ? ', v.vote_value' : ''}
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
      author_warnings: r.author_warnings || 0,
      author_is_banned: r.author_is_banned || false,
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
      is_deleted: r.is_deleted,
      deleted_reason: r.deleted_reason,
      is_misinformation: r.is_misinformation,
      admin_warning_note: r.admin_warning_note,
      tips_total: parseFloat(r.tips_total || '0'),
      tips_count: r.tips_count || 0,
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
        p.is_deleted, p.deleted_reason, p.is_misinformation, p.admin_warning_note,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        u.warnings_count as author_warnings, u.is_banned as author_is_banned,
        COALESCE(SUM(nt.amount_nila), 0)::numeric as tips_total,
        COUNT(nt.id)::int as tips_count,
        ${voteSelect}
      FROM posts p
      JOIN users u ON u.wallet_address = p.author_address
      LEFT JOIN nila_tips nt ON nt.target_type = 'POST' AND nt.target_id = p.id
      ${voteJoin}
      WHERE p.id = $1
      GROUP BY p.id, u.display_name, u.role, u.is_verified_authority, u.warnings_count, u.is_banned ${viewerAddress ? ', v.vote_value' : ''}
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
      author_warnings: r.author_warnings || 0,
      author_is_banned: r.author_is_banned || false,
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
      is_deleted: r.is_deleted,
      deleted_reason: r.deleted_reason,
      is_misinformation: r.is_misinformation,
      admin_warning_note: r.admin_warning_note,
      tips_total: parseFloat(r.tips_total || '0'),
      tips_count: r.tips_count || 0,
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

    // Check if user is banned
    const user = await this.ensureUser(author);
    if (user.is_banned) {
      throw new Error('This wallet is permanently banned due to accumulating 8 civilizational warnings (अष्ट-चेतावनी-उल्लङ्घनेन निष्कासितः).');
    }

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

    await this.pool.query(query, values);
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
        c.is_deleted, c.deleted_reason,
        u.display_name as author_name, u.role as author_role, u.is_verified_authority as author_is_verified,
        u.warnings_count as author_warnings, u.is_banned as author_is_banned,
        ${voteSelect}
      FROM comments c
      JOIN users u ON u.wallet_address = c.author_address
      ${voteJoin}
      WHERE c.post_id = $1 AND c.is_deleted = FALSE
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
        author_warnings: r.author_warnings || 0,
        author_is_banned: r.author_is_banned || false,
        content: r.content,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        score: r.score,
        is_deleted: r.is_deleted,
        deleted_reason: r.deleted_reason,
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

    // Check if user is banned
    const user = await this.ensureUser(author);
    if (user.is_banned) {
      throw new Error('This wallet is permanently banned due to accumulating 8 civilizational warnings (अष्ट-चेतावनी-उल्लङ्घनेन निष्कासितः).');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO comments (id, post_id, parent_id, author_address, content, score, upvotes, downvotes) VALUES ($1, $2, $3, $4, $5, 1, 1, 0)',
        [id, data.post_id, data.parent_id || null, author, data.content.trim()]
      );
      await client.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [data.post_id]);
      await client.query('UPDATE users SET karma_score = karma_score + 2 WHERE wallet_address = $1', [author]);

      // Trigger notification to Post author or Parent comment author
      const postRes = await client.query('SELECT author_address, title FROM posts WHERE id = $1', [data.post_id]);
      const postAuthor = postRes.rows[0]?.author_address;

      const shortAuthor = author.slice(0, 6) + '...' + author.slice(-4);
      if (data.parent_id) {
        const parentRes = await client.query('SELECT author_address FROM comments WHERE id = $1', [data.parent_id]);
        const parentAuthor = parentRes.rows[0]?.author_address;
        if (parentAuthor && parentAuthor !== author) {
          await client.query(
            `INSERT INTO notifications (recipient_address, sender_address, type, title, body, link)
             VALUES ($1, $2, 'REPLY_COMMENT', 'New reply to your commentary', $3, $4)`,
            [parentAuthor, author, `${shortAuthor}: ${data.content.trim().slice(0, 80)}`, `/p/${data.post_id}`]
          );
        }
      } else if (postAuthor && postAuthor !== author) {
        await client.query(
          `INSERT INTO notifications (recipient_address, sender_address, type, title, body, link)
           VALUES ($1, $2, 'REPLY_POST', 'New commentary on your dispatch', $3, $4)`,
          [postAuthor, author, `${shortAuthor}: ${data.content.trim().slice(0, 80)}`, `/p/${data.post_id}`]
        );
      }

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
    const user = await this.ensureUser(addr);
    if (user.is_banned) {
      throw new Error('This wallet is banned from casting Sammati/Asammati accord votes.');
    }

    const voteId = createHash('sha256').update(`${addr}:${targetType}:${targetId}`).digest('hex');
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existingVote = await client.query('SELECT vote_value FROM votes WHERE id = $1', [voteId]);
      let deltaScore = 0;
      let finalVote = value;

      if (existingVote.rows.length === 0) {
        await client.query(
          'INSERT INTO votes (id, user_address, target_type, target_id, vote_value) VALUES ($1, $2, $3, $4, $5)',
          [voteId, addr, targetType, targetId, value]
        );
        deltaScore = value;
      } else if (existingVote.rows[0].vote_value === value) {
        await client.query('DELETE FROM votes WHERE id = $1', [voteId]);
        deltaScore = -value;
        finalVote = 0;
      } else {
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

  // --- USER PROFILES ECOSYSTEM ---

  async getUserProfile(walletAddress: string): Promise<UserProfileData | null> {
    const addr = walletAddress.toLowerCase();
    const user = await this.getUser(addr);
    if (!user) return null;

    const [postsCountRes, commentsCountRes, sabhaRepRes, tipsRes] = await Promise.all([
      this.pool.query('SELECT COUNT(*) FROM posts WHERE author_address = $1 AND is_deleted = FALSE', [addr]),
      this.pool.query('SELECT COUNT(*) FROM comments WHERE author_address = $1 AND is_deleted = FALSE', [addr]),
      this.pool.query(
        `SELECT p.sabha_slug, s.name_sa, s.name_en, s.icon, COUNT(p.id)::int as posts_count, COALESCE(SUM(p.score), 0)::int as score_sum
         FROM posts p
         JOIN sabhas s ON s.slug = p.sabha_slug
         WHERE p.author_address = $1 AND p.is_deleted = FALSE
         GROUP BY p.sabha_slug, s.name_sa, s.name_en, s.icon
         ORDER BY score_sum DESC`,
        [addr]
      ),
      this.pool.query(
        'SELECT COALESCE(SUM(amount_nila), 0)::numeric as total FROM nila_tips WHERE recipient_address = $1',
        [addr]
      )
    ]);

    return {
      user,
      posts_count: parseInt(postsCountRes.rows[0]?.count || '0', 10),
      comments_count: parseInt(commentsCountRes.rows[0]?.count || '0', 10),
      sabha_reputation: sabhaRepRes.rows,
      tips_received_total: parseFloat(tipsRes.rows[0]?.total || '0')
    };
  }

  async updateUserProfile(walletAddress: string, data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<User> {
    const addr = walletAddress.toLowerCase();
    await this.ensureUser(addr);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.displayName !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(data.displayName.trim().slice(0, 50));
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(data.bio.trim().slice(0, 300));
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(data.avatarUrl.trim() || null);
    }
    if (data.bannerUrl !== undefined) {
      fields.push(`banner_url = $${idx++}`);
      values.push(data.bannerUrl.trim() || null);
    }

    if (fields.length === 0) {
      const u = await this.getUser(addr);
      return u!;
    }

    values.push(addr);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE wallet_address = $${idx} RETURNING *`;
    const res = await this.pool.query<User>(query, values);
    return res.rows[0];
  }

  // --- NOTIFICATIONS SYSTEM ---

  async listNotifications(userAddress: string, limit = 25): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const addr = userAddress.toLowerCase();
    const [notifRes, unreadRes] = await Promise.all([
      this.pool.query<AppNotification>(
        'SELECT * FROM notifications WHERE recipient_address = $1 ORDER BY created_at DESC LIMIT $2',
        [addr, limit]
      ),
      this.pool.query(
        'SELECT COUNT(*)::int as count FROM notifications WHERE recipient_address = $1 AND is_read = FALSE',
        [addr]
      )
    ]);

    return {
      notifications: notifRes.rows,
      unreadCount: unreadRes.rows[0]?.count || 0
    };
  }

  async markNotificationsRead(userAddress: string): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE recipient_address = $1 AND is_read = FALSE',
      [userAddress.toLowerCase()]
    );
  }

  // --- NĪLĀ (नीला) DAKṢIṆĀ TIPPING ---

  async recordNilaTip(data: {
    senderAddress: string;
    recipientAddress: string;
    targetType: 'POST' | 'COMMENT';
    targetId: string;
    amountNila: number;
    chainTxHash: string;
  }): Promise<NilaTip> {
    const sender = data.senderAddress.toLowerCase();
    const recipient = data.recipientAddress.toLowerCase();

    await this.ensureUser(sender);
    await this.ensureUser(recipient);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const tipRes = await client.query<NilaTip>(
        `INSERT INTO nila_tips (sender_address, recipient_address, target_type, target_id, amount_nila, chain_tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [sender, recipient, data.targetType, data.targetId, data.amountNila, data.chainTxHash]
      );

      await client.query(
        'UPDATE users SET total_nila_received = total_nila_received + $1 WHERE wallet_address = $2',
        [data.amountNila, recipient]
      );

      const shortSender = sender.slice(0, 6) + '...' + sender.slice(-4);
      const link = `/p/${data.targetId}`;

      await client.query(
        `INSERT INTO notifications (recipient_address, sender_address, type, title, body, link)
         VALUES ($1, $2, 'NILA_TIP', $3, $4, $5)`,
        [
          recipient,
          sender,
          'दक्षिणा Nīlā Gift Received!',
          `You received ${data.amountNila} NILA gift from ${shortSender} on Kasturi Chain.`,
          link
        ]
      );

      await client.query('COMMIT');
      return tipRes.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // --- MODERATION & 8-WARNING SYSTEM (दण्डनीति Daṇḍanīti) ---

  async issueWarning(data: {
    userAddress: string;
    adminAddress: string;
    reason: string;
    targetType?: 'POST' | 'COMMENT' | 'DIRECT';
    targetId?: string;
  }): Promise<{ warnings_count: number; is_banned: boolean; warning_index: number }> {
    const addr = data.userAddress.toLowerCase();
    const admin = data.adminAddress.toLowerCase();
    await this.ensureUser(addr);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Increment warning count
      const updateRes = await client.query(
        'UPDATE users SET warnings_count = warnings_count + 1 WHERE wallet_address = $1 RETURNING warnings_count, is_banned',
        [addr]
      );
      const newCount = updateRes.rows[0].warnings_count;
      let isBanned = updateRes.rows[0].is_banned;

      // 2. Strict 8-Warning Rule: Automatic Permanent Ban on 8th Strike!
      if (newCount >= 8 && !isBanned) {
        isBanned = true;
        const banReason = `Accumulated 8 civilizational warnings (अष्ट-चेतावनी-उल्लङ्घनम्: 8/8 Strikes reached: ${data.reason})`;
        await client.query(
          'UPDATE users SET is_banned = TRUE, ban_reason = $1, banned_at = NOW(), banned_by = $2 WHERE wallet_address = $3',
          [banReason, admin, addr]
        );
      }

      // 3. Record in user_warnings table
      await client.query(
        `INSERT INTO user_warnings (user_address, warned_by, reason, target_type, target_id, warning_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [addr, admin, data.reason, data.targetType || 'POST', data.targetId || null, newCount]
      );

      // 4. Log in moderation_logs
      await client.query(
        `INSERT INTO moderation_logs (admin_address, action_type, target_id, target_address, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [admin, isBanned && newCount >= 8 ? 'AUTO_BAN_8_STRIKES' : 'ISSUE_WARNING', data.targetId || null, addr, `Strike ${newCount}/8: ${data.reason}`]
      );

      // 5. Send Notification to User
      await client.query(
        `INSERT INTO notifications (recipient_address, sender_address, type, title, body, link)
         VALUES ($1, $2, 'WARNING_STRIKE', $3, $4, $5)`,
        [
          addr,
          admin,
          isBanned ? '🚫 Account Expelled (8/8 Strikes)' : `⚠️ चेतावनी Warning Strike ${newCount}/8 Issued`,
          data.reason,
          `/u/${addr}`
        ]
      );

      await client.query('COMMIT');
      return { warnings_count: newCount, is_banned: isBanned, warning_index: newCount };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deletePost(postId: string, adminAddress: string, reason: string): Promise<void> {
    const admin = adminAddress.toLowerCase();
    const res = await this.pool.query(
      'UPDATE posts SET is_deleted = TRUE, deleted_by = $1, deleted_reason = $2 WHERE id = $3 RETURNING author_address, title',
      [admin, reason, postId]
    );
    if (res.rows[0]) {
      await this.pool.query(
        'INSERT INTO moderation_logs (admin_address, action_type, target_id, target_address, reason) VALUES ($1, $2, $3, $4, $5)',
        [admin, 'DELETE_POST', postId, res.rows[0].author_address, reason]
      );
    }
  }

  async deleteComment(commentId: string, adminAddress: string, reason: string): Promise<void> {
    const admin = adminAddress.toLowerCase();
    const res = await this.pool.query(
      'UPDATE comments SET is_deleted = TRUE, deleted_reason = $1 WHERE id = $2 RETURNING author_address, post_id',
      [reason, commentId]
    );
    if (res.rows[0]) {
      await this.pool.query(
        'INSERT INTO moderation_logs (admin_address, action_type, target_id, target_address, reason) VALUES ($1, $2, $3, $4, $5)',
        [admin, 'DELETE_COMMENT', commentId, res.rows[0].author_address, reason]
      );
    }
  }

  async markMisinformation(postId: string, adminAddress: string, note: string): Promise<void> {
    const admin = adminAddress.toLowerCase();
    const res = await this.pool.query(
      'UPDATE posts SET is_misinformation = TRUE, admin_warning_note = $1 WHERE id = $2 RETURNING author_address',
      [note, postId]
    );
    if (res.rows[0]) {
      await this.pool.query(
        'INSERT INTO moderation_logs (admin_address, action_type, target_id, target_address, reason) VALUES ($1, $2, $3, $4, $5)',
        [admin, 'MARK_MISINFORMATION', postId, res.rows[0].author_address, note]
      );
    }
  }

  async unbanUser(userAddress: string, adminAddress: string, resetWarnings: boolean = false): Promise<void> {
    const addr = userAddress.toLowerCase();
    const admin = adminAddress.toLowerCase();
    const resetSql = resetWarnings ? ', warnings_count = 0' : '';
    await this.pool.query(
      `UPDATE users SET is_banned = FALSE, ban_reason = NULL, banned_at = NULL, banned_by = NULL ${resetSql} WHERE wallet_address = $1`,
      [addr]
    );
    await this.pool.query(
      'INSERT INTO moderation_logs (admin_address, action_type, target_id, target_address, reason) VALUES ($1, $2, $3, $4, $5)',
      [admin, 'UNBAN_USER', addr, addr, resetWarnings ? 'Pardoned & strikes reset to 0' : 'Unbanned']
    );
  }

  async listWarnedAndBannedUsers(): Promise<User[]> {
    const res = await this.pool.query<User>(
      'SELECT * FROM users WHERE warnings_count > 0 OR is_banned = TRUE ORDER BY is_banned DESC, warnings_count DESC, created_at DESC'
    );
    return res.rows;
  }

  async getUserWarnings(userAddress: string): Promise<UserWarning[]> {
    const res = await this.pool.query<UserWarning>(
      'SELECT * FROM user_warnings WHERE user_address = $1 ORDER BY created_at DESC',
      [userAddress.toLowerCase()]
    );
    return res.rows;
  }

  async listModerationLogs(limit = 50): Promise<ModerationLog[]> {
    const res = await this.pool.query<ModerationLog>(
      'SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return res.rows;
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
