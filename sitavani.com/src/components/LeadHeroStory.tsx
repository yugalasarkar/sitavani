import React from 'react';
import { Article, DisplayLanguage } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface LeadHeroStoryProps {
  article: Article;
  language: DisplayLanguage;
  onSelect: (article: Article) => void;
}

export const LeadHeroStory: React.FC<LeadHeroStoryProps> = ({
  article,
  language,
  onSelect
}) => {
  const categoryLabel = CATEGORY_LABELS[article.category];
  const formattedDate = article.approved_at 
    ? new Date(article.approved_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recent';

  return (
    <section className="mb-14">
      <div 
        onClick={() => onSelect(article)}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-amber-900/30 bg-[#0A0C12] transition-all duration-300 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
          
          {/* Visual Column: High-fidelity image with measured contrast scrim */}
          <div className="lg:col-span-7 relative min-h-[340px] sm:min-h-[420px] lg:min-h-[480px] overflow-hidden bg-[#0F131C]">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-950/40 via-stone-900 to-black flex items-center justify-center p-8 text-center text-slate-500">
                <span>Dharmic Renaissance Archive</span>
              </div>
            )}
            {/* Scrim overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C12] via-[#0A0C12]/40 to-transparent lg:hidden" />
          </div>

          {/* Editorial Column */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-amber-950/30 bg-[#0A0C12]">
            
            <div className="space-y-4">
              {/* Unboxed clean metadata with typographic separators */}
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-amber-400/90 tracking-wide uppercase">
                <span className="font-semibold text-amber-300">{article.source_name}</span>
                <span aria-hidden="true" className="text-amber-700">·</span>
                <span className="text-slate-400">{language === 'hi' ? categoryLabel.hi : categoryLabel.en}</span>
                <span aria-hidden="true" className="text-amber-700">·</span>
                <span className="text-slate-400 tabular-nums">{formattedDate}</span>
              </div>

              {/* Lead Headline */}
              <div className="space-y-2">
                {(language === 'en' || language === 'dual') && (
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-100 leading-tight group-hover:text-amber-200 transition-colors" style={{ textWrap: 'balance' }}>
                    {article.title}
                  </h2>
                )}
                {(language === 'hi' || language === 'dual') && (
                  <h3 className={`font-hindi-serif font-bold text-amber-100/95 leading-snug ${language === 'dual' ? 'text-lg sm:text-xl text-amber-300/90 border-t border-amber-900/30 pt-2' : 'text-2xl sm:text-3xl lg:text-4xl'}`} style={{ textWrap: 'balance' }}>
                    {article.title_hi || article.title}
                  </h3>
                )}
              </div>

              {/* Summary / Deck */}
              <div className="space-y-2 pt-2">
                {(language === 'en' || language === 'dual') && (
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                    {article.summary}
                  </p>
                )}
                {language === 'hi' && (
                  <p className="text-sm sm:text-base font-hindi-serif text-slate-300 leading-relaxed max-w-xl">
                    {article.summary_hi || article.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Proof & Action */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>SHA-256: {article.url_hash.slice(0, 10)}...</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all">
                {language === 'hi' ? 'विस्तृत रपट ↗' : 'Read Dispatch ↗'}
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
