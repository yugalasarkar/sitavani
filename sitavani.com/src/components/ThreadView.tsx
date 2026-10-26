import React, { useState, useEffect } from 'react';
import type { Post, Comment, Sabha } from '../types';
import { NilaTipModal } from './NilaTipModal';
import { ShlokaView } from './ShlokaView';
import { PollWidget } from './PollWidget';

interface ThreadViewProps {
  post: Post;
  initialComments: Comment[];
  sabhas: Sabha[];
}

export const ThreadView: React.FC<ThreadViewProps> = ({ post: initialPost, initialComments, sabhas }) => {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [userSession, setUserSession] = useState<{ address: string; role: string; karma: number; isAdmin?: boolean } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tippingTarget, setTippingTarget] = useState<{ address: string; name?: string; type: 'POST' | 'COMMENT'; id: string } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleToggleBookmark = async () => {
    if (!userSession) {
      showToast('Please connect your MetaMask wallet to bookmark dispatches.');
      return;
    }
    try {
      const res = await fetch('/api/social/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id })
      });
      const data = await res.json();
      setIsBookmarked(data.bookmarked);
      showToast(data.bookmarked ? '🔖 Dispatch saved to your संग्रहः (Bookmarks)!' : 'Bookmark removed.');
    } catch (e: any) {
      showToast('Failed to update bookmark.');
    }
  };

  const renderFormattedContent = (text: string) => {
    if (!text || (!text.includes(':::shloka') && !text.includes(':::poll'))) {
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    const parts = text.split(/(:::shloka[\s\S]*?:::|:::poll[\s\S]*?:::)/g);
    return (
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (part.startsWith(':::shloka') && part.endsWith(':::')) {
            const inner = part.replace(/^:::shloka\s*/, '').replace(/\s*:::$/, '');
            const sections = inner.split(/\n\s*---\s*\n/);
            const verse = sections[0]?.trim() || '';
            let translit = '';
            let en = '';
            let hi = '';
            let source = '';

            if (sections.length >= 5) {
              translit = sections[1]?.trim() || '';
              en = sections[2]?.trim() || '';
              hi = sections[3]?.trim() || '';
              source = sections[4]?.trim() || '';
            } else if (sections.length === 4) {
              translit = sections[1]?.trim() || '';
              en = sections[2]?.trim() || '';
              hi = sections[3]?.trim() || '';
            } else if (sections.length === 3) {
              en = sections[1]?.trim() || '';
              hi = sections[2]?.trim() || '';
            } else if (sections.length === 2) {
              en = sections[1]?.trim() || '';
            }

            return (
              <ShlokaView
                key={index}
                verseSanskrit={verse}
                transliterationIast={translit || undefined}
                translationEn={en}
                translationHi={hi}
                sourceCitation={source || undefined}
              />
            );
          }

          if (part.startsWith(':::poll') && part.endsWith(':::')) {
            const inner = part.replace(/^:::poll\s*/, '').replace(/\s*:::$/, '');
            const lines = inner.split('\n').map(l => l.trim()).filter(l => l && l !== '---');
            const question = lines[0] || 'Dialectic Referendum';
            const options = lines.slice(1);
            return (
              <PollWidget
                key={index}
                postId={post.id}
                question={question}
                options={options.length > 0 ? options : ['सम्मति Accord', 'असम्मति Dissent']}
              />
            );
          }

          if (!part.trim()) return null;
          return <p key={index} className="whitespace-pre-wrap">{part.trim()}</p>;
        })}
      </div>
    );
  };

  const currentSabha = sabhas.find(s => s.slug === post.sabha_slug);
  const isAdminPost = post.author_address.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';
  const isAdminViewer = userSession?.role === 'ADMIN' || userSession?.isAdmin || userSession?.address?.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserSession({
            address: data.user.wallet_address,
            role: data.user.role,
            karma: data.user.karma_score,
            isAdmin: data.isAdmin
          });
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleVote = async (targetType: 'POST' | 'COMMENT', targetId: string, value: 1 | -1) => {
    if (!userSession) {
      showToast('कृपया सम्मति-प्रदानाय मत्सञ्चिकां संयोजयतु (Please connect MetaMask to vote)');
      return;
    }

    try {
      const res = await fetch('/api/social/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');

      if (targetType === 'POST') {
        setPost(prev => ({
          ...prev,
          score: data.score,
          user_vote: data.userVote
        }));
      } else {
        const updateTree = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (c.id === targetId) {
              return { ...c, score: data.score, user_vote: data.userVote };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) };
            }
            return c;
          });
        };
        setComments(prev => updateTree(prev));
      }
    } catch (err: any) {
      showToast(err.message || 'Vote operation failed');
    }
  };

  const handleAddComment = async (parentId?: string) => {
    if (!userSession) {
      showToast('कृपया टिप्पणी-लेखनाय मत्सञ्चिकां संयोजयतु (Please connect MetaMask to comment)');
      return;
    }

    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          parentId: parentId || undefined,
          content: content.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comment failed');

      const createdComment: Comment = {
        ...data.comment,
        author_name: userSession.address.slice(0, 6) + '...' + userSession.address.slice(-4),
        author_role: userSession.role as any,
        replies: []
      };

      if (!parentId) {
        setComments(prev => [createdComment, ...prev]);
        setNewComment('');
      } else {
        const insertReply = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), createdComment]
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: insertReply(c.replies) };
            }
            return c;
          });
        };
        setComments(prev => insertReply(prev));
        setReplyingToId(null);
        setReplyText('');
      }

      setPost(prev => ({ ...prev, comments_count: prev.comments_count + 1 }));
      showToast('टिप्पणी साफल्येन योजिता (Comment successfully published)');
    } catch (err: any) {
      showToast(err.message || 'Comment could not be published');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('सूत्र-सङ्केतः प्रतिलिखितः (Thread link copied to clipboard)');
    }
  };

  // --- ADMIN MODERATION ACTIONS ---
  const handleAdminStrike = async (authorAddress: string, targetType: 'POST' | 'COMMENT', targetId: string) => {
    const reason = prompt(`Reason for issuing a civilizational warning strike to ${authorAddress.slice(0, 8)}...\n(Warning Rule: 8 accumulated strikes result in an automatic permanent ban):`);
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch('/api/admin/moderation/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: authorAddress,
          reason: reason.trim(),
          targetType,
          targetId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue warning');
      alert(data.message || `Strike recorded. Target now has ${data.warnings_count}/8 strikes.`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Strike could not be recorded.');
    }
  };

  const handleAdminDeletePost = async () => {
    if (!confirm('Permanently delete this dispatch from SITAVANI?')) return;
    const reason = prompt('Reason for deletion:', 'Violates civilizational truth standards');

    try {
      const res = await fetch('/api/admin/moderation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'POST', id: post.id, reason: reason || 'Purged by Administrator' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post');
      alert('Post deleted. Returning to homepage.');
      window.location.href = '/';
    } catch (err: any) {
      alert(err.message || 'Could not delete post.');
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    if (!confirm('Permanently delete this comment?')) return;
    try {
      const res = await fetch('/api/admin/moderation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'COMMENT', id: commentId, reason: 'Purged by Administrator' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete comment');
      const removeCommentFromTree = (list: Comment[]): Comment[] => {
        return list.filter(c => c.id !== commentId).map(c => {
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: removeCommentFromTree(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => removeCommentFromTree(prev));
      showToast('Comment purged successfully');
    } catch (err: any) {
      alert(err.message || 'Could not delete comment.');
    }
  };

  const handleAdminFlagMisinfo = async () => {
    const note = prompt('Enter editorial fact-check clarification / rebuttal note:');
    if (!note || !note.trim()) return;

    try {
      const res = await fetch('/api/admin/moderation/misinformation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, note: note.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to flag misinformation');
      setPost(prev => ({ ...prev, is_misinformation: true, admin_warning_note: note.trim() }));
      showToast('Post marked with Asatya (Falsehood) notice');
    } catch (err: any) {
      alert(err.message || 'Could not flag misinformation.');
    }
  };

  const handleAdminSealPost = async () => {
    if (!confirm('Seal this dispatch cryptographically with Satya Mudra on Kasturi Chain?')) return;
    try {
      const res = await fetch('/api/admin/moderation/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id })
      });
      const data = await res.json();
      if (res.ok) {
        setPost(prev => ({ ...prev, chain_tx_hash: data.chain_tx_hash }));
        showToast('Dispatch successfully sealed with Satya Mudra on Kasturi Chain!');
      } else {
        alert(data.error || 'Failed to seal dispatch.');
      }
    } catch (err: any) {
      alert(err.message || 'Could not seal dispatch.');
    }
  };

  const renderComment = (c: Comment, depth = 0) => {
    const isCommentAdmin = c.author_address.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';
    const isReplying = replyingToId === c.id;

    return (
      <div
        key={c.id}
        className={`mt-4 pt-3 ${depth > 0 ? 'border-l-2 border-amber-900/40 pl-3 sm:pl-4 ml-1 sm:ml-2' : 'border-t border-slate-800/80'}`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={`/u/${c.author_address}`}
            className="font-mono text-slate-300 font-semibold hover:text-amber-300 hover:underline transition-colors"
            title="View Profile"
          >
            {c.author_name || (c.author_address.slice(0, 6) + '...' + c.author_address.slice(-4))}
          </a>

          {isCommentAdmin ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              ★ SITAVANI Vārtā (आचार्य)
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
              {c.author_role === 'ADMIN' || c.author_role === 'ACHARYA' ? 'आचार्य Ācārya' : c.author_role === 'PANDITA' ? 'पण्डित Paṇḍita' : 'जिज्ञासु Jijñāsu'}
            </span>
          )}

          {/* Comment Author Strikes */}
          {c.author_warnings && c.author_warnings > 0 ? (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
              ⚠️ {c.author_warnings}/8 Strikes
            </span>
          ) : null}

          {c.author_is_banned && (
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
              🚫 BANNED
            </span>
          )}

          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-500">
            {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Comment Content */}
        <p className="mt-2 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
          {c.content}
        </p>

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote('COMMENT', c.id, 1)}
              aria-label="Sammati (Accord)"
              className={`p-1 rounded transition-colors ${c.user_vote === 1 ? 'text-amber-400 bg-amber-500/10' : 'hover:text-amber-300'}`}
            >
              ▲
            </button>
            <span className={`font-semibold ${c.score > 0 ? 'text-amber-400' : c.score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {c.score}
            </span>
            <button
              onClick={() => handleVote('COMMENT', c.id, -1)}
              aria-label="Asammati (Dissent)"
              className={`p-1 rounded transition-colors ${c.user_vote === -1 ? 'text-rose-400 bg-rose-500/10' : 'hover:text-rose-400'}`}
            >
              ▼
            </button>
          </div>

          <button
            onClick={() => {
              if (isReplying) {
                setReplyingToId(null);
                setReplyText('');
              } else {
                setReplyingToId(c.id);
                setReplyText('');
              }
            }}
            className="hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>प्रतिवचनम् (Reply)</span>
          </button>

          <button
            onClick={() => setTippingTarget({
              address: c.author_address,
              name: c.author_name || (c.author_address.slice(0, 6) + '...' + c.author_address.slice(-4)),
              type: 'COMMENT',
              id: c.id
            })}
            className="hover:text-emerald-300 flex items-center gap-1 text-[11px] text-emerald-400/80 transition-colors"
            title="Gift Nīlā coins to commentator"
          >
            <span>🎁 दक्षिणा Nīlā</span>
          </button>

          {/* Admin comment actions */}
          {isAdminViewer && (
            <div className="flex items-center gap-2 ml-auto text-[10px]">
              <button
                onClick={() => handleAdminStrike(c.author_address, 'COMMENT', c.id)}
                className="text-amber-400/80 hover:text-amber-300"
                title="Issue 1 Strike (Automatic ban upon 8 strikes)"
              >
                ⚠️ Strike Author
              </button>
              <button
                onClick={() => handleAdminDeleteComment(c.id)}
                className="text-rose-400/80 hover:text-rose-300"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>

        {/* Reply input box */}
        {isReplying && (
          <div className="mt-3 p-3 rounded-lg bg-[#0C0F17] border border-amber-900/40 space-y-2">
            <textarea
              rows={2}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="सत्यं ब्रूयात् प्रियं ब्रूयात् — Write your reply..."
              className="w-full bg-[#07080B] border border-slate-800 rounded p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReplyingToId(null)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                विराम (Cancel)
              </button>
              <button
                disabled={submitting || !replyText.trim()}
                onClick={() => handleAddComment(c.id)}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold disabled:opacity-50"
              >
                {submitting ? 'प्रेषणम्...' : 'सम्भाष (Submit Reply)'}
              </button>
            </div>
          </div>
        )}

        {/* Recursive replies */}
        {c.replies && c.replies.length > 0 && (
          <div className="space-y-1">
            {c.replies.map(r => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0E121B] border border-amber-500/50 text-amber-200 px-4 py-3 rounded-lg shadow-xl shadow-black/80 text-xs sm:text-sm animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Post Card */}
      <article className="bg-[#0B0D13] border border-slate-800/80 rounded-xl overflow-hidden shadow-lg shadow-black/40">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/60 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/s/${post.sabha_slug}`}
                className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:text-amber-300 font-medium tracking-wide flex items-center gap-1.5"
              >
                <span>{currentSabha?.icon || '🏛️'}</span>
                <span>{currentSabha?.name_sa || post.sabha_slug}</span>
              </a>

              <span className="text-slate-600">•</span>

              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">लेखकः</span>
                <a
                  href={`/u/${post.author_address}`}
                  className="text-slate-200 hover:text-amber-300 hover:underline font-semibold transition-colors"
                  title="View Sovereign Profile"
                >
                  {post.author_name || (post.author_address.slice(0, 6) + '...' + post.author_address.slice(-4))}
                </a>
              </div>

              {post.author_warnings && post.author_warnings > 0 ? (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                  ⚠️ {post.author_warnings}/8 Strikes
                </span>
              ) : null}

              {isAdminPost && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold flex items-center gap-1">
                  <span>★</span>
                  <span>SITAVANI Vārtā | आधिकारिक संवाद</span>
                </span>
              )}

              {post.chain_tx_hash && (
                <a
                  href={`https://satya.yugala.org/tx/${post.chain_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-800/40 px-2 py-0.5 rounded transition-colors"
                  title="View on Satya Block Explorer"
                >
                  <span>⛓️ कस्तूरी Verified ↗</span>
                </a>
              )}
            </div>

            <span className="text-slate-500 font-mono text-[11px]">
              {new Date(post.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Misinformation Notice Banner */}
          {post.is_misinformation && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-600/70 text-rose-200 text-xs font-mono space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-400">
                <span>⚠️</span>
                <span>मिथ्या / असत्य सूचना (Falsehood / Misinformation Notice)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {post.admin_warning_note || 'This dispatch contains unverified assertions or rejected narratives.'}
              </p>
            </div>
          )}

          {/* Post Title */}
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 tracking-wide leading-snug">
            {post.title}
          </h1>

          {/* Source URL if present */}
          {post.original_url && (
            <div className="text-xs font-mono text-slate-400 bg-[#07090E] p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="truncate mr-2">स्रोतसूत्रम् Source: {post.original_url}</span>
              <a
                href={post.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline shrink-0"
              >
                उद्घाटयतु (Open ↗)
              </a>
            </div>
          )}

          {/* Post Image */}
          {post.media_url && (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#07080B] max-h-[500px] flex items-center justify-center">
              <img
                src={post.media_url}
                alt={post.title}
                className="max-h-[500px] w-auto object-contain rounded"
              />
            </div>
          )}

          {/* Post Body Content */}
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
            {renderFormattedContent(post.content)}
          </div>

          {/* Post Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center bg-[#07090E] border border-slate-800 rounded-lg p-1 font-mono text-xs">
              <button
                onClick={() => handleVote('POST', post.id, 1)}
                className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  post.user_vote === 1 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-200'
                }`}
              >
                <span>▲</span>
                <span>सम्मति (Accord)</span>
              </button>

              <span className={`px-3 font-bold ${post.score > 0 ? 'text-amber-400' : post.score < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {post.score} पुण्य
              </span>

              <button
                onClick={() => handleVote('POST', post.id, -1)}
                className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  post.user_vote === -1 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                <span>▼</span>
                <span>असम्मति (Dissent)</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <button
                onClick={() => setTippingTarget({
                  address: post.author_address,
                  name: post.author_name || (post.author_address.slice(0, 6) + '...' + post.author_address.slice(-4)),
                  type: 'POST',
                  id: post.id
                })}
                className="px-3 py-1 rounded bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 font-semibold"
                title="Gift NILA (नीला) native coins on Kasturi Chain"
              >
                <span>🎁 दक्षिणा Gift Nīlā</span>
              </button>

              <span className="text-slate-400">
                💬 {post.comments_count} विचाराः (Comments)
              </span>

              <button
                onClick={handleToggleBookmark}
                className={`px-3 py-1 rounded border transition-colors flex items-center gap-1 ${
                  isBookmarked ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#07090E] border-slate-800 text-slate-300 hover:text-amber-300'
                }`}
                title="Save dispatch to bookmarks"
              >
                <span>{isBookmarked ? '🔖 रक्षितम् Saved' : '🔖 संग्रहः Save'}</span>
              </button>

              <button
                onClick={handleShare}
                className="px-3 py-1 rounded bg-[#07090E] border border-slate-800 text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <span>🔗</span>
                <span>सहभाजनम् (Share)</span>
              </button>
            </div>
          </div>

          {/* Admin Moderation Toolbar on Post */}
          {isAdminViewer && (
            <div className="pt-3 border-t border-amber-900/40 flex flex-wrap items-center justify-end gap-2 text-[11px] font-mono">
              <span className="text-amber-400 mr-auto font-semibold">
                ⚖️ Daṇḍanīti (8-Strike Rule):
              </span>
              <button
                onClick={() => handleAdminStrike(post.author_address, 'POST', post.id)}
                className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-300 transition-colors"
                title="Issue 1 Strike (Automatic ban upon 8 strikes)"
              >
                ⚠️ Issue Strike to Author ({post.author_warnings || 0}/8)
              </button>
              <button
                onClick={handleAdminFlagMisinfo}
                className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 transition-colors"
              >
                🚩 Flag Asatya (Falsehood)
              </button>
              <button
                onClick={handleAdminDeletePost}
                className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 transition-colors"
              >
                🗑️ Delete Post
              </button>
              {!post.chain_tx_hash && (
                <button
                  onClick={handleAdminSealPost}
                  className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 transition-colors flex items-center gap-1"
                  title="Anchor dispatch cryptographically onto Kasturi Chain EVM"
                >
                  <span>⬡</span>
                  <span>अङ्कनम् Seal On-Chain</span>
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Comment Section Header & New Comment Box */}
      <section className="bg-[#0B0D13] border border-slate-800/80 rounded-xl p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base sm:text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
            <span>संसदीय-विचार-विमर्शः</span>
            <span className="text-amber-400 text-xs font-mono font-normal">| Dharmic Discourse ({comments.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {userSession ? `संयोजितः: ${userSession.address.slice(0, 6)}...` : 'असंयोजितम् (Not Connected)'}
          </span>
        </div>

        {/* Add comment textarea */}
        <div className="space-y-3">
          <textarea
            rows={3}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={userSession ? "सत्यं वद धर्मं चर — Express your perspective in accord with Dharma..." : "Please connect your MetaMask wallet to contribute to the discourse..."}
            disabled={!userSession}
            className="w-full bg-[#07080B] border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
          />

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-500 font-mono">
              EVM identity • Non-repudiable civilizational karma
            </span>
            <button
              disabled={submitting || !userSession || !newComment.trim()}
              onClick={() => handleAddComment()}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {submitting ? 'प्रसारणम्...' : 'विचारं प्रकाशयतु (Publish Comment)'}
            </button>
          </div>
        </div>

        {/* Comments Tree */}
        <div className="space-y-4 pt-2">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              न कापि टिप्पणी अधुना पर्यन्तम्। प्रथमां टिप्पणीं लिखतु! (No comments yet. Be the first to discourse!)
            </div>
          ) : (
            comments.map(c => renderComment(c))
          )}
        </div>
      </section>

      {/* Nīlā (नीला) Tipping Modal */}
      {tippingTarget && (
        <NilaTipModal
          recipientAddress={tippingTarget.address}
          recipientName={tippingTarget.name}
          targetType={tippingTarget.type}
          targetId={tippingTarget.id}
          onClose={() => setTippingTarget(null)}
          onSuccess={(amount, txHash) => {
            showToast(`Dakṣiṇā of ${amount} Nīlā successfully gifted! Tx: ${txHash.slice(0, 10)}...`);
            setTippingTarget(null);
          }}
        />
      )}
    </div>
  );
};
