import React, { useState } from 'react';
import { VedicInsight, DisplayLanguage } from '../types';

interface DailyVedicInsightProps {
  language: DisplayLanguage;
}

export const VEDIC_INSIGHTS_DATA: VedicInsight[] = [
  {
    id: 'insight-01',
    verse_sanskrit: 'सं गच्छध्वं सं वदध्वं सं वो मनांसि जानताम्। (ऋग्वेद १०.१९१.२)',
    translation_en: '"Walk together, speak in harmony, let your minds apprehend in unison."',
    translation_hi: '"साथ चलें, एक स्वर में बोलें, और अपने मनों को ज्ञान में एकसूत्र में पिरोएं।"',
    source: 'Rigveda (10.191.2) — Sovereign Unity',
    modern_achievement_en: 'Architectural foundation of Bharat\'s Unified Payments Interface (UPI) and Open Network for Digital Commerce (ONDC), democratising digital economy across 1.4 billion citizens.',
    modern_achievement_hi: 'भारत के यूपीआई (UPI) और ओपन डिजिटल नेटवर्क का वैचारिक आधार, जिसने 140 करोड़ नागरिकों के लिए डिजिटल अर्थव्यवस्था को सुलभ और पारदर्शी बनाया।',
    category: 'Digital Sovereignty'
  },
  {
    id: 'insight-02',
    verse_sanskrit: 'अग्निर्मूर्धा दिवः ककुत्पतिः पृथिव्या अयम्। (ऋग्वेद ८.४४.१६)',
    translation_en: '"Agni is the head of the heavens, the supreme ruler of the Earth below."',
    translation_hi: '"अग्नि आकाश का शीर्ष और संपूर्ण पृथ्वी का संप्रभु स्वामी है।"',
    source: 'Rigveda (8.44.16) — Agni & Aerospace',
    modern_achievement_en: 'Development of Agni-V Intercontinental Ballistic Missile with MIRV technology and ISRO Gaganyaan human spaceflight launch vehicle.',
    modern_achievement_hi: 'एमआईआरवी तकनीक से लैस अग्नि-5 अंतरमहाद्वीपीय बैलिस्टिक मिसाइल और इसरो के मानवयुक्त गगनयान मिशन का सफल विकास।',
    category: 'Strategic Defense & Space'
  },
  {
    id: 'insight-03',
    verse_sanskrit: 'माता भूमिः पुत्रो अहँ पृथिव्याः। (अथर्ववेद १२.१.१२)',
    translation_en: '"Earth is my Mother, I am the son of this Sacred Land."',
    translation_hi: '"यह पवित्र भूमि मेरी माता है, और मैं इस भारत-भूमि का पुत्र हूँ।"',
    source: 'Atharvaveda (12.1.12) — Bhumi Sukta',
    modern_achievement_en: 'Restoration of ancient sacred corridors (Kashi Vishwanath Dham, Ayodhya Ram Mandir, Mahakal Lok) alongside green hydrogen and mega-forest reclamation projects.',
    modern_achievement_hi: 'काशी विश्वनाथ धाम, अयोध्या राम मंदिर एवं महाकाल लोक के कायाकल्प के साथ-साथ हरित हाइड्रोजन एवं राष्ट्रीय पर्यावरण पुनरुद्धार अभियान।',
    category: 'Dharmic & Environmental Heritage'
  }
];

export const DailyVedicInsight: React.FC<DailyVedicInsightProps> = ({ language }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = VEDIC_INSIGHTS_DATA[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % VEDIC_INSIGHTS_DATA.length);
  };

  return (
    <section className="mb-10 rounded-xl border border-amber-900/40 bg-gradient-to-r from-[#0C0F17] via-[#0D121F] to-[#0A0C14] p-5 sm:p-6 shadow-xl relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between gap-4 border-b border-amber-950/40 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-serif text-lg">📜</span>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">
            {language === 'hi' ? 'दैनिक वैदिक सूक्त एवं आधुनिक प्रयोग' : 'DAILY VEDIC INSIGHT & MODERN APPLICATION'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            {currentIndex + 1} / {VEDIC_INSIGHTS_DATA.length}
          </span>
          <button
            onClick={handleNext}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-mono transition-colors"
          >
            {language === 'hi' ? 'अगली सूक्त ➔' : 'Next Insight ➔'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Shastra Verse Column */}
        <div className="lg:col-span-6 space-y-3 border-b lg:border-b-0 lg:border-r border-amber-900/30 pb-4 lg:pb-0 lg:pr-6">
          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] uppercase border border-amber-500/20">
            {current.source}
          </span>
          <h3 className="font-serif-deva text-xl sm:text-2xl font-bold text-amber-200 leading-snug">
            {current.verse_sanskrit}
          </h3>
          <p className="text-sm text-slate-300 italic font-serif leading-relaxed">
            {language === 'hi' ? current.translation_hi : current.translation_en}
          </p>
        </div>

        {/* Modern Application Column */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase font-semibold">
            <span>🚀 Modern Application</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">{current.category}</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {language === 'hi' ? current.modern_achievement_hi : current.modern_achievement_en}
          </p>
        </div>

      </div>

    </section>
  );
};
