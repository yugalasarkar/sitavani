import React, { useState, useEffect } from 'react';
import type { Post, Comment, Sabha } from '../types';

interface ThreadViewProps {
  post: Post;
  initialComments: Comment[];
  sabhas: Sabha[];
}

export const ThreadView: React.FC<ThreadViewProps> = ({ post: initialPost, initialComments, sabhas }) => {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [userSession, setUserSession] = useState<{ address: string; role: string; karma: number } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentSabha = sabhas.find(s => s.slug === post.sabha_slug);
  const isAdminPost = post.author_address.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserSession(data.user);
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
        author_role: userSession.role,
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

  const renderComment = (c: Comment, depth = 0) => {
    const isCommentAdmin = c.author_address.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';
    const isReplying = replyingToId === c.id;

    return (
      <div
        key={c.id}
        className={`mt-4 pt-3 ${depth > 0 ? 'border-l-2 border-amber-900/40 pl-3 sm:pl-4 ml-1 sm:ml-2' : 'border-t border-slate-800/80'}`}
      >
        <div className="flex items-center gap-2 text-xs">
          {/* Author address & role */}
          <span className="font-mono text-slate-300 font-semibold">
            {c.author_name || (c.author_address.slice(0, 6) + '...' + c.author_address.slice(-4))}
          </span>

          {isCommentAdmin ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              ★ SITAVANI Vārtā (आचार्य)
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
              {c.author_role === 'ACARYA' ? 'आचार्य Ācārya' : c.author_role === 'VIDVAN' ? 'विद्वान् Vidvān' : 'जिज्ञासु Jijñāsu'}
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

        {/* Actions: Accord / Dissent / Reply */}
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 font-mono">
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
      {/* Toast */}
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
                <span className="text-slate-200 font-semibold">
                  {post.author_name || (post.author_address.slice(0, 6) + '...' + post.author_address.slice(-4))}
                </span>
              </div>

              {isAdminPost && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold flex items-center gap-1">
                  <span>★</span>
                  <span>SITAVANI Vārtā | आधिकारिक संवाद</span>
                </span>
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

          {/* Post Title */}
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 tracking-wide leading-snug">
            {post.title}
          </h1>

          {/* Original Source Reference if applicable */}
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

          {/* Post Image Media */}
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
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
            {post.content}
          </div>

          {/* Post Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            {/* Accord / Dissent (Voting) */}
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

            {/* Comment count & Share */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                💬 {post.comments_count} विचाराः (Comments)
              </span>

              <button
                onClick={handleShare}
                className="px-3 py-1 rounded bg-[#07090E] border border-slate-800 text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <span>🔗</span>
                <span>सहभाजनम् (Share)</span>
              </button>
            </div>
          </div>
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
    </div>
  );
};
