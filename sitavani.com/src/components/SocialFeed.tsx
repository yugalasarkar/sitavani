import React, { useState, useEffect } from 'react';
import type { Post, Sabha } from '../types';

interface SocialFeedProps {
  initialPosts: Post[];
  sabhas: Sabha[];
  currentSabha?: string;
  currentSort?: 'hot' | 'new' | 'top';
  language?: 'en' | 'hi' | 'dual';
}

export const SocialFeed: React.FC<SocialFeedProps> = ({
  initialPosts,
  sabhas,
  currentSabha = 'all',
  currentSort = 'hot',
  language = 'dual'
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedSabha, setSelectedSabha] = useState<string>(currentSabha);
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>(currentSort);
  const [session, setSession] = useState<{ authenticated: boolean; address?: string; isAdmin?: boolean } | null>(null);
  
  // Post creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSabha, setNewSabha] = useState('varta');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
    const onWalletChange = (e: any) => {
      setSession(e.detail);
      loadPosts(selectedSabha, sort);
    };
    window.addEventListener('sitavani:wallet_changed', onWalletChange);
    return () => window.removeEventListener('sitavani:wallet_changed', onWalletChange);
  }, [selectedSabha, sort]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setSession(data.authenticated ? data : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPosts = async (sabhaSlug: string, sortMode: 'hot' | 'new' | 'top') => {
    try {
      const params = new URLSearchParams();
      if (sabhaSlug !== 'all') params.set('sabha', sabhaSlug);
      params.set('sort', sortMode);
      const res = await fetch(`/api/social/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSabhaChange = (slug: string) => {
    setSelectedSabha(slug);
    loadPosts(slug, sort);
  };

  const handleSortChange = (newSort: 'hot' | 'new' | 'top') => {
    setSort(newSort);
    loadPosts(selectedSabha, newSort);
  };

  const handleVote = async (postId: string, value: 1 | -1) => {
    if (!session?.authenticated) {
      alert('Please connect your MetaMask wallet to cast accord (सम्मति) or dissent (असम्मति).');
      return;
    }

    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const currentVote = p.user_vote || 0;
      let newVote = value;
      let delta = value;

      if (currentVote === value) {
        newVote = 0;
        delta = -value;
      } else if (currentVote !== 0) {
        delta = 2 * value;
      }

      return {
        ...p,
        user_vote: newVote === 0 ? undefined : newVote,
        score: p.score + delta,
        upvotes: newVote === 1 ? p.upvotes + 1 : (currentVote === 1 ? p.upvotes - 1 : p.upvotes),
        downvotes: newVote === -1 ? p.downvotes + 1 : (currentVote === -1 ? p.downvotes - 1 : p.downvotes)
      };
    }));

    try {
      const res = await fetch('/api/social/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'POST', targetId: postId, value })
      });
      if (!res.ok) {
        // Revert on failure
        loadPosts(selectedSabha, sort);
      }
    } catch (e) {
      loadPosts(selectedSabha, sort);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    setPostError(null);

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          sabha_slug: newSabha,
          media_url: newMediaUrl || undefined,
          is_pinned: isPinned
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit dispatch.');
      }

      setNewTitle('');
      setNewContent('');
      setNewMediaUrl('');
      setIsPinned(false);
      setShowCreateModal(false);
      loadPosts(selectedSabha, sort);
    } catch (err: any) {
      setPostError(err?.message || 'Error publishing post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sabhas / Mandalas Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-950">
        <button
          onClick={() => handleSabhaChange('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap border ${
            selectedSabha === 'all'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
              : 'bg-[#0D1017] text-slate-400 border-slate-800 hover:border-amber-900/60 hover:text-slate-200'
          }`}
        >
          सर्वे All Mandalas
        </button>
        {sabhas.map(s => (
          <button
            key={s.slug}
            onClick={() => handleSabhaChange(s.slug)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap border ${
              selectedSabha === s.slug
                ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-sm'
                : 'bg-[#0D1017] text-slate-400 border-slate-800 hover:border-amber-900/60 hover:text-slate-200'
            }`}
          >
            {s.name_sa}
          </button>
        ))}
      </div>

      {/* Sorter & Create Post Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0C12] border border-amber-950/40 rounded-xl p-3">
        {/* Sanskrit Tabs */}
        <div className="flex items-center gap-1.5 bg-[#07090E] p-1 rounded-lg border border-slate-800/80 text-xs font-medium">
          <button
            onClick={() => handleSortChange('hot')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              sort === 'hot' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Hot / Trending Dispatches"
          >
            🔥 लोकप्रिय Lokapriya
          </button>
          <button
            onClick={() => handleSortChange('new')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              sort === 'new' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Recent Submissions"
          >
            ✨ नवीन Navīna
          </button>
          <button
            onClick={() => handleSortChange('top')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              sort === 'top' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Highest Accord Score"
          >
            🏆 श्रेष्ठ Śreṣṭha
          </button>
        </div>

        {/* Create Post Prompt */}
        <button
          onClick={() => {
            if (!session?.authenticated) {
              alert('Please connect your MetaMask wallet to publish.');
              return;
            }
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-lg text-xs font-medium transition-all"
        >
          <span className="font-bold text-sm">+</span>
          <span>प्रकाशनम् Write Dispatch / Post</span>
        </button>
      </div>

      {/* Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1017] border border-amber-900/60 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-950/60 pb-3">
              <h2 className="text-base font-serif font-bold text-amber-300">
                नव प्रकाशनम् · Create Dharmic Dispatch
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
            </div>

            {postError && <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded border border-red-900/50">{postError}</p>}

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">मण्डलम् Sabha / Community</label>
                <select
                  value={newSabha}
                  onChange={e => setNewSabha(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {sabhas.map(s => (
                    <option key={s.slug} value={s.slug}>
                      {s.name_sa} ({s.name_en})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">शीर्षकम् Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Enter scholarly title, dispatch headline or research premise..."
                  className="w-full bg-[#07090E] border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">विवरणम् Content / Exegesis / Text</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Write research text, shastric commentary or primary source citation..."
                  className="w-full bg-[#07090E] border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">दृश्य चित्रम् Media / Image HTTPS URL (Optional)</label>
                <input
                  type="url"
                  value={newMediaUrl}
                  onChange={e => setNewMediaUrl(e.target.value)}
                  placeholder="https://... image or archive URL"
                  className="w-full bg-[#07090E] border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {session?.isAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pin_dispatch"
                    checked={isPinned}
                    onChange={e => setIsPinned(e.target.checked)}
                    className="rounded border-slate-800 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="pin_dispatch" className="text-xs text-amber-300 font-medium">
                    📌 मुखपृष्ठे कीलयतु · Pin as Head Dispatch on Home Page
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-amber-950/60">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 transition-all shadow"
                >
                  {submitting ? 'प्रसारणम्... Publishing...' : 'प्रकाशयतु Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-amber-900/30 bg-[#0A0C12] p-12 text-center space-y-3">
            <p className="font-serif text-lg text-slate-300">न कोऽपि विमर्शः प्राप्तः · No dispatches found in this Mandala</p>
            <p className="text-xs text-slate-500 font-mono">Be the first to publish or select another community.</p>
          </div>
        ) : (
          posts.map(post => {
            const sabha = sabhas.find(s => s.slug === post.sabha_slug);
            const userVote = post.user_vote || 0;
            const authorShort = post.author_address.slice(0, 6) + '...' + post.author_address.slice(-4);
            const formattedDate = new Date(post.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <article
                key={post.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden bg-[#0A0C12] flex items-stretch ${
                  post.is_pinned
                    ? 'border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'border-amber-950/30 hover:border-amber-800/50'
                }`}
              >
                {/* Voting Column (Reddit Style) */}
                <div className="w-14 sm:w-16 bg-[#07090E]/80 border-r border-amber-950/20 p-2 flex flex-col items-center justify-start gap-1">
                  <button
                    onClick={() => handleVote(post.id, 1)}
                    className={`p-1.5 rounded transition-all ${
                      userVote === 1
                        ? 'text-amber-400 bg-amber-500/20 scale-110'
                        : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800/40'
                    }`}
                    title="सम्मति Sammati (Accord / Upvote)"
                  >
                    ▲
                  </button>
                  <span className={`text-xs font-mono font-bold ${
                    userVote === 1 ? 'text-amber-400' : userVote === -1 ? 'text-blue-400' : 'text-slate-300'
                  }`}>
                    {post.score}
                  </span>
                  <button
                    onClick={() => handleVote(post.id, -1)}
                    className={`p-1.5 rounded transition-all ${
                      userVote === -1
                        ? 'text-blue-400 bg-blue-500/20 scale-110'
                        : 'text-slate-500 hover:text-blue-300 hover:bg-slate-800/40'
                    }`}
                    title="असम्मति Asammati (Dissent / Downvote)"
                  >
                    ▼
                  </button>
                </div>

                {/* Post Body */}
                <div className="flex-1 p-4 sm:p-5 space-y-3">
                  {/* Meta Header */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <a
                      href={`/s/${post.sabha_slug}`}
                      className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors font-semibold"
                    >
                      {sabha?.name_sa || `s/${post.sabha_slug}`}
                    </a>
                    <span className="text-amber-700">·</span>

                    {/* Author & Badge */}
                    <span className="text-slate-300">
                      {post.is_official_dispatch ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          सीतावाणी मुख्य सम्पादक (SITAVANI Head Editor)
                        </span>
                      ) : (
                        <span>{authorShort}</span>
                      )}
                    </span>
                    <span className="text-amber-700">·</span>
                    <span className="tabular-nums">{formattedDate}</span>

                    {post.is_pinned && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-gradient-to-r from-amber-500 to-orange-500 text-black">
                        📌 मुख्य वार्ता Pinned Dispatch
                      </span>
                    )}

                    {post.chain_tx_hash && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded" title={`Kasturi Block Hash: ${post.chain_tx_hash}`}>
                        <span>⛓️ कस्तूरी Validated</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-100 hover:text-amber-200 transition-colors">
                    <a href={`/p/${post.id}`}>{post.title}</a>
                  </h2>

                  {/* Media Preview */}
                  {post.media_url && (
                    <div className="rounded-lg overflow-hidden border border-amber-950/40 bg-[#07090E] max-h-96">
                      <img
                        src={post.media_url}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content Preview */}
                  {post.content && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {post.content}
                    </p>
                  )}

                  {/* Post Footer */}
                  <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-xs font-mono text-slate-400">
                    <a
                      href={`/p/${post.id}`}
                      className="flex items-center gap-1.5 hover:text-amber-300 transition-colors py-1"
                    >
                      <span>💬 {post.comments_count} टिप्पण्यः Comments</span>
                    </a>

                    <div className="flex items-center gap-3">
                      {post.original_url && (
                        <a
                          href={post.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-300 transition-colors flex items-center gap-1"
                        >
                          <span>मूल स्रोतः Source ↗</span>
                        </a>
                      )}
                      <a
                        href={`/p/${post.id}`}
                        className="text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        विस्तारः Read Thread →
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
