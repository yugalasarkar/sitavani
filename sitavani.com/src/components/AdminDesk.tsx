import React, { useState, useEffect } from 'react';
import { Article, Source, DaemonLog, NewsCategory, DisplayLanguage, User, ModerationLog } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface AdminDeskProps {
  language: DisplayLanguage;
  onRefreshStats?: () => void;
}

const DESIGNATED_ADMIN_WALLET = '0xD22913B647d905d931E4dbBc36B2EECABB78329b';
const KASTURI_CHAIN_ID = 108108;

export const AdminDesk: React.FC<AdminDeskProps> = ({
  language,
  onRefreshStats
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'daemon' | 'sources' | 'archive' | 'moderation'>('pending');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authAddress, setAuthAddress] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [actingArticleId, setActingArticleId] = useState<string | null>(null);
  
  // Web3 state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState<boolean>(false);
  const [signing, setSigning] = useState<boolean>(false);
  const [showKeyFallback, setShowKeyFallback] = useState<boolean>(false);

  // Pending queue state
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Archive state
  const [archiveArticles, setArchiveArticles] = useState<Article[]>([]);
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'ALL' | 'APPROVED' | 'PUBLISHED' | 'DISCARDED'>('ALL');
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Sources state
  const [sources, setSources] = useState<Source[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceRss, setNewSourceRss] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  // Daemon state
  const [daemonLogs, setDaemonLogs] = useState<DaemonLog[]>([]);
  const [runningIngest, setRunningIngest] = useState(false);

  // Moderation state (8-Warning & Ban System)
  const [flaggedUsers, setFlaggedUsers] = useState<User[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [loadingModeration, setLoadingModeration] = useState(false);
  const [targetWalletInput, setTargetWalletInput] = useState('');
  const [strikeReasonInput, setStrikeReasonInput] = useState('');

  // Edit & Publish Modal state
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTitleHi, setEditTitleHi] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editSummaryHi, setEditSummaryHi] = useState('');
  const [editCategory, setEditCategory] = useState<NewsCategory>('HERITAGE');
  const [editNotes, setEditNotes] = useState('');

  const adminRequest = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { credentials: 'same-origin', ...init });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) setAuthenticated(false);
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  };

  // Check initial session
  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        if (response.ok && data.authenticated === true) {
          setAuthenticated(true);
          setAuthAddress(data.address || DESIGNATED_ADMIN_WALLET);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => {
        if (active) setAuthError('Could not reach the admin authority service.');
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  // Detect MetaMask
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setHasProvider(true);
      const eth = (window as any).ethereum;
      eth.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(() => {});

      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      };
      eth.on('accountsChanged', handleAccounts);
      return () => {
        eth.removeListener('accountsChanged', handleAccounts);
      };
    }
  }, []);

  // Web3: Connect Wallet
  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setAuthError('MetaMask was not detected. Please install the MetaMask browser extension.');
      return;
    }
    setAuthError('');
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to connect MetaMask wallet.');
    }
  };

  // Web3: Sign SIWE Cryptographic Challenge
  const handleMetaMaskSignatureLogin = async () => {
    if (!walletAddress) {
      await handleConnectWallet();
      return;
    }

    if (walletAddress.toLowerCase() !== DESIGNATED_ADMIN_WALLET.toLowerCase()) {
      setAuthError(`Unauthorized wallet: ${walletAddress}. Only designated admin (${DESIGNATED_ADMIN_WALLET}) is permitted.`);
      return;
    }

    setSigning(true);
    setAuthError('');
    try {
      // 1. Get challenge nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(walletAddress)}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok || !nonceData.nonce) {
        throw new Error(nonceData.error || 'Failed to generate authentication challenge.');
      }

      const nonce = nonceData.nonce;
      const challengeMessage = [
        'SITAVANI Sovereign Network Authentication',
        'Sign-In with Kasturi Chain / Ethereum Wallet',
        '',
        `Address: ${walletAddress.toLowerCase()}`,
        `Chain ID: ${KASTURI_CHAIN_ID}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
        '',
        'Notice: Signing this message verifies ownership of your wallet without gas fees or state mutation.'
      ].join('\n');

      // 2. Request signature via MetaMask
      const eth = (window as any).ethereum;
      const signature = await eth.request({
        method: 'personal_sign',
        params: [challengeMessage, walletAddress]
      });

      // 3. Verify on server
      const verifyRes = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          signature,
          nonce
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.authenticated) {
        throw new Error(verifyData.error || 'Cryptographic signature rejected by server.');
      }

      setAuthenticated(true);
      setAuthAddress(walletAddress);
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || 'MetaMask signature authentication failed.');
    } finally {
      setSigning(false);
    }
  };

  // Fallback Key Login
  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const data = await adminRequest('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey })
      });
      if (data.authenticated) {
        setAuthenticated(true);
        setAuthAddress(DESIGNATED_ADMIN_WALLET);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Invalid admin access key.');
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await adminRequest('/api/admin/session', { method: 'DELETE' });
    } finally {
      setAuthenticated(false);
      setAuthAddress(null);
    }
  };

  // Fetch Pending Queue
  const fetchPending = async () => {
    setLoadingPending(true);
    try {
      const data = await adminRequest('/api/admin/articles/pending');
      setPendingArticles(data.articles || []);
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to fetch pending articles.' });
    } finally {
      setLoadingPending(false);
    }
  };

  // Fetch Archive
  const fetchArchive = async () => {
    setLoadingArchive(true);
    try {
      const data = await adminRequest(`/api/admin/articles/all?status=${archiveStatusFilter}`);
      setArchiveArticles(data.articles || []);
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to fetch article archive.' });
    } finally {
      setLoadingArchive(false);
    }
  };

  // Fetch Sources
  const fetchSources = async () => {
    try {
      const data = await adminRequest('/api/admin/sources');
      setSources(data.sources || []);
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to fetch sources.' });
    }
  };

  // Fetch Daemon Logs
  const fetchLogs = async () => {
    try {
      const data = await adminRequest('/api/admin/ingest/logs');
      setDaemonLogs(data.logs || []);
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to fetch ingestion logs.' });
    }
  };

  // Fetch Moderation Data (Users with warnings & Banned users)
  const fetchModerationData = async () => {
    setLoadingModeration(true);
    try {
      const data = await adminRequest('/api/admin/moderation/users');
      setFlaggedUsers(data.users || []);
      setModerationLogs(data.logs || []);
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to fetch moderation data.' });
    } finally {
      setLoadingModeration(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchPending();
    fetchSources();
    fetchLogs();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && activeTab === 'archive') {
      fetchArchive();
    }
    if (authenticated && activeTab === 'moderation') {
      fetchModerationData();
    }
  }, [authenticated, activeTab, archiveStatusFilter]);

  const handleAction = async (id: string, action: 'APPROVE' | 'DISCARD') => {
    setActingArticleId(id);
    setActionFeedback(null);
    try {
      await adminRequest('/api/admin/articles/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: id, action })
      });
      await fetchPending();
      onRefreshStats?.();
      fetchLogs();
    } catch (err) {
      setActionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Editorial action failed.' });
    } finally {
      setActingArticleId(null);
    }
  };

  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditTitleHi(article.title_hi || '');
    setEditSummary(article.summary);
    setEditSummaryHi(article.summary_hi || '');
    setEditCategory(article.category);
    setEditNotes(article.editorial_notes || '');
  };

  const handleUpdateAndApprove = async () => {
    if (!editingArticle) return;
    const id = editingArticle.id;
    setActingArticleId(id);
    setActionFeedback(null);
    try {
      await adminRequest('/api/admin/articles/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: id,
          action: 'UPDATE_AND_APPROVE',
          modified_title: editTitle,
          modified_title_hi: editTitleHi,
          modified_summary: editSummary,
          modified_summary_hi: editSummaryHi,
          category: editCategory,
          editorial_notes: editNotes
        })
      });
      setEditingArticle(null);
      await fetchPending();
      onRefreshStats?.();
      fetchLogs();
    } catch (err) {
      setActionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Article changes could not be saved.' });
    } finally {
      setActingArticleId(null);
    }
  };

  const handleTriggerIngest = async () => {
    setRunningIngest(true);
    setActionFeedback(null);
    try {
      const data = await adminRequest('/api/admin/ingest/trigger', { method: 'POST' });
      setActionFeedback({ kind: 'success', message: data.message || 'Ingestion initiated.' });
      await fetchPending();
      await fetchLogs();
      onRefreshStats?.();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Ingestion trigger failed.' });
    } finally {
      setRunningIngest(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim() || !newSourceRss.trim()) return;
    setAddingSource(true);
    setActionFeedback(null);
    try {
      await adminRequest('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim(),
          rss: newSourceRss.trim()
        })
      });
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceRss('');
      await fetchSources();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Could not add source.' });
    } finally {
      setAddingSource(false);
    }
  };

  const handleToggleSource = async (id: string, active: boolean) => {
    try {
      await adminRequest(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      await fetchSources();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to update source.' });
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Permanently remove this source configuration?')) return;
    try {
      await adminRequest(`/api/admin/sources/${id}`, { method: 'DELETE' });
      await fetchSources();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to delete source.' });
    }
  };

  // Moderation: Issue Strike (1..8)
  const handleIssueStrike = async (wallet: string, reason: string) => {
    if (!wallet.trim() || !reason.trim()) return;
    try {
      const data = await adminRequest('/api/admin/moderation/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet.trim(), reason: reason.trim(), targetType: 'DIRECT' })
      });
      setActionFeedback({ kind: 'success', message: data.message });
      setTargetWalletInput('');
      setStrikeReasonInput('');
      await fetchModerationData();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to issue strike.' });
    }
  };

  // Moderation: Pardon / Unban
  const handlePardonUser = async (wallet: string, resetStrikes: boolean) => {
    try {
      const data = await adminRequest('/api/admin/moderation/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet, resetWarnings: resetStrikes })
      });
      setActionFeedback({ kind: 'success', message: data.message });
      await fetchModerationData();
    } catch (e) {
      setActionFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to unban wallet.' });
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#07090E] text-amber-300 font-mono grid place-items-center">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
          <span>आचार्य-सत्र-परीक्षा (Verifying Editorial Authority Session...)</span>
        </div>
      </main>
    );
  }

  // Cryptographic Web3 MetaMask Login Screen
  if (!authenticated) {
    const isMatchingWallet = walletAddress && walletAddress.toLowerCase() === DESIGNATED_ADMIN_WALLET.toLowerCase();

    return (
      <main className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-amber-900/50 bg-[#0A0D15] p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          <div className="border-b border-amber-950/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <p className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">
                आचार्य पीठम् · SITAVANI
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-serif font-bold text-slate-100">
              Sovereign Editorial Desk
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Cryptographic Web3 SIWE (Sign-In with Ethereum / Kasturi Chain) Authentication.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#07080B] border border-amber-900/40 text-xs font-mono space-y-1.5">
            <div className="text-amber-400/90 font-bold flex items-center gap-1.5">
              <span>🏛️</span>
              <span>अधिकृत-प्रशासक-सञ्चिका (Designated Administrator):</span>
            </div>
            <div className="text-slate-200 break-all select-all font-semibold bg-black/40 p-2 rounded border border-slate-800">
              {DESIGNATED_ADMIN_WALLET}
            </div>
          </div>

          {authError && (
            <p role="alert" className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-mono">
              ⚠ {authError}
            </p>
          )}

          <div className="space-y-4">
            {!hasProvider ? (
              <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs text-rose-300 space-y-2">
                <p className="font-semibold">मत्सञ्चिका न लब्धा (No Web3 Wallet Detected)</p>
                <p className="text-slate-400">
                  Please install MetaMask or a compatible Web3 browser extension to access the sovereign editorial authority.
                </p>
              </div>
            ) : !walletAddress ? (
              <button
                type="button"
                onClick={handleConnectWallet}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all"
              >
                <span>🦊</span>
                <span>मत्सञ्चिकां संयोजयतु (Connect MetaMask Wallet)</span>
              </button>
            ) : !isMatchingWallet ? (
              <div className="p-4 rounded-xl border border-amber-900/50 bg-[#07090E] space-y-3">
                <div className="text-xs font-mono space-y-1">
                  <span className="text-rose-400 font-bold">अनधिकृत-सञ्चिका (Unauthorized Wallet):</span>
                  <div className="text-slate-300 break-all bg-black/40 p-1.5 rounded">{walletAddress}</div>
                </div>
                <p className="text-xs text-slate-400">
                  This wallet does not match the designated Sovereign Administrator address. Please switch accounts in MetaMask.
                </p>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition-colors"
                >
                  खातं परिवर्तयतु (Switch Account in MetaMask)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center justify-between">
                  <span>✓ अधिकृत-सञ्चिका संयोजिता</span>
                  <span className="truncate max-w-[150px]">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>

                <button
                  type="button"
                  disabled={signing}
                  onClick={handleMetaMaskSignatureLogin}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <span>🔒</span>
                  <span>{signing ? 'हस्ताक्षर-सत्यापनम्...' : 'हस्ताक्षरेण प्रमाणीकरोतु (Sign In with MetaMask)'}</span>
                </button>
              </div>
            )}

            <div className="border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setShowKeyFallback(!showKeyFallback)}
                className="text-[11px] font-mono text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <span>{showKeyFallback ? '▼' : '▶'}</span>
                <span>वैकल्पिक-कुञ्जी (Fallback Access Key)</span>
              </button>

              {showKeyFallback && (
                <form onSubmit={handleKeyLogin} className="mt-3 space-y-3">
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter server access key"
                    value={accessKey}
                    onChange={e => setAccessKey(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#060709] px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition-colors"
                  >
                    प्रवेशः (Authenticate via Key)
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Count banned vs in-grace-period users
  const bannedCount = flaggedUsers.filter(u => u.is_banned).length;
  const warnedCount = flaggedUsers.filter(u => !u.is_banned && (u.warnings_count || 0) > 0).length;

  return (
    <div className="bg-[#07090E] min-h-screen text-slate-100 font-sans pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Top Header */}
        <header className="mb-8 border-b border-amber-500/30 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-brand font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                SITAVANI EDITORIAL DESK
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <span>आचार्य पीठम्</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold truncate max-w-[280px]" title={authAddress || DESIGNATED_ADMIN_WALLET}>
                प्रशासकः {authAddress ? `${authAddress.slice(0, 8)}...${authAddress.slice(-6)}` : '0xD229...329b'}
              </span>
              <span>•</span>
              <span>Pending Review: <strong className="text-amber-400 tabular-nums">{pendingArticles.length}</strong> dispatches</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/news"
              target="_blank"
              className="px-3 py-2 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 rounded-md text-xs font-mono transition-colors"
            >
              वार्ता विभाग (Wire ↗)
            </a>
            <button
              onClick={handleTriggerIngest}
              disabled={runningIngest}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              <span>⚙</span>
              <span>{runningIngest ? 'Ingesting...' : 'Run Ingestion'}</span>
            </button>
            <button
              onClick={fetchPending}
              className="px-3 py-2 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 rounded-md text-xs font-mono transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 border border-slate-700 text-slate-300 hover:border-rose-700 hover:text-rose-300 rounded-md text-xs font-mono transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {actionFeedback && (
          <p role={actionFeedback.kind === 'error' ? 'alert' : 'status'} className={`mb-6 rounded-lg border px-4 py-3 text-sm ${actionFeedback.kind === 'error' ? 'border-rose-900/60 bg-rose-950/30 text-rose-300' : 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'}`}>
            {actionFeedback.message}
          </p>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-8 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>स्वीकृति-प्रतीक्षा Pending Approvals</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400">
              {pendingArticles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚖️ दण्डनीति Daṇḍanīti (8-Warning & Ban System)</span>
            {bannedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/30 text-rose-300">
                {bannedCount} Banned
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('daemon')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'daemon'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>स्वचालित-संवाददूतः Ingest Daemon</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>स्रोत-सञ्चयः Information Sources</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>अभिलेखागारम् Editorial Archive</span>
          </button>
        </div>

        {/* TAB: MODERATION & 8-WARNING SYSTEM */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            {/* 8-Warning Rule Overview Banner */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#0C0F17] to-amber-950/10 border border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="font-serif font-bold text-base text-slate-100">
                  अष्ट-चेतावनी-दण्डविधानम् | The 8-Warning Progressive Discipline Rule
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Civilizational truth policy: Any wallet disseminating fabricated assertions, unverified sources, or malice receives formal strikes.
                Upon reaching <strong>8 warnings (8/8 Strikes)</strong>, the wallet is automatically and permanently expelled (निष्कासनम्) from posting, commenting, and voting.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#07090E] border border-slate-800">
                  <div className="text-slate-500">Expelled / Banned Wallets</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{bannedCount}</div>
                  <div className="text-[10px] text-slate-500">8/8 Strikes reached</div>
                </div>
                <div className="p-3 rounded-lg bg-[#07090E] border border-slate-800">
                  <div className="text-slate-500">In Grace Period</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{warnedCount}</div>
                  <div className="text-[10px] text-slate-500">1 to 7 strikes active</div>
                </div>
                <div className="p-3 rounded-lg bg-[#07090E] border border-slate-800">
                  <div className="text-slate-500">Audit Trail Events</div>
                  <div className="text-xl font-bold text-slate-200 mt-1">{moderationLogs.length}</div>
                  <div className="text-[10px] text-slate-500">Immutable log entries</div>
                </div>
              </div>
            </div>

            {/* Direct Strike Form */}
            <div className="bg-[#0B0D13] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="font-serif font-bold text-sm text-slate-200">
                चेतावनी-प्रदानम् (Issue Direct Strike to Wallet)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <input
                  type="text"
                  placeholder="Target Wallet Address (0x...)"
                  value={targetWalletInput}
                  onChange={e => setTargetWalletInput(e.target.value)}
                  className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Stated Reason for Strike"
                  value={strikeReasonInput}
                  onChange={e => setStrikeReasonInput(e.target.value)}
                  className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none sm:col-span-2"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleIssueStrike(targetWalletInput, strikeReasonInput)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase rounded hover:brightness-110"
                >
                  चेतावनीं ददातु (Issue Strike)
                </button>
              </div>
            </div>

            {/* Flagged / Warned / Banned Users Table */}
            <div className="bg-[#0B0D13] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-slate-200">
                  नियन्त्रित-सञ्चिका-तालिका (Enforced Wallets: Warned & Banned)
                </h4>
                <button
                  onClick={fetchModerationData}
                  className="text-xs font-mono text-amber-400 hover:underline"
                >
                  Refresh Data
                </button>
              </div>

              {loadingModeration ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  विवरणस्य आनयनम्... Loading enforcement records...
                </div>
              ) : flaggedUsers.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  सर्वे सदस्याः नियमानुकूलाः। No users currently have active strikes or bans.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {flaggedUsers.map(user => {
                    const strikes = user.warnings_count || 0;
                    return (
                      <div key={user.wallet_address} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-200 select-all">
                              {user.wallet_address}
                            </span>
                            {user.is_banned ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
                                🚫 BANNED (8/8 Strikes)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-semibold">
                                ⚠️ {strikes} of 8 Strikes
                              </span>
                            )}
                          </div>
                          {user.ban_reason && (
                            <p className="text-[11px] text-rose-300/80 font-mono">
                              Reason: {user.ban_reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          {!user.is_banned ? (
                            <>
                              <button
                                onClick={() => {
                                  const r = prompt(`Issue strike to ${user.wallet_address.slice(0, 8)}:`);
                                  if (r) handleIssueStrike(user.wallet_address, r);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px]"
                              >
                                + Strike ({strikes + 1}/8)
                              </button>
                              <button
                                onClick={() => handlePardonUser(user.wallet_address, true)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                              >
                                Reset to 0
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handlePardonUser(user.wallet_address, true)}
                              className="px-3 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-semibold"
                            >
                              ✓ Pardon & Unban
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit Log Table */}
            <div className="bg-[#0B0D13] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="font-serif font-bold text-sm text-slate-200">
                दण्डनीति-लेखागारम् (Moderation Audit Log)
              </h4>
              <div className="bg-[#07080B] rounded-lg p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-2 border border-slate-900">
                {moderationLogs.length === 0 ? (
                  <span className="text-slate-600">न कोऽपि दण्ड-विवरण-लेखः अधुना पर्यन्तम्।</span>
                ) : (
                  moderationLogs.map(log => (
                    <div key={log.id} className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-1 text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">[{log.action_type}]</span>
                        <span>{log.reason || 'No detail'}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: PENDING QUEUE */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {loadingPending ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                स्वीकृति-प्रतीक्षा-सूच्याः आनयनम्... (Loading pending queue...)
              </div>
            ) : pendingArticles.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-2">
                <p className="font-mono text-sm">न कोऽपि लेखः प्रतीक्षायाम् (No articles pending editorial review)</p>
                <p className="text-xs text-slate-600">The ingestion daemon automatically queues relevant dharmic dispatches here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingArticles.map((article) => (
                  <div key={article.id} className="bg-[#0B0D13] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {CATEGORY_LABELS[article.category]?.[language === 'hi' ? 'hi' : 'en'] || article.category}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{article.source_name}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">{new Date(article.published_at).toLocaleString()}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold font-serif text-slate-100">
                        {article.title}
                      </h3>
                      {article.title_hi && (
                        <p className="text-sm font-hindi-serif text-slate-300">{article.title_hi}</p>
                      )}

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {article.summary}
                      </p>

                      <div className="pt-2">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-amber-400/80 hover:text-amber-300 underline"
                        >
                          मूलस्रोत-परीक्षणम् (Verify Source Link ↗)
                        </a>
                      </div>
                    </div>

                    <div className="flex md:flex-col justify-end gap-2 shrink-0">
                      <button
                        disabled={actingArticleId === article.id}
                        onClick={() => openEditModal(article)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono transition-colors"
                      >
                        सम्पाद (Edit)
                      </button>
                      <button
                        disabled={actingArticleId === article.id}
                        onClick={() => handleAction(article.id, 'APPROVE')}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-slate-950 font-mono transition-colors"
                      >
                        स्वीकुरु (Approve)
                      </button>
                      <button
                        disabled={actingArticleId === article.id}
                        onClick={() => handleAction(article.id, 'DISCARD')}
                        className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-xs text-rose-300 font-mono transition-colors"
                      >
                        त्यागः (Discard)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAEMON LOGS */}
        {activeTab === 'daemon' && (
          <div className="space-y-4">
            <div className="bg-[#0B0D13] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold font-mono text-slate-200">
                स्वचालित-संवाददूत-विवरणम् (Ingest Pipeline Execution Logs)
              </h3>
              <div className="bg-[#07080B] rounded-lg p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto space-y-1 border border-slate-900">
                {daemonLogs.length === 0 ? (
                  <span className="text-slate-600">न कोऽपि विवरण-लेखः अधुना।</span>
                ) : (
                  daemonLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={log.level === 'ERROR' ? 'text-rose-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-slate-300'}>
                        [{log.level}] {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSource} className="bg-[#0B0D13] border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold font-serif text-slate-200">
                नूतन-स्रोत-संयोजनम् (Add Ingestion Source)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <input
                  type="text"
                  placeholder="Source Name (e.g. DD India)"
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="Website URL"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="RSS / Atom Feed URL"
                  value={newSourceRss}
                  onChange={e => setNewSourceRss(e.target.value)}
                  className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingSource}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase rounded hover:brightness-110 disabled:opacity-50"
                >
                  {addingSource ? 'संयोजनम्...' : 'स्रोतं योजयतु (Save Source)'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 gap-3">
              {sources.map(src => (
                <div key={src.id} className="bg-[#0B0D13] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-slate-200">{src.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${src.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {src.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 truncate max-w-xl">{src.rss}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleSource(src.id, !src.active)}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {src.active ? 'विराम (Pause)' : 'प्रवर्त्य (Enable)'}
                    </button>
                    <button
                      onClick={() => handleDeleteSource(src.id)}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300"
                    >
                      अपसारय (Delete)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHIVE */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs">
              {(['ALL', 'APPROVED', 'PUBLISHED', 'DISCARDED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setArchiveStatusFilter(st)}
                  className={`px-3 py-1 rounded transition-colors ${archiveStatusFilter === st ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900 text-slate-400'}`}
                >
                  {st}
                </button>
              ))}
            </div>

            {loadingArchive ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                अभिलेखागार-विवरणस्य आनयनम्... (Loading archive...)
              </div>
            ) : archiveArticles.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
                न कोऽपि लेखः अभिलेखागारे।
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {archiveArticles.map(art => (
                  <div key={art.id} className="bg-[#0B0D13] border border-slate-800/80 rounded-xl p-4 flex justify-between items-center gap-4">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-slate-200">{art.title}</h4>
                      <div className="text-[11px] font-mono text-slate-500 flex gap-2 mt-1">
                        <span>{art.category}</span>
                        <span>•</span>
                        <span>{art.status}</span>
                        <span>•</span>
                        <span>{new Date(art.published_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0D13] border border-amber-900/50 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 font-serif">
                लेख-संशोधनम् (Editorial Review & Modification)
              </h3>
              <button onClick={() => setEditingArticle(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Headline (English)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Headline (हिन्दी Hindi Devanagari)</label>
                <input
                  type="text"
                  value={editTitleHi}
                  onChange={(e) => setEditTitleHi(e.target.value)}
                  className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 font-hindi-serif focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Summary Deck (English)</label>
                <textarea
                  rows={3}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Summary Deck (हिन्दी Hindi)</label>
                <textarea
                  rows={3}
                  value={editSummaryHi}
                  onChange={(e) => setEditSummaryHi(e.target.value)}
                  className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 font-hindi-serif focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Dharmic Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as NewsCategory)}
                    className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono"
                  >
                    <option value="HERITAGE">HERITAGE (विरासत)</option>
                    <option value="MANDIR">MANDIR (मंदिर)</option>
                    <option value="DEFENSE">DEFENSE (रक्षा)</option>
                    <option value="SCIENCE">SCIENCE (विज्ञान)</option>
                    <option value="SANSKRIT">SANSKRIT (संस्कृत)</option>
                    <option value="GENERAL">GENERAL (सामान्य)</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
                    <option value="NARRATIVE_FACTS">FACT SHIELD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">Editorial Note</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setEditingArticle(null)}
                className="px-4 py-2 border border-slate-700 text-slate-300 text-xs rounded hover:bg-slate-800"
              >
                विराम (Cancel)
              </button>
              <button
                onClick={handleUpdateAndApprove}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase rounded hover:brightness-110"
              >
                संशोधनं रक्षतु (Save and Approve)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
