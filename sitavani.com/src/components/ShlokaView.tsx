import React, { useState } from 'react';

interface ShlokaViewProps {
  verseSanskrit: string;
  transliterationIast?: string;
  translationEn: string;
  translationHi: string;
  sourceCitation?: string;
}

export const ShlokaView: React.FC<ShlokaViewProps> = ({
  verseSanskrit,
  transliterationIast,
  translationEn,
  translationHi,
  sourceCitation
}) => {
  const [showTranslit, setShowTranslit] = useState(true);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0F131D] via-[#0A0D15] to-[#121622] border border-amber-500/30 p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden text-slate-100">
      {/* Background Sacred Geometric Accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-amber-950/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 animate-pulse"></span>
          <span className="font-serif font-bold text-xs uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">
            श्लोक-विचारः Sacred Verse & Dialectic
          </span>
        </div>
        {sourceCitation && (
          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
            {sourceCitation}
          </span>
        )}
      </div>

      {/* Sanskrit Verse in High Devanagari */}
      <div className="text-center py-2 space-y-2">
        <p className="font-serif text-lg sm:text-xl font-bold text-amber-200 tracking-wider leading-relaxed whitespace-pre-line drop-shadow-sm">
          {verseSanskrit}
        </p>

        {/* IAST Transliteration */}
        {transliterationIast && showTranslit && (
          <p className="font-mono text-xs sm:text-sm text-slate-400 italic pt-1 tracking-wide">
            {transliterationIast}
          </p>
        )}
      </div>

      {/* Side-by-Side Dual Commentary (English & Hindi) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-amber-950/40 text-xs leading-relaxed">
        {/* English Translation */}
        <div className="p-3.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80 space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block">
            English Philosophical Commentary
          </span>
          <p className="text-slate-200 font-sans">
            {translationEn}
          </p>
        </div>

        {/* Hindi Devanagari Translation */}
        <div className="p-3.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80 space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-500/80 block">
            हिन्दी भावार्थ (Hindi Exposition)
          </span>
          <p className="text-slate-200 font-hindi-serif">
            {translationHi}
          </p>
        </div>
      </div>
    </div>
  );
};
