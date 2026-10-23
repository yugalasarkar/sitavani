import React from 'react';
import { DisplayLanguage, NewsCategory } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface HeaderProps {
  currentView: 'public' | 'admin';
  onViewChange: (view: 'public' | 'admin') => void;
  language: DisplayLanguage;
  onLanguageChange: (lang: DisplayLanguage) => void;
  pendingCount: number;
  onCategorySelect?: (cat: NewsCategory | 'ALL') => void;
  activeCategory?: NewsCategory | 'ALL';
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  language,
  onLanguageChange,
  pendingCount,
  onCategorySelect,
  activeCategory = 'ALL'
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#07080B]/95 backdrop-blur-md border-b border-amber-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark with sovereign brand styling */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onViewChange('public')}
            className="flex items-center gap-2 text-left group focus-visible:outline-none"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 animate-pulse" />
            <span className="font-brand text-lg sm:text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500">
              SITAVANI <span className="text-amber-500/80 font-normal">|</span> सीतावाणी
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links (clean typography, no pill envelopes) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs uppercase tracking-wider font-medium text-slate-400">
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('ALL');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && activeCategory === 'ALL' ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'समस्त धारा' : 'Live Wire'}
          </button>
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('HERITAGE');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && (activeCategory === 'HERITAGE' || activeCategory === 'MANDIR') ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'वैदिक पुनरुद्धार' : 'Vedic & Heritage'}
          </button>
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('DEFENSE');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && activeCategory === 'DEFENSE' ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'समर्थ भारत' : 'Sovereign Defense'}
          </button>
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('SCIENCE');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && activeCategory === 'SCIENCE' ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'अंतरिक्ष एवं तकनीक' : 'Space & High Tech'}
          </button>
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('GOVERNANCE');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && activeCategory === 'GOVERNANCE' ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'संप्रभु नीति' : 'Sovereign Policy'}
          </button>
          <button
            onClick={() => {
              onViewChange('public');
              onCategorySelect?.('NARRATIVE_FACTS');
            }}
            className={`transition-colors hover:text-amber-400 ${currentView === 'public' && activeCategory === 'NARRATIVE_FACTS' ? 'text-amber-400 font-semibold' : ''}`}
          >
            {language === 'hi' ? 'सत्य तथ्य' : 'Fact vs Myth'}
          </button>
        </nav>

        {/* Zone 3: Primary actions - Language Toggle & Editorial Desk Switch */}
        <div className="flex items-center gap-3">
          {/* Language Selector: Segmented Control */}
          <div className="flex items-center p-0.5 bg-[#0D1017] border border-slate-800 rounded-md">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                language === 'en'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                language === 'hi'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-hindi-serif'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => onLanguageChange('dual')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                language === 'dual'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual
            </button>
          </div>

          {/* Mode Switch: Public Wire vs Editorial Desk */}
          <button
            onClick={() => onViewChange(currentView === 'public' ? 'admin' : 'public')}
            className={`relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
              currentView === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 border-amber-400 font-semibold shadow-sm'
                : 'bg-[#0D1017] text-slate-300 border-amber-900/40 hover:border-amber-600/50 hover:text-amber-300'
            }`}
          >
            <span>{currentView === 'admin' ? 'View Public Wire' : 'Editorial Desk'}</span>
            {pendingCount > 0 && currentView === 'public' && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
