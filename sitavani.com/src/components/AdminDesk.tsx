import React, { useState, useEffect } from 'react';
import { Article, Source, DaemonLog, NewsCategory, DisplayLanguage } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface AdminDeskProps {
  language: DisplayLanguage;
  onRefreshStats?: () => void;
}

export const AdminDesk: React.FC<AdminDeskProps> = ({
  language,
  onRefreshStats
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'daemon' | 'sources' | 'archive'>('pending');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [accessKey, setAccessKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [actingArticleId, setActingArticleId] = useState<string | null>(null);
  
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

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        setAuthenticated(response.ok && data.authenticated === true);
        if (!response.ok) setAuthError(data.error || 'Admin access is not available.');
      })
      .catch(() => {
        if (active) setAuthError('Could not reach the admin service.');
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

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

  // Open Edit Modal
  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditTitleHi(article.title_hi || '');
    setEditSummary(article.summary);
    setEditSummaryHi(article.summary_hi || '');
    setEditCategory(article.category);
    setEditNotes(article.editorial_notes || '');
  };

  // Submit editorial edits for approval; publishing is a separate action.
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

  // Trigger Ingestion Pipeline Run
  const handleTriggerIngest = async () => {
    setRunningIngest(true);
    try {
      await adminRequest('/api/admin/ingest/run', { method: 'POST' });
    } catch (err) {
      setActionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Ingestion is unavailable.' });
    } finally {
      setRunningIngest(false);
    }
  };

  // Toggle Source Active Status
  const handleToggleSource = async (id: number) => {
    try {
      const data = await adminRequest(`/api/admin/sources/${id}/toggle`, { method: 'PATCH' });
      if (data.success) {
        setSources(prev => prev.map(s => s.id === id ? data.source : s));
      }
    } catch (err) {
      setActionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Source update failed.' });
    }
  };

  // Add Source
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceRss) return;

    try {
      const data = await adminRequest('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          base_url: newSourceUrl,
          rss_endpoint: newSourceRss,
          is_active: true
        })
      });
      if (data.success) {
        setSources(prev => [...prev, data.source]);
        setNewSourceName('');
        setNewSourceUrl('');
        setNewSourceRss('');
        setAddingSource(false);
      }
    } catch (err) {
      setActionFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Source could not be added.' });
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Admin sign-in failed.');
      setAuthenticated(true);
      setAccessKey('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Admin sign-in failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' });
    } finally {
      setAuthenticated(false);
      setPendingArticles([]);
      setSources([]);
      setDaemonLogs([]);
    }
  };

  const handleArchiveAction = async (articleId: string, action: 'PUBLISH' | 'UNPUBLISH') => {
    setActingArticleId(articleId);
    setActionFeedback(null);
    try {
      await adminRequest('/api/admin/articles/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, action })
      });
      await fetchArchive();
      setActionFeedback({ kind: 'success', message: action === 'PUBLISH' ? 'Article published.' : 'Article unpublished and returned to approved status.' });
      onRefreshStats?.();
      fetchLogs();
    } catch (error) {
      setActionFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Editorial action failed.' });
    } finally {
      setActingArticleId(null);
    }
  };

  if (checkingSession) {
    return <main className="min-h-screen bg-[#060709] text-amber-300 font-mono grid place-items-center">Checking editorial session…</main>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#060709] text-slate-100 grid place-items-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border border-amber-900/50 bg-[#090B10] p-7 shadow-2xl space-y-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Sitavani · Editorial Access</p>
            <h1 className="mt-2 text-2xl font-serif font-bold">Sign in to the review desk</h1>
            <p className="mt-2 text-sm text-slate-400">Use the server-configured admin access key. It is exchanged for a short-lived, HttpOnly session cookie.</p>
          </div>
          {authError && <p role="alert" className="rounded border border-rose-900/60 bg-rose-950/30 p-3 text-sm text-rose-300">{authError}</p>}
          <label className="block text-xs font-mono text-slate-300" htmlFor="admin-access-key">Admin access key</label>
          <input
            id="admin-access-key"
            type="password"
            autoComplete="current-password"
            required
            value={accessKey}
            onChange={event => setAccessKey(event.target.value)}
            className="w-full rounded border border-slate-700 bg-[#060709] px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
          />
          <button type="submit" className="w-full rounded bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110">Continue</button>
        </form>
      </main>
    );
  }

  return (
    <div className="bg-[#060709] min-h-screen text-slate-100 font-sans pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Top Header of Editorial Desk */}
        <header className="mb-8 border-b border-amber-500/30 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-brand font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                SITAVANI EDITORIAL DESK
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Human-in-the-Loop Sovereign Intelligence Pipeline · Pending Review: <span className="text-amber-400 font-bold tabular-nums">{pendingArticles.length}</span> dispatches
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerIngest}
              disabled
              title="Live feed ingestion has not been connected; no articles will be fabricated."
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              <span>⚙</span>
              <span>Ingestion not configured</span>
            </button>

            <button
              onClick={fetchPending}
              className="px-3 py-2 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 rounded-md text-xs font-mono transition-colors"
            >
              Refresh
            </button>
            <button onClick={handleLogout} className="px-3 py-2 border border-slate-700 text-slate-300 hover:border-rose-700 hover:text-rose-300 rounded-md text-xs font-mono transition-colors">Sign out</button>
          </div>
        </header>

        <p className="mb-6 rounded border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-xs font-mono text-amber-200/80">
          Storage is currently process-local memory. Articles and source settings are not persistent and reset when the server restarts.
        </p>
        {actionFeedback && (
          <p role={actionFeedback.kind === 'error' ? 'alert' : 'status'} className={`mb-6 rounded border px-4 py-3 text-sm ${actionFeedback.kind === 'error' ? 'border-rose-900/60 bg-rose-950/30 text-rose-300' : 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'}`}>
            {actionFeedback.message}
          </p>
        )}

        {/* Tab Navigation: Functional Segmented Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-8 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Approvals</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400">
              {pendingArticles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('daemon')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'daemon'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
              <span>Activity & Ingestion Status</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Configured Sources ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Archive & Ledger</span>
          </button>

        </div>

        {/* TAB 1: PENDING QUEUE */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {loadingPending ? (
              <div className="p-12 text-amber-500 font-mono text-center">
                Loading pending articles...
              </div>
            ) : pendingArticles.length === 0 ? (
              <div className="py-20 text-center rounded-xl border border-dashed border-slate-800 bg-[#0A0C10] p-8">
                <p className="text-slate-400 font-mono text-sm">
                  No articles are awaiting editorial review.
                </p>
                <p className="text-xs text-slate-600 font-mono mt-2">
                  No live feed adapter is configured. The source registry remains available for future setup.
                </p>
              </div>
            ) : (
              pendingArticles.map((item) => {
                const categoryLabel = CATEGORY_LABELS[item.category];

                return (
                  <div
                    key={item.id}
                    className="p-6 rounded-lg border border-slate-800 bg-[#0A0C10] hover:border-amber-500/40 transition-all flex flex-col lg:flex-row gap-6 justify-between items-start"
                  >
                    <div className="flex-1 space-y-3">
                      {/* Clean Unboxed Metadata */}
                      <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-slate-400">
                        <span className="text-amber-400 font-bold uppercase">{item.source_name}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-300">{categoryLabel.en}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-500 tabular-nums">Ingested {new Date(item.created_at).toLocaleTimeString()}</span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <a
                          href={item.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Inspect Source</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>

                      {/* Headlines */}
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-serif font-bold text-slate-100 leading-snug">
                          {item.title}
                        </h3>
                        {item.title_hi && (
                          <h4 className="text-base font-hindi-serif text-amber-200/90 leading-snug">
                            {item.title_hi}
                          </h4>
                        )}
                      </div>

                      {/* Summary */}
                      <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
                        {item.summary}
                      </p>

                      {/* Cryptographic hash & Matched keywords */}
                      <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                        <span>SHA-256: <code className="text-emerald-400/90">{item.url_hash.slice(0, 16)}...</code></span>
                        {item.matched_keywords && item.matched_keywords.length > 0 && (
                          <span>Matched: {item.matched_keywords.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex lg:flex-col gap-2.5 min-w-[170px] w-full lg:w-auto pt-2 lg:pt-0">
                      <button
                        onClick={() => handleAction(item.id, 'APPROVE')}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase px-4 py-2.5 rounded shadow hover:brightness-110 tracking-wider transition-all"
                      >
                        Approve draft
                      </button>

                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 border border-amber-600/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 text-xs font-semibold uppercase px-4 py-2 rounded tracking-wider transition-colors"
                      >
                        Edit & Review
                      </button>

                      <button
                        onClick={() => handleAction(item.id, 'DISCARD')}
                        className="flex-1 border border-rose-900/60 bg-rose-950/20 text-rose-400 text-xs uppercase px-4 py-2 rounded hover:bg-rose-900/40 tracking-wider transition-colors"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: INGESTION STATUS AND ACTIVITY LOG */}
        {activeTab === 'daemon' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg border border-slate-800 bg-[#090B10] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-mono font-bold text-amber-400">
                    Ingestion status
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    No external feeds are fetched in this version. An ingestion adapter must be configured before a run can add articles.
                  </p>
                </div>
                <button
                  onClick={handleTriggerIngest}
                  disabled
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded transition-colors disabled:opacity-50"
                >
                  Ingestion not configured
                </button>
              </div>

              {/* Terminal Logs View */}
              <div className="rounded-lg bg-black border border-slate-800 p-4 font-mono text-xs text-slate-300 h-96 overflow-y-auto space-y-2">
                <div className="text-slate-500 pb-2 border-b border-slate-900 flex justify-between">
                  <span>/var/log/sitavani_ingestion.log</span>
                  <span>{daemonLogs.length} events logged</span>
                </div>
                {daemonLogs.map((log) => (
                  <div key={log.id} className="leading-relaxed flex items-start gap-2">
                    <span className="text-slate-600 tabular-nums">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={
                      log.level === 'SUCCESS' ? 'text-emerald-400' :
                      log.level === 'INGEST' ? 'text-amber-400' :
                      log.level === 'WARN' ? 'text-rose-400' : 'text-slate-400'
                    }>
                      [{log.level}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOURCES REGISTRY */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-100">
                  Configured News Sources
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  RSS endpoints saved for future ingestion setup
                </p>
              </div>
              <button
                onClick={() => setAddingSource(!addingSource)}
                className="px-3.5 py-1.5 border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 rounded text-xs font-mono transition-colors"
              >
                {addingSource ? 'Cancel' : '+ Add Source Endpoint'}
              </button>
            </div>

            {/* Add Source Form */}
            {addingSource && (
              <form onSubmit={handleAddSource} className="p-5 rounded-lg border border-amber-900/40 bg-[#0B0E14] space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Register an RSS endpoint
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Source Name (e.g. Sanskrit Epigraphy Bureau)"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    required
                    className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                  />
                  <input
                    type="url"
                    placeholder="Base Website URL (https://...)"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                  />
                  <input
                    type="url"
                    placeholder="RSS / XML Feed Endpoint URL"
                    value={newSourceRss}
                    onChange={(e) => setNewSourceRss(e.target.value)}
                    required
                    className="bg-[#07080B] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs uppercase rounded hover:bg-amber-400 transition-colors"
                >
                  Save Source in Memory
                </button>
              </form>
            )}

            {/* Sources Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-[#0A0C10]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0F121A] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Source Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell">RSS Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sources.map((s) => (
                    <tr key={s.id} className="hover:bg-[#0E1118]">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {s.name}
                        <div className="text-[11px] text-slate-500 font-normal sm:hidden mt-0.5 truncate max-w-xs">
                          {s.rss_endpoint}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 hidden sm:table-cell truncate max-w-md">
                        {s.rss_endpoint}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 ${s.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          {s.is_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleSource(s.id)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                        >
                          {s.is_active ? 'Pause' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHIVE & LEDGER */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-100">
                  Editorial archive
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Process-local editorial records; changes reset when the server restarts.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-[#0A0C10] p-1 border border-slate-800 rounded-md">
                {(['ALL', 'APPROVED', 'PUBLISHED', 'DISCARDED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setArchiveStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-mono rounded ${
                      archiveStatusFilter === st
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loadingArchive ? (
              <div className="p-8 text-center font-mono text-amber-400">Loading ledger...</div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-[#0A0C10] divide-y divide-slate-800/60">
                {archiveArticles.map(item => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-slate-400">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.status === 'PUBLISHED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                          item.status === 'DISCARDED' ? 'bg-rose-950 text-rose-400 border border-rose-800/50' :
                          'bg-amber-950 text-amber-400 border border-amber-800/50'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-amber-400 font-semibold">{item.source_name}</span>
                        <span>·</span>
                        <span>{item.category}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                      <div className="font-mono text-[11px] text-slate-500">
                        Hash: {item.url_hash}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {item.status === 'APPROVED' && (
                        <button
                          disabled={actingArticleId === item.id}
                          onClick={() => handleArchiveAction(item.id, 'PUBLISH')}
                          className="px-2.5 py-1 text-xs border border-emerald-900/50 text-emerald-400 rounded hover:bg-emerald-900/20 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      {item.status === 'PUBLISHED' && (
                        <button
                          disabled={actingArticleId === item.id}
                          onClick={() => handleArchiveAction(item.id, 'UNPUBLISH')}
                          className="px-2.5 py-1 text-xs border border-rose-900/50 text-rose-400 rounded hover:bg-rose-900/20 disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}
                      <a
                        href={item.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-amber-300 p-1"
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



      </div>

      {/* EDIT & PUBLISH MODAL */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090B10] border border-amber-900/50 rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                Editorial Modification & Publishing Review
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
                  <label className="block text-slate-400 font-mono mb-1">Curatorial Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="Add a source or review note"
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
                Cancel
              </button>
              <button
                onClick={handleUpdateAndApprove}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs uppercase rounded hover:brightness-110"
              >
                Save and approve draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
