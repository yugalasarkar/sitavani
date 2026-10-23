import React, { useState } from 'react';
import { Article, DisplayLanguage, NewsCategory } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface DispatchWireProps {
  articles: Article[];
  language: DisplayLanguage;
  selectedCategory: NewsCategory | 'ALL';
  onCategoryChange: (category: NewsCategory | 'ALL') => void;
  onSelect: (article: Article) => void;
}

export const DispatchWire: React.FC<DispatchWireProps> = ({
  articles,
  language,
  selectedCategory,
  onCategoryChange,
  onSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter(item => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCat;

    const matchesSearch = 
      item.title.toLowerCase().includes(q) ||
      (item.title_hi && item.title_hi.toLowerCase().includes(q)) ||
      item.summary.toLowerCase().includes(q) ||
      item.source_name.toLowerCase().includes(q) ||
      (item.matched_keywords && item.matched_keywords.some(k => k.toLowerCase().includes(q)));

    return matchesCat && matchesSearch;
  });

  const categories: Array<{ id: NewsCategory | 'ALL'; label_en: string; label_hi: string }> = [
    { id: 'ALL', label_en: 'All Streams', label_hi: 'समस्त' },
    { id: 'HERITAGE', label_en: 'Heritage', label_hi: 'विरासत' },
    { id: 'MANDIR', label_en: 'Mandir', label_hi: 'मंदिर' },
    { id: 'DEFENSE', label_en: 'Defense', label_hi: 'रक्षा' },
    { id: 'SCIENCE', label_en: 'Science', label_hi: 'विज्ञान' },
    { id: 'SANSKRIT', label_en: 'Sanskrit', label_hi: 'संस्कृत' },
    { id: 'GENERAL', label_en: 'General', label_hi: 'सामान्य' },
  ];

  return (
    <section className="mb-16">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-amber-950/40">
        <div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-100">
            {language === 'hi' ? 'दैनिक संप्रभु रपट प्रवाह' : 'Chronological Dispatch Ledger'}
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-1">
            {language === 'hi' 
              ? 'मानव-सत्यापित धर्म पुनर्जागरण अभिलेख' 
              : 'Human-verified editorial stream · Cryptographically audited'}
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder={language === 'hi' ? 'खोजें: मंदिर, तेजस, पुरातात्विक...' : 'Filter dispatches, sources, keywords...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0D13] border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Interactive Category Segmented Tabs (Functional Buttons) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {language === 'hi' ? cat.label_hi : cat.label_en}
            </button>
          );
        })}
      </div>

      {/* List of Dispatches */}
      {filteredArticles.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-slate-800 bg-[#0A0C10]">
          <p className="text-sm font-mono text-slate-400">
            {language === 'hi' ? 'इस श्रेणी में कोई समाचार नहीं मिला।' : 'No dispatches found matching the filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 border-t border-b border-slate-800/80">
          {filteredArticles.map((item) => {
            const categoryLabel = CATEGORY_LABELS[item.category];
            const formattedDate = item.approved_at
              ? new Date(item.approved_at).toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recent';

            return (
              <div
                key={item.id}
                className="py-5 group hover:bg-[#0A0D14]/70 px-3 sm:px-4 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div 
                  onClick={() => onSelect(item)}
                  className="flex-1 cursor-pointer space-y-1.5"
                >
                  {/* Clean unboxed metadata with subtle typographic separators */}
                  <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold">{item.source_name}</span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span className="text-slate-300">{language === 'hi' ? categoryLabel.hi : categoryLabel.en}</span>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span className="text-slate-500 tabular-nums">{formattedDate}</span>
                  </div>

                  {/* Headline */}
                  <div>
                    {(language === 'en' || language === 'dual') && (
                      <h4 className="text-base sm:text-lg font-serif font-bold text-slate-100 group-hover:text-amber-300 transition-colors leading-snug">
                        {item.title}
                      </h4>
                    )}
                    {(language === 'hi' || language === 'dual') && (
                      <h4 className={`font-hindi-serif font-semibold text-amber-100 leading-snug ${language === 'dual' ? 'text-sm text-amber-200/80 pt-0.5' : 'text-base sm:text-lg'}`}>
                        {item.title_hi || item.title}
                      </h4>
                    )}
                  </div>

                  {/* Brief summary */}
                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed max-w-3xl">
                    {language === 'hi' ? (item.summary_hi || item.summary) : item.summary}
                  </p>

                  {/* Matched Keywords (unboxed text) */}
                  {item.matched_keywords && item.matched_keywords.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-1">
                      <span>Keywords:</span>
                      {item.matched_keywords.map((kw, i) => (
                        <span key={kw}>
                          {kw}{i < item.matched_keywords!.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:min-w-[130px] pt-1">
                  <a
                    href={item.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-mono text-slate-500 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    <span>{language === 'hi' ? 'मूल स्रोत' : 'Source'}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                  <button
                    onClick={() => onSelect(item)}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {language === 'hi' ? 'विवरण पढ़ें' : 'Read Full →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
