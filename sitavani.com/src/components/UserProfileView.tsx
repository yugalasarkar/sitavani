import React, { useState } from 'react';
import type { UserProfileData, Post } from '../types';

interface UserProfileViewProps {
  profileData: UserProfileData;
  initialPosts: Post[];
  viewerAddress?: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  profileData: initialData,
  initialPosts,
  viewerAddress
}) => {
  const [profile, setProfile] = useState<UserProfileData>(initialData);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<'submissions' | 'reputation' | 'saved'>('submissions');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  
  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(profile.user.display_name || '');
  const [bioInput, setBioInput] = useState(profile.user.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchSavedPosts = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/social/bookmarks');
      if (res.ok) {
        const data = await res.json();
        setSavedPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSaved(false);
    }
  };

  const isOwner = viewerAddress && viewerAddress.toLowerCase() === profile.user.wallet_address.toLowerCase();
  const isAdmin = profile.user.role === 'ADMIN' || profile.user.wallet_address.toLowerCase() === '0xd22913b647d905d931e4dbbc36b2eecabb78329b';
  const strikes = profile.user.warnings_count || 0;
  const isBanned = profile.user.is_banned;

  // Determine Title Rank
  const karma = profile.user.karma_score || 0;
  let titleRankSa = 'जिज्ञासु';
  let titleRankEn = 'Jijñāsu (Dialectic Seeker)';
  let rankBadgeColor = 'border-slate-700 bg-slate-900 text-slate-300';

  if (isAdmin) {
    titleRankSa = 'आचार्य';
    titleRankEn = 'Ācārya (Sovereign Authority)';
    rankBadgeColor = 'border-amber-500/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300';
  } else if (karma >= 1000) {
    titleRankSa = 'विद्वान्';
    titleRankEn = 'Vidvān (Recognized Scholar)';
    rankBadgeColor = 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300';
  } else if (karma >= 100) {
    titleRankSa = 'साधक';
    titleRankEn = 'Sādhaka (Practitioner)';
    rankBadgeColor = 'border-amber-700 bg-amber-950/30 text-amber-200';
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setEditError(null);

    try {
      const res = await fetch('/api/social/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayNameInput.trim(),
          bio: bioInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfile(prev => ({
        ...prev,
        user: {
          ...prev.user,
          display_name: data.user.display_name,
          bio: data.user.bio
        }
      }));
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header Card */}
      <div className="relative rounded-2xl bg-[#0A0D15] border border-amber-950/40 overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="h-36 sm:h-48 bg-gradient-to-r from-amber-950/60 via-[#121622] to-amber-950/40 relative border-b border-amber-950/30">
          <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
        </div>

        {/* Avatar & Main Details Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0D1019] border-2 border-amber-500/40 shadow-xl flex items-center justify-center text-4xl sm:text-5xl font-serif font-bold text-amber-400 select-none">
                {profile.user.display_name?.slice(0, 1).toUpperCase() || 'ॐ'}
              </div>
              {isAdmin && (
                <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-md" title="Verified Sovereign Authority">
                  ★
                </span>
              )}
            </div>

            {/* Action Button: Edit or Address */}
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>संशोधनम् Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* User Bio & Titles */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-100">
                {profile.user.display_name || profile.user.username}
              </h1>

              {/* Authority Rank Badge */}
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 ${rankBadgeColor}`}>
                <span>{titleRankSa}</span>
                <span className="text-[11px] opacity-80">• {titleRankEn}</span>
              </span>

              {/* 8-Warning Rule Status Badge */}
              {isBanned ? (
                <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs font-mono font-bold animate-pulse">
                  🚫 निष्कासितः Banned (8/8 Strikes)
                </span>
              ) : strikes > 0 ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono">
                  ⚠️ {strikes} of 8 Warnings
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs text-slate-400 select-all break-all">
                {profile.user.wallet_address}
              </p>
              <a
                href={`https://satya.yugala.org/address/${profile.user.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono transition-colors flex items-center gap-1 font-semibold"
                title="Inspect on Satya Sovereign Block Explorer"
              >
                <span>Satya Explorer ↗</span>
              </a>
            </div>

            {profile.user.bio && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl font-sans">
                {profile.user.bio}
              </p>
            )}

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#07090E] border border-slate-800/80">
                <span className="text-slate-500 block text-[11px]">पुण्य Merit (Karma)</span>
                <span className="text-base sm:text-lg font-bold text-amber-300 tabular-nums">
                  {profile.user.karma_score}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#07090E] border border-slate-800/80">
                <span className="text-slate-500 block text-[11px]">नीला Nīlā Gifted</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
                  {profile.tips_received_total} NILA
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#07090E] border border-slate-800/80">
                <span className="text-slate-500 block text-[11px]">प्रकाशनम् Dispatches</span>
                <span className="text-base sm:text-lg font-bold text-slate-200 tabular-nums">
                  {profile.posts_count}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#07090E] border border-slate-800/80">
                <span className="text-slate-500 block text-[11px]">टिप्पण्यः Comments</span>
                <span className="text-base sm:text-lg font-bold text-slate-200 tabular-nums">
                  {profile.comments_count}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-amber-950/40 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📜 प्रकाशनम् Submissions ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reputation')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'reputation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏛️ मण्डल-ख्यातिः Sabha Reputation Matrix</span>
        </button>

        {isOwner && (
          <button
            onClick={() => {
              setActiveTab('saved');
              fetchSavedPosts();
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔖 संग्रहः Saved Dispatches</span>
          </button>
        )}
      </div>

      {/* TAB: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0A0C12] border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
              न कोऽपि लेखः प्रकाशितः अनेन सदस्येन। No dispatches authored by this user yet.
            </div>
          ) : (
            posts.map(p => (
              <div key={p.id} className="p-5 rounded-xl bg-[#0A0C12] border border-amber-950/40 hover:border-amber-800/60 transition-colors space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <a href={`/s/${p.sabha_slug}`} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    s/{p.sabha_slug}
                  </a>
                  <span>•</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{p.score} पुण्य</span>
                  {p.tips_total && p.tips_total > 0 ? (
                    <span className="text-emerald-400 ml-auto font-mono">
                      🎁 {p.tips_total} NILA Gifted
                    </span>
                  ) : null}
                </div>

                <h3 className="font-serif font-bold text-base sm:text-lg text-slate-100 hover:text-amber-300">
                  <a href={`/p/${p.id}`}>{p.title}</a>
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {p.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: SABHA REPUTATION MATRIX */}
      {activeTab === 'reputation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.sabha_reputation.length === 0 ? (
            <div className="sm:col-span-3 p-12 text-center rounded-xl bg-[#0A0C12] border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
              No Sabha-specific reputation accumulated yet. Contribute to community assemblies to earn merit!
            </div>
          ) : (
            profile.sabha_reputation.map(rep => (
              <div key={rep.sabha_slug} className="p-4 rounded-xl bg-[#0A0C12] border border-amber-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-serif font-bold text-sm text-slate-200">
                    <span>{rep.icon}</span>
                    <span>{rep.name_sa}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{rep.score_sum} पुण्य
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                  <span>{rep.name_en}</span>
                  <span>{rep.posts_count} dispatches</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: SAVED DISPATCHES */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {loadingSaved ? (
            <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
              Loading bookmarked dispatches...
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0A0C12] border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
              No saved dispatches found. Click 🔖 on any post to bookmark it for quick access.
            </div>
          ) : (
            savedPosts.map(p => (
              <div key={p.id} className="p-5 rounded-xl bg-[#0A0C12] border border-amber-950/40 hover:border-amber-800/60 transition-colors space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    s/{p.sabha_slug}
                  </span>
                  <span>•</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="ml-auto text-amber-400 font-bold">+{p.score} पुण्य</span>
                </div>
                <a href={`/p/${p.id}`} className="block font-serif font-bold text-base text-slate-100 hover:text-amber-300 transition-colors">
                  {p.title}
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveProfile} className="bg-[#0B0E17] border border-amber-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-serif font-bold text-sm text-slate-100">
                संशोधनम् Edit Sovereign Profile
              </h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {editError && (
              <p className="p-2.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-900 rounded font-mono">
                {editError}
              </p>
            )}

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">नाम Display Name</label>
                <input
                  type="text"
                  maxLength={50}
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">परिचयः Bio / Philosophy (Max 300 chars)</label>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  placeholder="Express your civilizational background, dialectic interest, or scholarship..."
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg"
              >
                विराम Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold uppercase rounded-lg hover:brightness-110 disabled:opacity-50"
              >
                {savingProfile ? 'रक्षणम्...' : 'रक्षतु Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
