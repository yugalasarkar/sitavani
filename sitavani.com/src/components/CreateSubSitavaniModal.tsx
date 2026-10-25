import React, { useState } from 'react';

interface CreateSubSitavaniModalProps {
  onClose: () => void;
  onSuccess: (newSabha: any) => void;
}

export const CreateSubSitavaniModal: React.FC<CreateSubSitavaniModalProps> = ({ onClose, onSuccess }) => {
  const [slug, setSlug] = useState('');
  const [nameSa, setNameSa] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [icon, setIcon] = useState('🏛️');
  const [color, setColor] = useState('#F59E0B');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emojiIcons = ['🏛️', '🕉️', '📜', '⚖️', '🌿', '🔬', '🛡️', '⚡', '🏹', '🎨', '🔥', '🪔'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (!cleanSlug || cleanSlug.length < 2) {
      setError('Slug must be at least 2 alphanumeric characters.');
      return;
    }

    if (!nameSa.trim() || !nameEn.trim() || !nameHi.trim()) {
      setError('Please provide names in Sanskrit, English, and Hindi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/social/sabhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: cleanSlug,
          nameSa: nameSa.trim(),
          nameEn: nameEn.trim(),
          nameHi: nameHi.trim(),
          descriptionEn: descriptionEn.trim(),
          descriptionHi: descriptionHi.trim(),
          icon,
          color
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to establish Sub-Sitavani Sabha.');

      onSuccess(data.sabha);
    } catch (err: any) {
      setError(err?.message || 'Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0E17] border border-amber-900/60 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 className="font-serif font-bold text-base text-slate-100">
              उप-सीतावाणी प्रतिष्ठापनम् • Establish Sub-Sitavani Sabha
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {error && (
          <p className="p-2.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-900 rounded font-mono">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">
              Sabha Identifier / Slug (e.g. s/darshana)
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-900 border border-r-0 border-slate-800 rounded-l-lg text-slate-500 font-mono">
                s/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="darshana"
                className="w-full bg-[#07090E] border border-slate-800 rounded-r-lg p-2 text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">संस्कृत-नाम Sanskrit Title</label>
              <input
                type="text"
                required
                value={nameSa}
                onChange={e => setNameSa(e.target.value)}
                placeholder="दर्शनम् Darśanam"
                className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">English Title</label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="Philosophy & Metaphysics"
                className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">हिन्दी नाम Hindi Title</label>
            <input
              type="text"
              required
              value={nameHi}
              onChange={e => setNameHi(e.target.value)}
              placeholder="दर्शन एवं मीमांसा"
              className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Select Sacred Emblem (Icon)</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {emojiIcons.map(ic => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg border text-base flex items-center justify-center transition-all ${
                    icon === ic ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/10' : 'border-slate-800 bg-[#07090E] hover:border-slate-700'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">English Description / Charter</label>
            <textarea
              rows={2}
              value={descriptionEn}
              onChange={e => setDescriptionEn(e.target.value)}
              placeholder="Charter and scope of dialectic discourse in this assembly..."
              className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              विराम Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold uppercase hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'स्थापयति Establishing...' : 'प्रतिष्ठापयतु Establish Sub-Sitavani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
