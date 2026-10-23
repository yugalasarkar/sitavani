import { Article, Source, NewsCategory } from '../types';

export const INITIAL_SOURCES: Source[] = [
  {
    id: 1,
    name: 'ASI Archaeological Dispatches',
    base_url: 'https://asi.nic.in',
    rss_endpoint: 'https://asi.nic.in/rss/excavations-heritage.xml',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    last_polled_at: '2026-10-01T17:30:00Z',
    articles_count: 14,
  },
  {
    id: 2,
    name: 'ISRO Deep Space Operations',
    base_url: 'https://isro.gov.in',
    rss_endpoint: 'https://isro.gov.in/rss/missions-science.xml',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    last_polled_at: '2026-10-01T17:45:00Z',
    articles_count: 18,
  },
  {
    id: 3,
    name: 'Press Information Bureau (PIB)',
    base_url: 'https://pib.gov.in',
    rss_endpoint: 'https://pib.gov.in/RssMain.aspx?ModId=6',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    last_polled_at: '2026-10-01T17:55:00Z',
    articles_count: 32,
  },
  {
    id: 4,
    name: 'DD News Cultural & National',
    base_url: 'https://ddnews.gov.in',
    rss_endpoint: 'https://ddnews.gov.in/rss/national-heritage.xml',
    is_active: true,
    created_at: '2026-02-01T10:00:00Z',
    last_polled_at: '2026-10-01T17:40:00Z',
    articles_count: 22,
  },
  {
    id: 5,
    name: 'Swarajya Renaissance Desk',
    base_url: 'https://swarajyamag.com',
    rss_endpoint: 'https://swarajyamag.com/rss/heritage-defense.xml',
    is_active: true,
    created_at: '2026-02-10T12:00:00Z',
    last_polled_at: '2026-10-01T17:15:00Z',
    articles_count: 27,
  },
  {
    id: 6,
    name: 'Samskrita Bharati Global Wire',
    base_url: 'https://samskritabharati.in',
    rss_endpoint: 'https://samskritabharati.in/rss/shastras-news.xml',
    is_active: true,
    created_at: '2026-03-01T09:00:00Z',
    last_polled_at: '2026-10-01T16:50:00Z',
    articles_count: 9,
  }
];

export const DHARMIC_KEYWORDS = [
  'temple', 'mandir', 'asi', 'excavation', 'repatriation', 'sanskrit',
  'kashi', 'ayodhya', 'mathura', 'heritage', 'isro', 'drdo', 'tejas',
  'indigenous', 'defense', 'chola', 'shiva', 'brahmanic', 'dharma',
  'antiquities', 'vedic', 'gaganyaan', 'epigraphy', 'hampi', 'shastra'
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-001',
    source_id: 1,
    source_name: 'ASI Archaeological Dispatches',
    url_hash: '9f83a2164e2e4b2c9a3d8f8a4c2e4b2ca5e6f1a8b9c7d0e3f2a1b4c5d6e7f8a9',
    original_url: 'https://asi.nic.in/press/2026/10th-century-chola-bronze-repatriation-met-success',
    title: 'Historic Repatriation: Sacred 10th-Century Chola Bronze Nataraja Restored to Thanjavur Sanctum',
    title_hi: 'ऐतिहासिक वापसी: 10वीं सदी की पवित्र चोल कांस्य नटराज मूर्ति तंजावुर गर्भगृह में पुनर्स्थापित',
    summary: 'Following meticulous provenance documentation and bilateral heritage protocols, the exquisite sacred bronze cast during the reign of Rajaraja I has been officially repatriated and consecrated.',
    summary_hi: 'साक्ष्यों और द्विपक्षीय सांस्कृतिक समझौतों के उपरांत, राजराज प्रथम के काल की दुर्लभ कांस्य नटराज प्रतिमा को औपचारिक रूप से भारत वापस लाकर तंजावुर में पुनर्स्थापित किया गया।',
    content_raw: 'In an unprecedented civilisational triumph for heritage diplomacy, the Ministry of Culture in coordination with the Archaeological Survey of India (ASI) has completed the physical repatriation of the sacred 10th-century Chola bronze icon. The murti, stolen in 1965 from a temple in the Cauvery delta, was authenticated through high-resolution metallurgical resonance and 1956 archival photo documentation from the Institut Français de Pondichéry.',
    image_url: '/src/assets/images/tejas_heritage_bronze_1790903001936.jpg',
    category: 'HERITAGE',
    status: 'APPROVED',
    created_at: '2026-10-01T15:30:00Z',
    approved_at: '2026-10-01T16:00:00Z',
    editorial_notes: 'Verified against ASI National Epigraphy Archive. Clear chain of custody established.',
    matched_keywords: ['chola', 'repatriation', 'heritage', 'asi'],
    salience: 'LEAD',
  },
  {
    id: 'art-002',
    source_id: 5,
    source_name: 'Swarajya Renaissance Desk',
    url_hash: '7c4e1b8a9d0f2e3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    original_url: 'https://swarajyamag.com/heritage/kashi-panchkroshi-ancient-sacred-circuit-restoration',
    title: 'Revival of Ancient Panchkroshi Parikrama: Over 108 Sacred Water Kunds and Stone Shrines Reclaimed',
    title_hi: 'प्राचीन पंचक्रोशी परिक्रमा का पुनरुद्धार: 108 पवित्र जल कुंडों और प्रस्तर मंदिरों का कायाकल्प',
    summary: 'A monumental stone-masonry restoration across the 84-kos sacred perimeter of Kashi revives thousand-year-old pilgrim rest-houses, stepwells, and Shiva shrines without disturbing original Shilpa Shastra geometry.',
    summary_hi: 'काशी के 84-कोस पवित्र परिक्रमा पथ पर 108 से अधिक जलकुंडों और प्राचीन प्रस्तर देवालयों का शिल्पशास्त्र के अनुरूप ऐतिहासिक जीर्णोद्धार पूर्ण किया गया।',
    content_raw: 'The sacred boundary established in the Kashi Khanda of the Skanda Purana has witnessed complete holistic restoration. Using traditional lime-surkhi mortars and Chunar sandstone, master shilpis have restored 108 kunds and ancient dharmashalas along the 50-mile pedestrian circuit.',
    image_url: '/src/assets/images/tejas_mandir_revival_1790902980859.jpg',
    category: 'MANDIR',
    status: 'APPROVED',
    created_at: '2026-10-01T14:15:00Z',
    approved_at: '2026-10-01T15:00:00Z',
    editorial_notes: 'Curated for the Mandir revival column. Cross-referenced with local heritage trust reports.',
    matched_keywords: ['kashi', 'mandir', 'temple', 'shiva', 'dharma'],
    salience: 'FEATURE',
  },
  {
    id: 'art-003',
    source_id: 3,
    source_name: 'Press Information Bureau (PIB)',
    url_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    original_url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2098471',
    title: 'Aeronautical Sovereign Milestone: Indigenous Tejas Mk1A Squadron Inducts Advanced AESA Radar Suite',
    title_hi: 'स्वदेशी वैमानिकी में ऐतिहासिक छलांग: तेजस Mk1A स्क्वाड्रन में उन्नत उत्तम AESA रडार प्रणाली शामिल',
    summary: 'The indigenously engineered Uttam Active Electronically Scanned Array (AESA) radar demonstrates 100% target resolution in high-altitude Himalayan field trials, setting new defense self-reliance benchmarks.',
    summary_hi: 'रक्षा अनुसंधान एवं विकास संगठन (DRDO) द्वारा निर्मित स्वदेशी उत्तम AESA रडार ने हिमालयी परिस्थितियों में लक्ष्य भेदन की उत्कृष्ट क्षमता सिद्ध कर वायुसेना में नया इतिहास रचा।',
    content_raw: 'Marking a decisive leap in sovereign defense manufacturing, the Hindustan Aeronautics Limited (HAL) and DRDO completed formal integration of the indigenous Uttam radar and Electronic Warfare (EW) suite aboard the Light Combat Aircraft (LCA) Tejas Mk1A. The indigenous component value now surpasses 74%.',
    image_url: '/src/assets/images/tejas_defense_aeronautics_1790902992149.jpg',
    category: 'DEFENSE',
    status: 'APPROVED',
    created_at: '2026-10-01T13:00:00Z',
    approved_at: '2026-10-01T13:45:00Z',
    editorial_notes: 'PIB defense dispatch verified. Core highlight of indigenous aeronautical self-reliance.',
    matched_keywords: ['tejas', 'drdo', 'indigenous', 'defense'],
    salience: 'FEATURE',
  },
  {
    id: 'art-004',
    source_id: 2,
    source_name: 'ISRO Deep Space Operations',
    url_hash: '8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    original_url: 'https://isro.gov.in/missions/chandrayaan-sample-return-propulsion-test-complete',
    title: 'ISRO Validates Cryogenic Restart Capabilities for Chandrayaan-4 Lunar Sample Return Trajectory',
    title_hi: 'इसरो ने चंद्रयान-4 चंद्र नमूना वापसी मिशन हेतु क्रायोजेनिक री-स्टार्ट क्षमता का सफल परीक्षण किया',
    summary: 'Engineers at Mahendragiri successfully conduct multi-burn hot tests on the C25 cryogenic stage, proving precision trans-lunar injection maneuvers required to bring lunar soil back to Bharat.',
    summary_hi: 'महेंद्रगिरि में C25 क्रायोजेनिक इंजन के बहु-चरणीय परीक्षण संपन्न हुए, जिससे चंद्रमा से मिट्टी के नमूने पृथ्वी पर सुरक्षित लाने का मार्ग प्रशस्त हुआ।',
    content_raw: 'ISRO Propulsion Complex (IPRC) at Mahendragiri achieved a critical milestone by firing the high-thrust cryogenic engine in multi-ignition vacuum configuration. This ensures sovereign deep space capabilities for upcoming lunar sample return maneuvers.',
    image_url: '/src/assets/images/tejas_science_isro_1790903012028.jpg',
    category: 'SCIENCE',
    status: 'APPROVED',
    created_at: '2026-10-01T11:20:00Z',
    approved_at: '2026-10-01T12:10:00Z',
    editorial_notes: 'High scientific relevance. Grounded in ISRO propulsion milestones.',
    matched_keywords: ['isro', 'science', 'indigenous'],
    salience: 'WIRE',
  },
  {
    id: 'art-005',
    source_id: 6,
    source_name: 'Samskrita Bharati Global Wire',
    url_hash: '3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    original_url: 'https://samskritabharati.in/news/2026/national-manuscripts-digitisation-portal-launches-1-million-shastras',
    title: 'Digital Gyan Bhandar: Over 1.2 Million Rare Sanskrit Palm-Leaf Manuscripts Uploaded to Open Sovereign Repository',
    title_hi: 'डिजिटल ज्ञान भंडार: 12 लाख दुर्लभ संस्कृत ताड़पत्र पांडुलिपियां राष्ट्रीय संप्रभु पोर्टल पर उपलब्ध',
    summary: 'A nationwide consortium of scholars, pandits, and computational linguists deploy AI-assisted optical OCR to index and preserve ancient treatises on mathematics, Ayurveda, astronomy, and metallurgy.',
    summary_hi: 'गणित, आयुर्वेद, खगोलशास्त्र और धातु विज्ञान के प्राचीन ग्रंथों को सुरक्षित करने के लिए 12 लाख पांडुलिपियों का उच्च-विभेदन डिजिटलीकरण पूर्ण हुआ।',
    content_raw: 'The National Mission for Manuscripts in collaboration with Samskrita Bharati and IIT Roorkee has unveiled an open sovereign knowledge repository containing verified transcriptions of over 1.2 million palm-leaf and birch-bark manuscripts.',
    image_url: '/src/assets/images/tejas_heritage_bronze_1790903001936.jpg',
    category: 'SANSKRIT',
    status: 'APPROVED',
    created_at: '2026-10-01T10:00:00Z',
    approved_at: '2026-10-01T10:35:00Z',
    editorial_notes: 'Approved for Sanskrit Revival section. Significant civilisational preservation milestone.',
    matched_keywords: ['sanskrit', 'shastra', 'heritage', 'dharma'],
    salience: 'WIRE',
  },
  {
    id: 'art-006-gov',
    source_id: 3,
    source_name: 'Press Information Bureau (PIB)',
    url_hash: '5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    original_url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2099988',
    title: 'Sovereign Economic Autonomy: Atmanirbhar Bharat Cabinet Package Mandates 80% Local Procurement for Critical Minerals & Defense',
    title_hi: 'संप्रभु आर्थिक स्वायत्तता: केंद्रीय मंत्रिमंडल ने रक्षा एवं दुर्लभ खनिजों हेतु 80% स्वदेशी खरीद अनिवार्य की',
    summary: 'A landmark strategic security directive mandates indigenous processing of rare-earth elements, lithium batteries, and defense microelectronics within Bharat.',
    summary_hi: 'राष्ट्रीय सुरक्षा नीति के तहत लिथियम, दुर्लभ धातुओं और रक्षा इलेक्ट्रॉनिक्स के 80% स्वदेशी प्रसंस्करण को अनिवार्य किया गया।',
    content_raw: 'In a decisive sovereign policy action, the Cabinet Committee on Security approved the Strategic Mineral & Defense Procurement Directive. This ensures 100% supply chain resilience against external geopolitical pressure.',
    image_url: '/src/assets/images/tejas_defense_aeronautics_1790902992149.jpg',
    category: 'GOVERNANCE',
    status: 'APPROVED',
    created_at: '2026-10-01T08:30:00Z',
    approved_at: '2026-10-01T09:15:00Z',
    editorial_notes: 'Sovereign governance policy dispatch. Verified via PIB Cabinet Release.',
    matched_keywords: ['indigenous', 'defense', 'sovereign'],
    salience: 'WIRE',
  },
  {
    id: 'art-007-fact',
    source_id: 5,
    source_name: 'Swarajya Renaissance Desk',
    url_hash: '9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    original_url: 'https://swarajyamag.com/economy/narrative-busting-facts-global-fintech-leader-bharat',
    title: 'Busting Western Media Myths: How Bharat Processed 46% of All Global Real-Time Instant Payments in 2025-2026',
    title_hi: 'पश्चिमी विमर्श का खंडन: भारत ने 2025-26 में दुनिया के 46% रियल-टाइम डिजिटल भुगतानों का अकेले संचालन किया',
    summary: 'Audited data from global financial institutions confirms UPI and ONDC outpaced China and the US combined in public digital transaction scale and zero-cost accessibility.',
    summary_hi: 'अंतरराष्ट्रीय वित्तीय संस्थानों के ऑडिटेड डेटा ने पुष्टि की कि यूपीआई और ओएनडीसी ने चीन और अमेरिका को पछाड़कर दुनिया की सबसे बड़ी डिजिटल अर्थव्यवस्था बनाई।',
    content_raw: 'Data analytics counter western stereotypes regarding financial inclusion in developing nations. Bharat\'s open-protocol public digital infrastructure has achieved 540 million daily transactions, setting global standards in fraud-resilient digital finance.',
    image_url: '/src/assets/images/tejas_science_isro_1790903012028.jpg',
    category: 'NARRATIVE_FACTS',
    status: 'APPROVED',
    created_at: '2026-10-01T07:45:00Z',
    approved_at: '2026-10-01T08:30:00Z',
    editorial_notes: 'Fact vs. Myth narrative verification dispatch. Cross-referenced with World Bank & NPCI reports.',
    matched_keywords: ['upi', 'indigenous', 'science'],
    salience: 'FEATURE',
  },
  {
    id: 'art-006',
    source_id: 4,
    source_name: 'DD News Cultural & National',
    url_hash: '5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
    original_url: 'https://ddnews.gov.in/cultural/ayush-traditional-botanical-pharmacopeia-who-standardization',
    title: 'Global Validation: WHO Pharmacopeia Formally Integrates 240 Ancient Classical Ayurvedic Formulations',
    title_hi: 'वैश्विक मान्यता: विश्व स्वास्थ्य संगठन (WHO) द्वारा 240 प्राचीन आयुर्वेदिक योगों का मानकीकरण स्वीकृत',
    summary: 'Rigorous clinical and phytochemical monographs based on Charaka and Sushruta Samhitas achieve international pharmacopeial recognition, opening sovereign wellness exports.',
    summary_hi: 'चरक एवं सुश्रुत संहिताओं पर आधारित पारंपरिक वनस्पतियों और योगों को अंतरराष्ट्रीय मानकों के अनुरूप वैश्विक स्वीकृति प्राप्त हुई।',
    content_raw: 'The World Health Organization traditional medicine centre has adopted standard monographs for classical formulations, affirming their therapeutic efficacy and biochemical safety profile.',
    image_url: '/src/assets/images/tejas_mandir_revival_1790902980859.jpg',
    category: 'GENERAL',
    status: 'APPROVED',
    created_at: '2026-10-01T09:10:00Z',
    approved_at: '2026-10-01T09:50:00Z',
    editorial_notes: 'Verified against Ministry of Ayush bulletins.',
    matched_keywords: ['dharma', 'indigenous', 'heritage'],
    salience: 'WIRE',
  },

  // PENDING ARTICLES (Awaiting Human-in-the-Loop Editorial Decision in Desk)
  {
    id: 'art-pend-001',
    source_id: 1,
    source_name: 'ASI Archaeological Dispatches',
    url_hash: '8a3d8f8a4c2e4b2c9a3d8f8a4c2e4b2ca5e6f1a8b9c7d0e3f2a1b4c5d6e7f8b1',
    original_url: 'https://asi.nic.in/excavations/2026/hampi-submerged-shiva-temple-complex-unveiled',
    title: 'Underwater Ground Penetrating Radar Reveals Submerged 7th-Century Shiva Shrine Complex at Tungabhadra Basin, Hampi',
    title_hi: 'हम्पी की तुंगभद्रा नदी तल में जलमग्न 7वीं सदी के प्राचीन शिव मंदिर परिसर के अवशेष रडार द्वारा खोजे गए',
    summary: 'ASI marine archaeology wing reports discovery of monolithic stone pillar bases and Nandi mandapa submerged under sand dunes near the Vijayanagara riverbank.',
    summary_hi: 'भारतीय पुरातत्व सर्वेक्षण (ASI) की जल पुरातत्व शाखा ने तुंगभद्रा के तट पर प्राचीन प्रस्तर स्तंभों और नंदी मंडप के ऐतिहासिक अवशेष खोजे हैं।',
    content_raw: 'Detailed sonar profiling and deep silt excavation by the ASI Archaeological Wing at Hampi have uncovered a previously uncatalogued multi-tiered granite shrine dating to the Badami Chalukyan era. The sanctum features archaic Sanskrit inscriptions praising Lord Virupaksha.',
    image_url: '/src/assets/images/tejas_mandir_revival_1790902980859.jpg',
    category: 'HERITAGE',
    status: 'PENDING',
    created_at: '2026-10-01T17:10:00Z',
    approved_at: null,
    editorial_notes: null,
    matched_keywords: ['asi', 'excavation', 'temple', 'shiva', 'hampi'],
    salience: 'WIRE',
  },
  {
    id: 'art-pend-002',
    source_id: 5,
    source_name: 'Swarajya Renaissance Desk',
    url_hash: '9b4e6a8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a',
    original_url: 'https://swarajyamag.com/defense/drdo-hypersonic-glide-vehicle-su-30mki-flight-integration',
    title: 'DRDO Achieves Captive Flight Validation of Hypersonic Technology Demonstrator Vehicle (HSTDV)',
    title_hi: 'डीआरडीओ ने हाइपरसोनिक प्रौद्योगिकी प्रदर्शन वाहन (HSTDV) का सफल उड़ान परीक्षण संपन्न किया',
    summary: 'Indigenously developed scramjet propulsion sustains Mach 6.5 velocity profile over the Bay of Bengal, solidifying sovereign deterrence.',
    summary_hi: 'बंगाल की खाड़ी में स्वदेशी स्क्रैमजेट प्रणोदन द्वारा मैक 6.5 की गति पर निरंतर उड़ान क्षमता प्रमाणित की गई।',
    content_raw: 'The Defence Research and Development Organisation (DRDO) confirmed the successful flight test of the Hypersonic Technology Demonstrator Vehicle from Dr APJ Abdul Kalam Island off the coast of Odisha.',
    image_url: '/src/assets/images/tejas_defense_aeronautics_1790902992149.jpg',
    category: 'DEFENSE',
    status: 'PENDING',
    created_at: '2026-10-01T16:45:00Z',
    approved_at: null,
    editorial_notes: null,
    matched_keywords: ['drdo', 'defense', 'indigenous'],
    salience: 'WIRE',
  },
  {
    id: 'art-pend-003',
    source_id: 6,
    source_name: 'Samskrita Bharati Global Wire',
    url_hash: '1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
    original_url: 'https://samskritabharati.in/initiatives/vedanga-astronomy-computational-model-iit-madras',
    title: 'IIT Madras & Sanskrit Scholars Develop Computational Engine Grounded in Surya Siddhanta Ephemeris',
    title_hi: 'आईआईटी मद्रास और संस्कृत विद्वानों ने सूर्य सिद्धांत पर आधारित सटीक खगोलीय गणना इंजन विकसित किया',
    summary: 'An open-source mathematical toolkit computes eclipses and planetary transits across 5,000 years with micro-second alignment to modern NASA JPL horizons.',
    summary_hi: 'सूर्य सिद्धांत के गणितीय सूत्रों को आधुनिक कंप्यूटिंग में ढालकर ग्रहणों और ग्रहीय गतियों की सूक्ष्म गणना करने वाला टूलकिट प्रस्तुत किया गया।',
    content_raw: 'A multi-disciplinary team has transcribed ancient Sanskrit computational algorithms from Aryabhatiya and Surya Siddhanta into high-performance Rust libraries, validating Indian classical mathematical astronomy.',
    image_url: '/src/assets/images/tejas_heritage_bronze_1790903001936.jpg',
    category: 'SANSKRIT',
    status: 'PENDING',
    created_at: '2026-10-01T16:20:00Z',
    approved_at: null,
    editorial_notes: null,
    matched_keywords: ['sanskrit', 'shastra', 'vedic'],
    salience: 'WIRE',
  },
  {
    id: 'art-pend-004',
    source_id: 3,
    source_name: 'Press Information Bureau (PIB)',
    url_hash: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
    original_url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2098552',
    title: 'Kashi Vishwanath Corridor Exceeds 150 Million Pilgrims in Benchmark Spiritual Infrastructure Model',
    title_hi: 'काशी विश्वनाथ धाम में 15 करोड़ से अधिक श्रद्धालुओं का सुगम दर्शन: आध्यात्मिक अवसंरचना का आदर्श मॉडल',
    summary: 'Sovereign infrastructure overhaul seamlessly accommodates historic pilgrim surges with zero stampede incidents, eco-friendly battery transit, and uninterrupted Ganga viewing decks.',
    summary_hi: 'गंगा तट से देवालय तक सुगम आवागमन और आधुनिक सुविधाओं के साथ काशी विश्वनाथ धाम ने तीर्थाटन अवसंरचना का नया वैश्विक कीर्तिमान स्थापित किया।',
    content_raw: 'Official administrative audit figures confirm over 150 million devotees have visited Kashi Vishwanath Dham since its inauguration. The project has catalyzed regional handloom and temple crafts economy.',
    image_url: '/src/assets/images/tejas_mandir_revival_1790902980859.jpg',
    category: 'MANDIR',
    status: 'PENDING',
    created_at: '2026-10-01T15:50:00Z',
    approved_at: null,
    editorial_notes: null,
    matched_keywords: ['kashi', 'mandir', 'temple', 'dharma'],
    salience: 'WIRE',
  },
  {
    id: 'art-pend-005',
    source_id: 2,
    source_name: 'ISRO Deep Space Operations',
    url_hash: '2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
    original_url: 'https://isro.gov.in/missions/gaganyaan-uncrewed-orbital-module-docking-test-readiness',
    title: 'Gaganyaan Readiness: CE-20 Cryogenic Stage Qualified for Human-Rating Flight Standards',
    title_hi: 'गगनयान मिशन की तैयारी: CE-20 क्रायोजेनिक इंजन मानव-रेटिंग सुरक्षा मानकों पर पूर्णतः प्रमाणित',
    summary: 'The critical upper stage engine completes demanding thermal and pressure endurance tests, clearing path for the inaugural uncrewed orbital flight test.',
    summary_hi: 'इसरो के भारी रॉकेट LVM3 के क्रायोजेनिक चरण ने अंतरिक्ष यात्रियों की सुरक्षा हेतु आवश्यक कठोर परीक्षण सफलतापूर्वक पास किए।',
    content_raw: 'ISRO announced the human-rating qualification of the CE-20 cryogenic engine powering the upper stage of the LVM3 launch vehicle for the prestigious Gaganyaan human spaceflight mission.',
    image_url: '/src/assets/images/tejas_science_isro_1790903012028.jpg',
    category: 'SCIENCE',
    status: 'PENDING',
    created_at: '2026-10-01T15:05:00Z',
    approved_at: null,
    editorial_notes: null,
    matched_keywords: ['isro', 'gaganyaan', 'indigenous', 'science'],
    salience: 'WIRE',
  }
];

export const PRODUCTION_MANIFESTS = {
  python_daemon: `import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
import feedparser
import os
import time

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "yugala_tejas"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "YOUR_STRONG_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432))
}

# Matching keywords for initial screening of Dharmic Renaissance dispatches
DHARMIC_KEYWORDS = [
    "temple", "mandir", "asi", "excavation", "repatriation", "sanskrit",
    "kashi", "ayodhya", "mathura", "heritage", "isro", "drdo", "tejas",
    "indigenous", "defense", "chola", "shiva", "brahmanic", "dharma",
    "antiquities", "vedic", "gaganyaan", "epigraphy", "hampi", "shastra"
]

def hash_url(url: str) -> str:
    """Computes SHA-256 digest of clean URL to prevent duplicate ingestion."""
    return hashlib.sha256(url.strip().encode('utf-8')).hexdigest()

def is_article_relevant(title: str, summary: str) -> tuple[bool, list[str]]:
    blob = f"{title} {summary}".lower()
    matches = [k for k in DHARMIC_KEYWORDS if k in blob]
    return (len(matches) > 0, matches)

def infer_category(title: str, summary: str) -> str:
    blob = f"{title} {summary}".lower()
    if any(k in blob for k in ["mandir", "temple", "kashi", "ayodhya", "mathura"]):
        return "MANDIR"
    if any(k in blob for k in ["chola", "excavation", "asi", "repatriation", "antiquities", "epigraphy"]):
        return "HERITAGE"
    if any(k in blob for k in ["tejas", "drdo", "defense", "missile", "radar", "aesa", "navy"]):
        return "DEFENSE"
    if any(k in blob for k in ["isro", "space", "cryogenic", "gaganyaan", "chandrayaan", "quantum"]):
        return "SCIENCE"
    if any(k in blob for k in ["sanskrit", "shastra", "manuscript", "vedic", "panini"]):
        return "SANSKRIT"
    return "GENERAL"

def run_pipeline():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting SITAVANI Ingestion Pipeline...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT id, name, rss_endpoint FROM sources WHERE is_active = TRUE;")
    sources = cur.fetchall()
    print(f"Found {len(sources)} active RSS sources.")

    total_ingested = 0
    total_skipped_dup = 0
    total_irrelevant = 0

    for src in sources:
        print(f"Polling: {src['name']} ({src['rss_endpoint']})")
        parsed_feed = feedparser.parse(src["rss_endpoint"])
        
        for entry in parsed_feed.entries:
            link = getattr(entry, "link", "").strip()
            title = getattr(entry, "title", "").strip()
            summary = getattr(entry, "summary", "").strip()
            
            if not link or not title:
                continue

            relevant, matched = is_article_relevant(title, summary)
            if not relevant:
                total_irrelevant += 1
                continue

            image_url = None
            if "media_content" in entry and len(entry.media_content) > 0:
                image_url = entry.media_content[0].get("url")
            elif "links" in entry:
                for l in entry.links:
                    if "image" in l.get("type", ""):
                        image_url = l.get("href")
                        break

            url_digest = hash_url(link)
            category = infer_category(title, summary)

            # Insert as PENDING with SHA-256 conflict resolution
            cur.execute("""
                INSERT INTO articles 
                    (source_id, source_name, url_hash, original_url, title, summary, image_url, category, status)
                VALUES 
                    (%s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
                ON CONFLICT (url_hash) DO NOTHING
                RETURNING id;
            """, (src["id"], src["name"], url_digest, link, title, summary, image_url, category))
            
            res = cur.fetchone()
            if res:
                total_ingested += 1
                print(f"  [+] Ingested PENDING: {title[:60]}... (Hash: {url_digest[:12]})")
            else:
                total_skipped_dup += 1

            conn.commit()

    cur.close()
    conn.close()
    print(f"Pipeline finished: {total_ingested} new, {total_skipped_dup} dups skipped, {total_irrelevant} filtered out.")

if __name__ == "__main__":
    run_pipeline()`,

  schema_sql: `-- 1. Sources Registry Table
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_url TEXT NOT NULL,
    rss_endpoint TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Article Lifecycle Enums
CREATE TYPE article_status AS ENUM ('PENDING', 'APPROVED', 'DISCARDED');
CREATE TYPE news_category AS ENUM ('HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GENERAL');

-- 3. Articles Table with SHA-256 Deduplication & Bilingual Support
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id INT REFERENCES sources(id) ON DELETE SET NULL,
    source_name VARCHAR(100) NOT NULL,
    url_hash CHAR(64) UNIQUE NOT NULL, -- SHA-256 digest of original URL
    original_url TEXT NOT NULL,
    title TEXT NOT NULL,
    title_hi TEXT,
    summary TEXT,
    summary_hi TEXT,
    content_raw TEXT,
    image_url TEXT,
    category news_category DEFAULT 'GENERAL',
    status article_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    editorial_notes TEXT NULL
);

-- 4. High-Performance Speed Indexes
CREATE INDEX idx_articles_status_created ON articles(status, created_at DESC);
CREATE INDEX idx_articles_approved ON articles(approved_at DESC) WHERE status = 'APPROVED';
CREATE INDEX idx_articles_url_hash ON articles(url_hash);
CREATE INDEX idx_articles_category ON articles(category);`,

  dockerfile: `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev curl cron && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ingestion_daemon.py .
COPY crontab /etc/cron.d/tejas_ingestion

RUN chmod 0644 /etc/cron.d/tejas_ingestion && crontab /etc/cron.d/tejas_ingestion
RUN touch /var/log/tejas_ingestion.log

CMD ["cron", "-f"]`,

  requirements_txt: `feedparser==6.0.11
psycopg2-binary==2.9.9
requests==2.31.0`,

  crontab: `0 * * * * cd /app && /usr/local/bin/python ingestion_daemon.py >> /var/log/tejas_ingestion.log 2>&1
# Manual trigger capability: docker exec -it tejas_daemon python ingestion_daemon.py`
};
