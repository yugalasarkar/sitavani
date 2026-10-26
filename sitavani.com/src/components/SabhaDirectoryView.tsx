import React, { useState } from 'react';
import { CreateSubSitavaniModal } from './CreateSubSitavaniModal';

export interface SabhaItem {
  slug: string;
  name_sa: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  icon: string;
  color: string;
  is_official: boolean;
  posts_count: number;
}

interface SabhaDirectoryViewProps {
  initialSabhas: SabhaItem[];
}

export const SabhaDirectoryView: React.FC<SabhaDirectoryViewProps> = ({ initialSabhas }) => {
  const [sabhas, setSabhas] = useState<SabhaItem[]>(initialSabhas);
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredSabhas = sabhas.filter(s => {
    const term = filter.toLowerCase();
    return (
      s.name_sa.toLowerCase().includes(term) ||
      s.name_en.toLowerCase().includes(term) ||
      s.name_hi.toLowerCase().includes(term) ||
      s.slug.toLowerCase().includes(term) ||
      s.description_en.toLowerCase().includes(term)
    );
  });

  const handleCreated = (newSabha: any) => {
    setShowCreateModal(false);
    setSabhas(prev => [
      {
        slug: newSabha.slug,
        name_sa: newSabha.name_sa,
        name_en: newSabha.name_en,
        name_hi: newSabha.name_hi,
        description_en: newSabha.description_en,
        description_hi: newSabha.description_hi,
        icon: newSabha.icon || '🏛️',
        color: newSabha.color || '#F59E0B',
        is_official: false,
        posts_count: 0
      },
      ...prev
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Controls Bar: Search & Create Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0E17] border border-amber-950/60 shadow-lg">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Sabhas by name or topic..."
            className="w-full px-3.5 py-2 pl-9 bg-[#07080B] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-sans"
          />
          <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shrink-0"
        >
          <span>✨</span>
          <span>उप-सीतावाणी प्रतिष्ठापयतु Create Sub-Sitavani</span>
        </button>
      </div>

      {/* Grid of Sabhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSabhas.map(s => (
          <div
            key={s.slug}
            className="flex flex-col justify-between p-5 rounded-xl bg-[#0B0E17] border border-slate-800/80 hover:border-amber-500/50 transition-all group relative overflow-hidden"
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
              style={{ backgroundColor: s.color || '#F59E0B' }}
            />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shadow-inner">
                    {s.icon || '🏛️'}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-slate-100 group-hover:text-amber-300 transition-colors text-base">
                      {s.name_sa}
                    </h3>
                    <span className="block text-[11px] font-mono text-slate-400">
                      {s.name_en} · {s.name_hi}
                    </span>
                  </div>
                </div>

                {s.is_official && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Official
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 line-clamp-3 font-sans leading-relaxed">
                {s.description_en}
              </p>

              {s.description_hi && (
                <p className="text-[11px] text-slate-500 line-clamp-2 font-serif border-t border-slate-900 pt-2">
                  {s.description_hi}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60 text-xs">
              <span className="font-mono text-slate-400 text-[11px]">
                💬 <strong className="text-amber-400">{s.posts_count}</strong> Dispatches
              </span>
              <a
                href={`/s/${s.slug}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-colors"
              >
                <span>प्रविशतु Enter</span>
                <span>→</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredSabhas.length === 0 && (
        <div className="text-center py-12 bg-[#0B0E17]/60 border border-slate-800 rounded-xl">
          <p className="text-sm font-mono text-slate-400">No Sabhas matched "{filter}".</p>
        </div>
      )}

      {/* Create Sub-Sitavani Modal */}
      {showCreateModal && (
        <CreateSubSitavaniModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
};
