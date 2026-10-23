import React, { useState } from 'react';
import { StateProjectMap, DisplayLanguage, NewsCategory } from '../types';

interface BharatRenaissanceMapProps {
  language: DisplayLanguage;
  onSelectCategory?: (cat: NewsCategory) => void;
}

export const STATE_PROJECTS_DATA: StateProjectMap[] = [
  {
    id: 'state-up',
    state_code: 'UP',
    state_name: 'Uttar Pradesh',
    state_name_hi: 'उत्तर प्रदेश',
    active_projects_count: 14,
    category: 'MANDIR',
    lead_project: 'Kashi Vishwanath Dham & Ayodhya Ram Janmabhoomi Complex',
    lead_project_hi: 'काशी विश्वनाथ धाम एवं अयोध्या राम जन्मभूमि गलियारा',
    description_en: 'Comprehensive heritage reclamation including 108 stone kunds, Mathura Braj Circuit, and Ganga Expressway infrastructure.',
    description_hi: '108 पौराणिक कुण्डों का पुनरुद्धार, मथुरा ब्रज गलियारा एवं गंगा एक्सप्रेसवे का निर्माण।',
    status_badge: 'Consolidated Sanctum'
  },
  {
    id: 'state-tn',
    state_code: 'TN',
    state_name: 'Tamil Nadu',
    state_name_hi: 'तमिलनाडु',
    active_projects_count: 18,
    category: 'HERITAGE',
    lead_project: 'Keeladi Sangam Excavations & Chola Bronze Repatriation',
    lead_project_hi: 'कीलाड़ी उत्खनन एवं चोल कांस्य प्रतिमा वापसी',
    description_en: 'ASI carbon dating establishing 6th century BCE maritime urban civilization and Thanjavur sanctum bronze consecration.',
    description_hi: 'छठी शताब्दी ईसा पूर्व की समुद्री सभ्यता की पुष्टि एवं तंजावुर गर्भगृह में चोल मूर्तियों की पुनर्स्थापना।',
    status_badge: 'ASI Active Site'
  },
  {
    id: 'state-gj',
    state_code: 'GJ',
    state_name: 'Gujarat',
    state_name_hi: 'गुजरात',
    active_projects_count: 12,
    category: 'DEFENSE',
    lead_project: 'Vadhavan Mega Port & Lothal National Maritime Heritage Complex',
    lead_project_hi: 'वाधवन महा बंदरगाह एवं लोथल राष्ट्रीय समुद्री विरासत परिसर',
    description_en: 'World\'s oldest dockyard restoration at Lothal paired with deep-water sovereign container port logistics.',
    description_hi: 'लोथल हड़प्पा बंदरगाह का जीर्णोद्धार एवं विश्व स्तरीय वाधवन गहरे पानी के बंदरगाह का विकास।',
    status_badge: 'Maritime Sovereign Hub'
  },
  {
    id: 'state-or',
    state_code: 'OD',
    state_name: 'Odisha',
    state_name_hi: 'ओडिशा',
    active_projects_count: 9,
    category: 'MANDIR',
    lead_project: 'Puri Srimandir Parikrama Prakalpa & Konark Sun Mandir Heritage',
    lead_project_hi: 'पुरी श्रीमंदिर परिक्रमा प्रकल्प एवं कोणार्क सूर्य मंदिर गलियारा',
    description_en: 'Heritage corridor around Jagannath Temple providing unobstructed pilgrims\' circulation and stone monument preservation.',
    description_hi: 'जगन्नाथ मंदिर के चारों ओर 75 मीटर का भव्य परिक्रमा मार्ग एवं प्राचीन स्थापत्य संरक्षण।',
    status_badge: 'Holy Precinct Restored'
  },
  {
    id: 'state-ka',
    state_code: 'KA',
    state_name: 'Karnataka',
    state_name_hi: 'कर्नाटक',
    active_projects_count: 15,
    category: 'SCIENCE',
    lead_project: 'ISRO Human Spaceflight Centre & HAL Helicopter Complex',
    lead_project_hi: 'इसरो मानव अंतरिक्ष उड़ान केंद्र एवं एचएएल हेलीकॉप्टर कॉम्प्लेक्स',
    description_en: 'Bengaluru space telemetry command control and Tumakuru indigenous defense manufacturing facilities.',
    description_hi: 'बेंगलुरु अंतरिक्ष टेलीमेट्री नियंत्रण केंद्र एवं तुमकुरु में एशिया के सबसे बड़े हेलीकॉप्टर कारखाने का संचालन।',
    status_badge: 'Aero-Space Hub'
  },
  {
    id: 'state-as',
    state_code: 'AS',
    state_name: 'Assam & Northeast',
    state_name_hi: 'असम एवं पूर्वोत्तर',
    active_projects_count: 11,
    category: 'HERITAGE',
    lead_project: 'Kamakhya Corridor & Lachit Borphukan Memorial Precinct',
    lead_project_hi: 'कामाख्या मां कॉरिडोर एवं लाचित बोरफुकन स्मारक क्षेत्र',
    description_en: 'Architectural transformation of Kamakhya Peeth and Brahmaputra riverfront cultural infrastructure.',
    description_hi: 'मां कामाख्या पीठ का दिव्य सौंदर्यीकरण एवं ब्रह्मपुत्र नदी तट सांस्कृतिक बुनियादी ढांचा।',
    status_badge: 'Shakti Peeth Revitalised'
  }
];

export const BharatRenaissanceMap: React.FC<BharatRenaissanceMapProps> = ({ language, onSelectCategory }) => {
  const [selectedState, setSelectedState] = useState<StateProjectMap>(STATE_PROJECTS_DATA[0]);

  return (
    <section className="mb-12 rounded-xl border border-amber-900/30 bg-[#0A0D14] p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-950/40 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase font-semibold">
            <span>🗺️ STATE-BY-STATE RENAISSANCE EXPLORER</span>
            <span aria-hidden="true">·</span>
            <span>sitavani.com</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-100 mt-1">
            {language === 'hi' ? 'भारत सांस्कृतिक एवं तकनीकी पुनरुद्धार मानचित्र' : 'Bharat Cultural & Infrastructure Renaissance Map'}
          </h2>
        </div>

        <div className="text-xs font-mono text-slate-400">
          <span>Active State Hubs: <strong className="text-amber-400">28 States / 8 UTs</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* State Selector Buttons Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
          {STATE_PROJECTS_DATA.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedState(st)}
              className={`p-3 text-left rounded-lg border transition-all text-xs font-mono flex flex-col justify-between min-h-[85px] ${
                selectedState.id === st.id
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-md'
                  : 'bg-[#0E121D] border-slate-800 text-slate-400 hover:border-amber-700/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200">{language === 'hi' ? st.state_name_hi : st.state_name}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-amber-400 font-bold border border-slate-800">
                  {st.state_code}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {st.active_projects_count} Major Projects
              </div>
            </button>
          ))}
        </div>

        {/* Selected State Details Deck */}
        <div className="lg:col-span-7 bg-[#0E121E] border border-amber-950/40 rounded-xl p-6 flex flex-col justify-between min-h-[290px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/40 uppercase font-semibold">
                {selectedState.status_badge}
              </span>
              <span className="text-xs font-mono text-slate-400">
                State ID: {selectedState.state_code}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-100">
              {language === 'hi' ? selectedState.lead_project_hi : selectedState.lead_project}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {language === 'hi' ? selectedState.description_hi : selectedState.description_en}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Verified State Milestone</span>
            </div>
            {onSelectCategory && (
              <button
                onClick={() => onSelectCategory(selectedState.category)}
                className="text-xs font-mono uppercase tracking-wider font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                {language === 'hi' ? 'संबंधित रपट देखें ↗' : 'View Related Pillar ↗'}
              </button>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
