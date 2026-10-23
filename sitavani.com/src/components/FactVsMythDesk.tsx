import React from 'react';
import { FactVsMythCard, DisplayLanguage } from '../types';

interface FactVsMythDeskProps {
  language: DisplayLanguage;
}

export const FACT_VS_MYTH_DATA: FactVsMythCard[] = [
  {
    id: 'narrative-01',
    myth_en: '"Bharat\'s financial system is under-banked and cash reliant."',
    myth_hi: '"भारत की वित्तीय प्रणाली असंगठित और पूरी तरह से नकदी पर निर्भर है।"',
    fact_en: 'Bharat leads global real-time digital transactions accounting for 46% of ALL global instant payments (540M+ daily transactions).',
    fact_hi: 'भारत विश्व के कुल 46% वास्तविक समय (Real-Time) डिजिटल भुगतानों का संचालन करता है (प्रतिदिन 54 करोड़+ यूपीआई लेनदेन)।',
    metric_value: '46%',
    metric_label: 'Global Instant Payments Share',
    metric_label_hi: 'वैश्विक डिजिटल भुगतानों में भारत का हिस्सा',
    source_citation: 'World Bank & ACI Worldwide Real-Time Payments Report'
  },
  {
    id: 'narrative-02',
    myth_en: '"Bharat\'s space and tech programs are costly distractions."',
    myth_hi: '"भारत का अंतरिक्ष एवं तकनीक कार्यक्रम अत्यधिक खर्चीला है।"',
    fact_en: 'ISRO\'s Chandrayaan-3 and Aditya-L1 were executed at 1/3rd the cost of Western space missions while achieving 100% precision lunar south pole landing.',
    fact_hi: 'इसरो का चंद्रयान-3 मिशन हॉलीवुड की फिल्मों के बजट से भी कम लागत (₹615 करोड़) में चंद्रमा के दक्षिणी ध्रुव पर सफलतापूर्वक उतरा।',
    metric_value: '1/3rd',
    metric_label: 'Global Mission Cost Ratio',
    metric_label_hi: 'वैश्विक मिशन लागत अनुपात',
    source_citation: 'ISRO Deep Space Operations & Nature Astronomy'
  },
  {
    id: 'narrative-03',
    myth_en: '"Bharat\'s infrastructure growth is sluggish compared to major economies."',
    myth_hi: '"भारत की बुनियादी ढांचा वृद्धि पश्चिमी देशों की तुलना में धीमी है।"',
    fact_en: 'Bharat is building 34 km of high-speed national expressways every single day and has electrified 95%+ of its national railway network.',
    fact_hi: 'भारत प्रतिदिन 34 किलोमीटर नए राष्ट्रीय राजमार्गों का निर्माण कर रहा है तथा रेलवे नेटवर्क का 95%+ विद्युतीकरण पूर्ण हो चुका है।',
    metric_value: '34 km/day',
    metric_label: 'High-Speed Expressway Construction',
    metric_label_hi: 'प्रतिदिन राजमार्ग निर्माण दर',
    source_citation: 'Ministry of Road Transport & NITI Aayog'
  }
];

export const FactVsMythDesk: React.FC<FactVsMythDeskProps> = ({ language }) => {
  return (
    <section className="mb-14 rounded-xl border border-amber-900/30 bg-[#090C12] p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-950/40 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase font-semibold">
            <span>🌐 NARRATIVE DESK: FACT VS MYTH</span>
            <span aria-hidden="true">·</span>
            <span>sitavani.com</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-100 mt-1">
            {language === 'hi' ? 'सत्य तथ्य: भारत विमर्श एवं वैश्विक तुलना' : 'Fact vs. Myth: Reclaiming the Civilisational Narrative'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            {language === 'hi' 
              ? 'पश्चिमी मीडिया के पूर्वाग्रहों को निरस्त करते हुए सत्यापित अंतरराष्ट्रीय आंकड़ों एवं प्रामाणिक आंकड़ों की निष्पक्ष प्रस्तुतियाँ।'
              : 'Countering biased external reporting through verified global indexes, audited financial metrics, and high-precision data.'}
          </p>
        </div>

        <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-300 font-mono text-xs border border-amber-500/30 self-start sm:self-center">
          Data-Driven Veracity
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FACT_VS_MYTH_DATA.map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-amber-950/40 bg-[#0C1019] p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300 group"
          >
            <div className="space-y-4">
              {/* Myth Tag */}
              <div className="space-y-1 bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                <div className="flex items-center justify-between text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">
                  <span>❌ Myth / Biased Trope</span>
                </div>
                <p className="text-xs text-red-200/90 italic font-serif">
                  {language === 'hi' ? card.myth_hi : card.myth_en}
                </p>
              </div>

              {/* Fact Tag */}
              <div className="space-y-2 bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-lg">
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  <span>✅ Verified Fact</span>
                </div>
                <p className="text-xs text-slate-100 font-sans leading-relaxed">
                  {language === 'hi' ? card.fact_hi : card.fact_en}
                </p>
              </div>
            </div>

            {/* Infographic Metric Highlight */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums group-hover:text-amber-200 transition-colors">
                  {card.metric_value}
                </span>
                <span className="block text-[10px] font-mono text-slate-400 uppercase">
                  {language === 'hi' ? card.metric_label_hi : card.metric_label}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 text-right max-w-[120px]">
                {card.source_citation}
              </span>
            </div>

          </div>
        ))}
      </div>
    </section>
  );
};
