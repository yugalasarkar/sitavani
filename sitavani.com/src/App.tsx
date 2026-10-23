/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BharatShaktiPulse } from './components/BharatShaktiPulse';
import { DailyVedicInsight } from './components/DailyVedicInsight';
import { BharatRenaissanceMap } from './components/BharatRenaissanceMap';
import { FactVsMythDesk } from './components/FactVsMythDesk';
import { LeadHeroStory } from './components/LeadHeroStory';
import { FeaturedGrid } from './components/FeaturedGrid';
import { DispatchWire } from './components/DispatchWire';
import { ArticleModal } from './components/ArticleModal';
import { AdminDesk } from './components/AdminDesk';
import { Footer } from './components/Footer';
import { Article, DisplayLanguage, NewsCategory, FeedStats } from './types';
import { INITIAL_ARTICLES, INITIAL_SOURCES } from './data/initialData';

export default function App() {
  const [currentView, setCurrentView] = useState<'public' | 'admin'>('public');
  const [language, setLanguage] = useState<DisplayLanguage>('dual');
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Public Feed with IPFS static fallback
  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/feed?limit=50');
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API endpoint unavailable, falling back to static IPFS dataset:', err);
    }
    
    // IPFS static fallback
    const approved = INITIAL_ARTICLES.filter(a => a.status === 'APPROVED');
    setArticles(approved);
    setLoading(false);
  };

  // Fetch Feed Stats with IPFS static fallback
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/feed/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        return;
      }
    } catch (err) {
      console.warn('Stats API unavailable, calculating static metrics:', err);
    }

    const approved = INITIAL_ARTICLES.filter(a => a.status === 'APPROVED');
    const pending = INITIAL_ARTICLES.filter(a => a.status === 'PENDING');
    const discarded = INITIAL_ARTICLES.filter(a => a.status === 'DISCARDED');

    setStats({
      total_approved: approved.length,
      total_pending: pending.length,
      total_discarded: discarded.length,
      total_sources: INITIAL_SOURCES.length,
      active_sources: INITIAL_SOURCES.filter(s => s.is_active).length,
      category_counts: {
        HERITAGE: approved.filter(a => a.category === 'HERITAGE').length,
        MANDIR: approved.filter(a => a.category === 'MANDIR').length,
        DEFENSE: approved.filter(a => a.category === 'DEFENSE').length,
        SCIENCE: approved.filter(a => a.category === 'SCIENCE').length,
        SANSKRIT: approved.filter(a => a.category === 'SANSKRIT').length,
        GOVERNANCE: approved.filter(a => a.category === 'GOVERNANCE').length,
        NARRATIVE_FACTS: approved.filter(a => a.category === 'NARRATIVE_FACTS').length,
        GENERAL: approved.filter(a => a.category === 'GENERAL').length,
      },
      last_daemon_run: new Date().toISOString()
    });
  };

  useEffect(() => {
    fetchFeed();
    fetchStats();
  }, []);

  const handleRefreshAll = () => {
    fetchFeed();
    fetchStats();
  };

  // Divide approved articles into 3-tier salience hierarchy (Pattern C)
  const leadArticle = articles.length > 0 ? articles[0] : null;
  const featuredArticles = articles.length > 1 ? articles.slice(1, 3) : [];
  const wireArticles = articles.length > 3 ? articles.slice(3) : articles.slice(1);

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Live Bharat Shakti Pulse Ticker Bar */}
      <BharatShaktiPulse language={language} />

      {/* Sovereign Top Bar */}
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'public') fetchFeed();
        }}
        language={language}
        onLanguageChange={setLanguage}
        pendingCount={stats?.total_pending || 0}
        onCategorySelect={setSelectedCategory}
        activeCategory={selectedCategory}
      />

      {/* Main View Router */}
      {currentView === 'admin' ? (
        <main className="flex-1">
          <AdminDesk
            language={language}
            onRefreshStats={handleRefreshAll}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
          
          {/* Institutional Header & Mission Deck */}
          <div className="mb-10 pb-6 border-b border-amber-950/40 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest font-semibold mb-1.5">
                <span>sitavani.com</span>
                <span aria-hidden="true">·</span>
                <span>{language === 'hi' ? 'धर्म एवं सांस्कृतिक पुनरुत्थान समाचार पीठ' : 'Dharmic & Civilisational Renaissance Wire'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-100 tracking-tight">
                {language === 'hi' ? 'सत्य, शौर्य एवं संप्रभु चेतना' : 'Reclamation, Defense & Vedic High-Tech'}
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-3xl leading-relaxed">
                {language === 'hi'
                  ? 'भारतीय सांस्कृतिक पुनर्जागरण, मंदिर जीर्णोद्धार, स्वदेशी रक्षा शक्ति तथा संस्कृत ज्ञान-विज्ञान की मानव-सत्यापित रपट।'
                  : 'An uncompromised sovereign editorial stream documenting the civilisational renaissance of Bharat through human-in-the-loop verification.'}
              </p>
            </div>

            {/* Live Operational Metrics Ribbon */}
            {stats && (
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 self-start md:self-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Approved Wire</span>
                  <span className="text-amber-400 font-bold tabular-nums text-sm">{stats.total_approved}</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Monitored Feeds</span>
                  <span className="text-slate-200 font-bold tabular-nums text-sm">{stats.active_sources} Active</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Pending Gate</span>
                  <span className="text-amber-500 font-bold tabular-nums text-sm">{stats.total_pending} In Review</span>
                </div>
              </div>
            )}
          </div>

          {/* Daily Vedic Insight Module */}
          <DailyVedicInsight language={language} />

          {loading ? (
            <div className="py-24 text-center font-mono text-amber-400">
              Synchronizing with SITAVANI Sovereign Database...
            </div>
          ) : articles.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-slate-800 rounded-xl bg-[#090B10]">
              <p className="text-base text-slate-300 font-serif">No approved dispatches published yet.</p>
              <button
                onClick={() => setCurrentView('admin')}
                className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs uppercase rounded"
              >
                Go to Editorial Desk to Review Pending Articles
              </button>
            </div>
          ) : (
            <>
              {/* Tier 1 - Dominant Lead Story */}
              {leadArticle && selectedCategory === 'ALL' && (
                <LeadHeroStory
                  article={leadArticle}
                  language={language}
                  onSelect={setSelectedArticle}
                />
              )}

              {/* Tier 2 - Secondary Features Spotlight */}
              {featuredArticles.length > 0 && selectedCategory === 'ALL' && (
                <FeaturedGrid
                  articles={featuredArticles}
                  language={language}
                  onSelect={setSelectedArticle}
                />
              )}

              {/* State-by-State Renaissance Interactive Map */}
              {selectedCategory === 'ALL' && (
                <BharatRenaissanceMap 
                  language={language} 
                  onSelectCategory={setSelectedCategory}
                />
              )}

              {/* Narrative Desk: Fact vs Myth Infographics */}
              {(selectedCategory === 'ALL' || selectedCategory === 'NARRATIVE_FACTS') && (
                <FactVsMythDesk language={language} />
              )}

              {/* Tier 3 - Chronological Wire / Department List */}
              <DispatchWire
                articles={selectedCategory === 'ALL' ? wireArticles : articles}
                language={language}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onSelect={setSelectedArticle}
              />
            </>
          )}

        </main>
      )}

      {/* Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        language={language}
        onClose={() => setSelectedArticle(null)}
      />

      {/* Sovereign Footer */}
      <Footer
        language={language}
        onOpenAdmin={() => setCurrentView('admin')}
      />

    </div>
  );
}
