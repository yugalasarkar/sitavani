import React from 'react';
import { Article, DisplayLanguage } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface FeaturedGridProps {
  articles: Article[];
  language: DisplayLanguage;
  onSelect: (article: Article) => void;
}

export const FeaturedGrid: React.FC<FeaturedGridProps> = ({
  articles,
  language,
  onSelect
}) => {
  if (articles.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-amber-950/40">
        <h3 className="text-sm font-mono tracking-widest uppercase text-amber-500 font-semibold">
          {language === 'hi' ? 'प्रमुख सभ्यतागत उपलब्धियां' : 'Renaissance Focus Dispatches'}
        </h3>
        <span className="text-xs font-mono text-slate-500">
          {articles.length} {language === 'hi' ? 'विशेष रपट' : 'Curated Spotlights'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {articles.map((item) => {
          const categoryLabel = CATEGORY_LABELS[item.category];
          const formattedDate = item.approved_at
            ? new Date(item.approved_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
                month: 'short',
                day: 'numeric'
              })
            : '';

          return (
            <article
              key={item.id}
              onClick={() => onSelect(item)}
              className="group cursor-pointer rounded-xl border border-slate-800/80 bg-[#0B0D13] p-6 hover:border-amber-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Visual Thumbnail */}
                {item.image_url && (
                  <div className="relative h-52 w-full overflow-hidden rounded-lg mb-5 bg-[#12151F]">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-transparent to-transparent opacity-60" />
                  </div>
                )}

                {/* Clean unboxed metadata with typographic separators */}
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2.5">
                  <span className="font-semibold">{item.source_name}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{language === 'hi' ? categoryLabel.hi : categoryLabel.en}</span>
                  {formattedDate && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-500 tabular-nums">{formattedDate}</span>
                    </>
                  )}
                </div>

                {/* Headline */}
                <div className="space-y-1.5">
                  {(language === 'en' || language === 'dual') && (
                    <h4 className="text-xl font-serif font-bold text-slate-100 group-hover:text-amber-200 transition-colors leading-snug">
                      {item.title}
                    </h4>
                  )}
                  {(language === 'hi' || language === 'dual') && (
                    <h4 className={`font-hindi-serif font-semibold text-amber-100 leading-snug ${language === 'dual' ? 'text-sm text-amber-300/80 pt-1' : 'text-xl'}`}>
                      {item.title_hi || item.title}
                    </h4>
                  )}
                </div>

                {/* Summary */}
                <p className="mt-3 text-sm text-slate-400 line-clamp-3 leading-relaxed">
                  {language === 'hi' ? (item.summary_hi || item.summary) : item.summary}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Hash: {item.url_hash.slice(0, 10)}...</span>
                <span className="text-amber-400/90 group-hover:text-amber-300 font-sans font-medium">
                  {language === 'hi' ? 'रपट देखें ↗' : 'View Wire ↗'}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
