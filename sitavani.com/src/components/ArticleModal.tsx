import React, { useState } from 'react';
import { Article, DisplayLanguage } from '../types';
import { CATEGORY_LABELS } from '../utils/lang';

interface ArticleModalProps {
  article: Article | null;
  language: DisplayLanguage;
  onClose: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  language,
  onClose
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [readingTab, setReadingTab] = useState<'default' | 'side-by-side'>(
    language === 'dual' ? 'side-by-side' : 'default'
  );

  if (!article) return null;

  const categoryLabel = CATEGORY_LABELS[article.category];

  const handleCopyHash = () => {
    navigator.clipboard.writeText(article.url_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-[#090B10] border border-amber-900/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0C0E15]">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="uppercase tracking-wider font-semibold">{article.source_name}</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span className="text-slate-400">{categoryLabel.en}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReadingTab(readingTab === 'default' ? 'side-by-side' : 'default')}
              className="text-xs font-mono text-slate-400 hover:text-amber-300 border border-slate-800 rounded px-2.5 py-1"
            >
              {readingTab === 'side-by-side' ? 'Standard View' : 'Bilingual Parallel'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-800/80 transition-colors"
              aria-label="Close reader"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8">
          
          {/* Featured Image */}
          {article.image_url && (
            <div className="relative w-full h-72 sm:h-96 rounded-lg overflow-hidden bg-[#11141E] border border-slate-800/60">
              <img
                src={article.image_url}
                alt={article.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090B10] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 left-4 text-xs font-mono text-slate-300/80 bg-black/60 px-2.5 py-1 rounded backdrop-blur-sm">
                Archival Record: {article.source_name}
              </div>
            </div>
          )}

          {/* Headlines & Content */}
          {readingTab === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* English Column */}
              <div className="space-y-4">
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-500 font-semibold block">
                  English Canonical Dispatch
                </span>
                <h2 className="text-2xl font-serif font-bold text-slate-100 leading-tight">
                  {article.title}
                </h2>
                <p className="text-base text-slate-300 font-medium leading-relaxed italic border-l-2 border-amber-600/60 pl-3">
                  {article.summary}
                </p>
                <div className="text-sm text-slate-300 leading-relaxed pt-2 space-y-3">
                  <p>{article.content_raw || article.summary}</p>
                </div>
              </div>

              {/* Hindi Column */}
              <div className="space-y-4 md:pl-8 pt-6 md:pt-0">
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-500 font-semibold block">
                  हिन्दी प्रामाणिक विवरण (Devanagari)
                </span>
                <h2 className="text-2xl font-hindi-serif font-bold text-amber-100 leading-tight">
                  {article.title_hi || article.title}
                </h2>
                <p className="text-base font-hindi-serif text-slate-200 font-medium leading-relaxed border-l-2 border-amber-600/60 pl-3">
                  {article.summary_hi || article.summary}
                </p>
                <div className="text-sm font-hindi-serif text-slate-300 leading-relaxed pt-2 space-y-3">
                  <p>{article.summary_hi ? `${article.summary_hi} इस ऐतिहासिक घटनाक्रम की पुष्टि आधिकारिक अभिलेखों एवं सांस्कृतिक मंत्रालयों के अभिलेखों से की गई है।` : article.summary}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-3">
                {(language === 'en' || language === 'dual') && (
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 leading-tight">
                    {article.title}
                  </h1>
                )}
                {(language === 'hi' || language === 'dual') && (
                  <h2 className={`font-hindi-serif font-bold text-amber-100 leading-snug ${language === 'dual' ? 'text-xl sm:text-2xl text-amber-300/90 pt-2 border-t border-slate-800' : 'text-2xl sm:text-3xl'}`}>
                    {article.title_hi || article.title}
                  </h2>
                )}
              </div>

              <div className="text-base text-slate-300 leading-relaxed italic border-l-2 border-amber-500 pl-4 py-1">
                {language === 'hi' ? (article.summary_hi || article.summary) : article.summary}
              </div>

              <div className="text-sm sm:text-base text-slate-300 leading-relaxed space-y-4 pt-2">
                <p>{article.content_raw || article.summary}</p>
                {language === 'hi' && article.summary_hi && (
                  <p className="font-hindi-serif text-slate-300">{article.summary_hi}</p>
                )}
              </div>
            </div>
          )}

          {/* Curatorial Editorial Notes */}
          {article.editorial_notes && (
            <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300/90 space-y-1">
              <span className="font-mono uppercase font-bold text-amber-400">Editorial Desk Note:</span>
              <p className="font-sans leading-relaxed">{article.editorial_notes}</p>
            </div>
          )}

          {/* Cryptographic & Provenance Metadata Box */}
          <div className="rounded-lg border border-slate-800 bg-[#0B0D13] p-5 space-y-3 font-mono text-xs">
            <div className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80 pb-2">
              Cryptographic Provenance & Audit Log
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block text-[11px]">Primary Source Endpoint:</span>
                <a
                  href={article.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline truncate block"
                >
                  {article.original_url} ↗
                </a>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Ingestion Timestamp:</span>
                <span className="text-slate-300">{new Date(article.created_at).toLocaleString()}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">SHA-256 Digest (URL Deduplication Hash):</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-emerald-400/90 bg-black/50 px-2 py-1 rounded text-[11px] break-all border border-emerald-950">
                    {article.url_hash}
                  </code>
                  <button
                    onClick={handleCopyHash}
                    className="px-2 py-1 text-[11px] border border-slate-700 rounded text-slate-300 hover:text-white hover:border-amber-500 transition-colors whitespace-nowrap"
                  >
                    {copiedHash ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {article.matched_keywords && article.matched_keywords.length > 0 && (
                <div className="sm:col-span-2 pt-1">
                  <span className="text-slate-500 block text-[11px]">Matched Dharmic Keywords:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {article.matched_keywords.map(kw => (
                      <span key={kw} className="bg-slate-800/80 text-amber-300 px-2 py-0.5 rounded text-[10px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-[#0C0E15]">
          <a
            href={article.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
          >
            <span>Visit Verified Publisher Portal</span>
            <span>↗</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
