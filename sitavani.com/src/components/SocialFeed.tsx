import React, { useState, useEffect } from 'react';
import type { Post, Sabha } from '../types';
import { NilaTipModal } from './NilaTipModal';
import { CreateSubSitavaniModal } from './CreateSubSitavaniModal';

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
  const [sabhasList, setSabhasList] = useState<Sabha[]>(sabhas);
  const [selectedSabha, setSelectedSabha] = useState<string>(currentSabha);
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>(currentSort);
  const [searchQuery, setSearchQuery] = useState('');
  const [session, setSession] = useState<{ authenticated: boolean; address?: string; isAdmin?: boolean; user?: any } | null>(null);
  
  // Post creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSabhaModal, setShowCreateSabhaModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSabha, setNewSabha] = useState('varta');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [tippingPost, setTippingPost] = useState<Post | null>(null);

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
        loadPosts(selectedSabha, sort);
      }
    } catch (e) {
      console.error(e);
      loadPosts(selectedSabha, sort);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.authenticated) {
      setPostError('Please connect your wallet first.');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      setPostError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setPostError(null);

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sabha_slug: newSabha,
          title: newTitle.trim(),
          content: newContent.trim(),
          media_url: newMediaUrl.trim() || undefined,
          is_pinned: session?.isAdmin ? isPinned : false,
          is_official_dispatch: session?.isAdmin ? true : false
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to publish post.');
      }

      const created = await res.json();
      setPosts(prev => [created.post, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setNewMediaUrl('');
      setIsPinned(false);
    } catch (err: any) {
      setPostError(err?.message || 'Publication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- ADMIN MODERATION ACTIONS (दण्डनीति Daṇḍanīti) ---
  const isAdminViewer = session?.isAdmin || session?.address?.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';

  const handleAdminStrike = async (authorAddress: string, postId: string) => {
    const reason = prompt(`Stated reason for issuing a civilizational warning to ${authorAddress.slice(0, 8)}...\n(Notice: 8 accumulated strikes result in an automatic permanent ban):`);
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch('/api/admin/moderation/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: authorAddress,
          reason: reason.trim(),
          targetType: 'POST',
          targetId: postId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue warning strike');
      alert(data.message || `Strike recorded. User now has ${data.warnings_count}/8 strikes.`);
      loadPosts(selectedSabha, sort);
    } catch (err: any) {
      alert(err.message || 'Strike could not be recorded.');
    }
  };

  const handleAdminFlagMisinfo = async (postId: string) => {
    const note = prompt('Enter editorial fact-check clarification / rebuttal note:');
    if (!note || !note.trim()) return;

    try {
      const res = await fetch('/api/admin/moderation/misinformation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, note: note.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to flag misinformation');
      alert('Dispatch marked with Asatya (Falsehood) badge.');
      loadPosts(selectedSabha, sort);
    } catch (err: any) {
      alert(err.message || 'Could not flag misinformation.');
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this dispatch from public view?')) return;
    const reason = prompt('Reason for deletion:', 'Violates civilizational truth standards');

    try {
      const res = await fetch('/api/admin/moderation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'POST', id: postId, reason: reason || 'Purged by Administrator' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post');
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Could not delete post.');
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!session?.authenticated) {
      alert('Please connect your MetaMask wallet to bookmark dispatches.');
      return;
    }
    try {
      const res = await fetch('/api/social/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });
      const data = await res.json();
      alert(data.bookmarked ? '🔖 Dispatch saved to your संग्रहः (Bookmarks)!' : 'Bookmark removed.');
    } catch (e: any) {
      alert('Failed to update bookmark.');
    }
  };

  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.author_name?.toLowerCase().includes(q) ||
      p.sabha_slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Search & Discovery Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="अन्वेषणम् Search dispatches, concepts, or scholars across Sitavani..."
          className="w-full bg-[#0A0C12] border border-amber-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-mono pl-9 transition-colors"
        />
        <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs font-mono"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Top Controls: Sabha Filter Pills & New Post Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0A0C12] border border-amber-950/40">
        {/* Sabha Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-950">
          <button
            onClick={() => handleSabhaChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedSabha === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
            }`}
          >
            सर्वाणि All Sabhas
          </button>
          {sabhasList.map(s => (
            <button
              key={s.slug}
              onClick={() => handleSabhaChange(s.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedSabha === s.slug
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name_sa}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons: New Sabha & New Dispatch */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (!session?.authenticated) {
                alert('Please connect your MetaMask wallet first to establish a Sub-Sitavani Sabha.');
                return;
              }
              setShowCreateSabhaModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-lg transition-all"
            title="Establish new Sub-Sitavani Sabha"
          >
            <span>🏛️</span>
            <span>+ उप-सीतावाणी Sabha</span>
          </button>

          <button
            onClick={() => {
              if (!session?.authenticated) {
                alert('Please connect your MetaMask wallet first to create dispatches.');
                return;
              }
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <span>✍️</span>
            <span>प्रकाशनम् New</span>
          </button>
        </div>
      </div>

      {/* Sorting Tabs: Hot / New / Top */}
      <div className="flex items-center justify-between border-b border-amber-950/40 pb-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">क्रमः Sort:</span>
          {(['hot', 'new', 'top'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleSortChange(mode)}
              className={`px-2.5 py-1 rounded transition-colors ${
                sort === mode
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'hot' && '🔥 लोकप्रिय Lokapriya'}
              {mode === 'new' && '✨ नवीन Navīna'}
              {mode === 'top' && '🏆 श्रेष्ठ Śreṣṭha'}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Showing {posts.length} entries
        </div>
      </div>

      {/* Post Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0E17] border border-amber-900/60 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-serif font-bold text-base text-slate-100 flex items-center gap-2">
                <span>संसद्-प्रकाशनम् Create Community Dispatch</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {postError && (
              <p className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg font-mono">
                {postError}
              </p>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">मण्डल Sabha Assembly</label>
                <select
                  value={newSabha}
                  onChange={e => setNewSabha(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-amber-500"
                >
                  {sabhas.map(s => (
                    <option key={s.slug} value={s.slug}>
                      {s.icon} {s.name_sa} ({s.name_en})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">शीर्षकम् Headline (Truth-focused)</label>
                <input
                  type="text"
                  required
                  placeholder="Accurate, non-sensationalized headline..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-slate-100 text-sm font-sans focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">वृत्तान्तः Body & Citations (Markdown / Text)</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Cite epigraphic, astronomical or primary historical evidence..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-slate-100 text-xs font-sans leading-relaxed focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">चित्र-सङ्केतः Media Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newMediaUrl}
                  onChange={e => setNewMediaUrl(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-amber-500"
                />
              </div>

              {session?.isAdmin && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="pin-post"
                    checked={isPinned}
                    onChange={e => setIsPinned(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <label htmlFor="pin-post" className="text-amber-300 font-bold cursor-pointer">
                    📌 Pin as Official Sovereign Dispatch (आधिकारिक घोषणा)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg"
                >
                  विराम Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold uppercase rounded-lg hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'प्रसारणम् Publishing...' : 'सम्भाष Publish Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed Stream */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#0A0C12] border border-amber-950/40 text-slate-400 space-y-2">
            <p className="font-serif text-lg text-slate-200">न कोऽपि संवादः अस्मिन् मण्डले।</p>
            <p className="text-xs text-slate-500 font-mono">
              {searchQuery ? 'No matching dispatches found for this search.' : 'No discussions found in this Sabha yet. Be the first to discourse!'}
            </p>
          </div>
        ) : (
          filteredPosts.map(post => {
            const sabha = sabhasList.find(s => s.slug === post.sabha_slug);
            const authorShort = post.author_address.slice(0, 6) + '...' + post.author_address.slice(-4);
            const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <article
                key={post.id}
                className={`flex rounded-xl bg-[#0A0C12] border transition-all hover:border-amber-800/60 overflow-hidden shadow-lg ${
                  post.is_pinned
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/20 via-[#0A0C12] to-[#0A0C12]'
                    : post.is_misinformation
                    ? 'border-rose-900/60 bg-rose-950/10'
                    : 'border-amber-950/30'
                }`}
              >
                {/* Left Voting Column */}
                <div className="flex flex-col items-center justify-start p-3 bg-[#080A0F] border-r border-amber-950/30 w-12 sm:w-14 shrink-0 font-mono">
                  <button
                    onClick={() => handleVote(post.id, 1)}
                    className={`p-1 rounded transition-colors ${
                      post.user_vote === 1 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-300'
                    }`}
                    title="सम्मति Sammati (Accord)"
                  >
                    ▲
                  </button>
                  <span className={`text-xs font-bold my-1 ${
                    post.score > 0 ? 'text-amber-400' : post.score < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {post.score}
                  </span>
                  <button
                    onClick={() => handleVote(post.id, -1)}
                    className={`p-1 rounded transition-colors ${
                      post.user_vote === -1 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-rose-400'
                    }`}
                    title="असम्मति Asammati (Dissent)"
                  >
                    ▼
                  </button>
                </div>

                {/* Right Post Body */}
                <div className="flex-grow p-4 sm:p-5 space-y-3">
                  {/* Top Metadata Row */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <a
                      href={`/s/${post.sabha_slug}`}
                      className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors font-semibold"
                    >
                      {sabha?.name_sa || `s/${post.sabha_slug}`}
                    </a>
                    <span className="text-amber-700">·</span>

                    {/* Author & Badge */}
                    <a
                      href={`/u/${post.author_address}`}
                      className="text-slate-300 hover:text-amber-300 transition-colors"
                      title="View Sovereign Profile"
                    >
                      {post.is_official_dispatch ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          सीतावाणी मुख्य सम्पादक (SITAVANI Head Editor)
                        </span>
                      ) : (
                        <span className="hover:underline">{authorShort}</span>
                      )}
                    </a>

                    {/* Author Warnings Bar */}
                    {post.author_warnings && post.author_warnings > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono" title="8 warnings result in permanent account ban">
                        ⚠️ {post.author_warnings}/8 Strikes
                      </span>
                    ) : null}

                    {post.author_is_banned && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono">
                        🚫 BANNED
                      </span>
                    )}

                    <span className="text-amber-700">·</span>
                    <span className="tabular-nums">{formattedDate}</span>

                    {post.is_pinned && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-gradient-to-r from-amber-500 to-orange-500 text-black">
                        📌 मुख्य वार्ता Pinned Dispatch
                      </span>
                    )}

                    {post.chain_tx_hash && (
                      <a
                        href={`https://satya.yugala.org/tx/${post.chain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-800/40 px-2 py-0.5 rounded transition-colors"
                        title={`View on Satya Block Explorer: ${post.chain_tx_hash}`}
                      >
                        <span>⛓️ कस्तूरी Validated ↗</span>
                      </a>
                    )}
                  </div>

                  {/* Misinformation Notice Banner */}
                  {post.is_misinformation && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/70 text-rose-200 text-xs font-mono space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-400">
                        <span>⚠️</span>
                        <span>मिथ्या / असत्य सूचना (Falsehood / Misinformation Notice)</span>
                      </div>
                      <p className="text-slate-300">
                        {post.admin_warning_note || 'This dispatch contains unverified or deceptive assertions rejected by the editorial desk.'}
                      </p>
                    </div>
                  )}

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
                    <div className="flex items-center gap-3">
                      <a
                        href={`/p/${post.id}`}
                        className="flex items-center gap-1.5 hover:text-amber-300 transition-colors py-1"
                      >
                        <span>💬 {post.comments_count} टिप्पण्यः Comments</span>
                      </a>

                      <button
                        onClick={() => setTippingPost(post)}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition-colors text-xs font-semibold"
                        title="Gift NILA (नीला) native coins on Kasturi Chain"
                      >
                        <span>🎁 दक्षिणा Nīlā</span>
                      </button>

                      <button
                        onClick={() => handleToggleBookmark(post.id)}
                        className="flex items-center gap-1 hover:text-amber-300 transition-colors py-1 text-slate-400"
                        title="Save dispatch to bookmarks"
                      >
                        <span>🔖 संग्रहः Save</span>
                      </button>
                    </div>

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

                  {/* Inline Administrative Moderation Toolbar */}
                  {isAdminViewer && (
                    <div className="mt-2 pt-2 border-t border-amber-900/30 flex flex-wrap items-center justify-end gap-2 text-[11px] font-mono">
                      <span className="text-amber-500/80 mr-auto flex items-center gap-1 font-semibold">
                        <span>⚖️ Daṇḍanīti (8-Strike Rule):</span>
                      </span>
                      <button
                        onClick={() => handleAdminStrike(post.author_address, post.id)}
                        className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700/60 transition-colors"
                        title="Issue 1 Strike (Automatic ban on reaching 8 strikes)"
                      >
                        ⚠️ Issue Strike ({post.author_warnings || 0}/8)
                      </button>
                      <button
                        onClick={() => handleAdminFlagMisinfo(post.id)}
                        className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition-colors"
                      >
                        🚩 Flag Asatya (Falsehood)
                      </button>
                      <button
                        onClick={() => handleAdminDeletePost(post.id)}
                        className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/80 transition-colors"
                      >
                        🗑️ Delete Post
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Nīlā (नीला) Tipping Modal */}
      {tippingPost && (
        <NilaTipModal
          recipientAddress={tippingPost.author_address}
          recipientName={tippingPost.author_name}
          targetType="POST"
          targetId={tippingPost.id}
          onClose={() => setTippingPost(null)}
          onSuccess={(amount, txHash) => {
            alert(`Dakṣiṇā of ${amount} Nīlā transferred successfully on Kasturi Chain! Tx: ${txHash.slice(0, 10)}...`);
            setTippingPost(null);
          }}
        />
      )}

      {/* Sub-Sitavani (Upa-Sabha) Creation Modal */}
      {showCreateSabhaModal && (
        <CreateSubSitavaniModal
          onClose={() => setShowCreateSabhaModal(false)}
          onSuccess={(newSabha) => {
            setSabhasList(prev => [...prev, newSabha]);
            setShowCreateSabhaModal(false);
            alert(`Sub-Sitavani Sabha s/${newSabha.slug} successfully established!`);
            window.location.href = `/s/${newSabha.slug}`;
          }}
        />
      )}
    </div>
  );
};
