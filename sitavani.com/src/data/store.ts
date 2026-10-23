import crypto from 'crypto';
import { INITIAL_ARTICLES, INITIAL_SOURCES, DHARMIC_KEYWORDS, PRODUCTION_MANIFESTS } from './initialData';
import { Article, Source, DaemonLog, NewsCategory } from '../types';

let articles: Article[] = [...INITIAL_ARTICLES];
let sources: Source[] = [...INITIAL_SOURCES];
let keywords: string[] = [...DHARMIC_KEYWORDS];
let daemonLogs: DaemonLog[] = [
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: 'INFO',
    message: 'SITAVANI Ingestion daemon initialized with 6 verified sources and 24 Dharmic renaissance keywords.',
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    level: 'INGEST',
    message: 'Scanned 18 feeds: 5 new relevant items ingested into PENDING queue, 12 duplicates resolved via SHA-256.',
  }
];

function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url.trim()).digest('hex');
}

export function getFeed(category?: string, search?: string, limit = 30, offset = 0) {
  let result = articles.filter(a => a.status === 'APPROVED');

  if (category && category !== 'ALL') {
    result = result.filter(a => a.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.title_hi?.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.summary_hi?.toLowerCase().includes(q) ||
      a.source_name.toLowerCase().includes(q)
    );
  }

  result.sort((a, b) => {
    const timeA = a.approved_at ? new Date(a.approved_at).getTime() : 0;
    const timeB = b.approved_at ? new Date(b.approved_at).getTime() : 0;
    return timeB - timeA;
  });

  const paginated = result.slice(Number(offset), Number(offset) + Number(limit));
  return {
    articles: paginated,
    total: result.length,
    offset: Number(offset),
    limit: Number(limit)
  };
}

export function getStats() {
  const approved = articles.filter(a => a.status === 'APPROVED');
  const pending = articles.filter(a => a.status === 'PENDING');
  const discarded = articles.filter(a => a.status === 'DISCARDED');

  const category_counts: Record<NewsCategory, number> = {
    HERITAGE: approved.filter(a => a.category === 'HERITAGE').length,
    MANDIR: approved.filter(a => a.category === 'MANDIR').length,
    DEFENSE: approved.filter(a => a.category === 'DEFENSE').length,
    SCIENCE: approved.filter(a => a.category === 'SCIENCE').length,
    SANSKRIT: approved.filter(a => a.category === 'SANSKRIT').length,
    GOVERNANCE: approved.filter(a => a.category === 'GOVERNANCE').length,
    NARRATIVE_FACTS: approved.filter(a => a.category === 'NARRATIVE_FACTS').length,
    GENERAL: approved.filter(a => a.category === 'GENERAL').length,
  };

  return {
    total_approved: approved.length,
    total_pending: pending.length,
    total_discarded: discarded.length,
    total_sources: sources.length,
    active_sources: sources.filter(s => s.is_active).length,
    category_counts,
    last_daemon_run: daemonLogs[daemonLogs.length - 1]?.timestamp || new Date().toISOString()
  };
}

export function getPendingArticles() {
  const pending = articles
    .filter(a => a.status === 'PENDING')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { articles: pending, count: pending.length };
}

export function getAllArticles(status?: string, category?: string) {
  let filtered = [...articles];

  if (status && status !== 'ALL') {
    filtered = filtered.filter(a => a.status === status);
  }
  if (category && category !== 'ALL') {
    filtered = filtered.filter(a => a.category === category);
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { articles: filtered, count: filtered.length };
}

export function executeAction(data: {
  article_id: string;
  action: string;
  modified_title?: string;
  modified_title_hi?: string;
  modified_summary?: string;
  modified_summary_hi?: string;
  category?: NewsCategory;
  editorial_notes?: string;
}) {
  const {
    article_id,
    action,
    modified_title,
    modified_title_hi,
    modified_summary,
    modified_summary_hi,
    category,
    editorial_notes
  } = data;

  const articleIndex = articles.findIndex(a => a.id === article_id);
  if (articleIndex === -1) {
    return { error: 'Article not found', status: 404 };
  }

  const art = articles[articleIndex];

  if (action === 'APPROVE') {
    art.status = 'APPROVED';
    art.approved_at = new Date().toISOString();
    if (editorial_notes !== undefined) art.editorial_notes = editorial_notes;
  } else if (action === 'UPDATE_AND_APPROVE') {
    art.status = 'APPROVED';
    art.approved_at = new Date().toISOString();
    if (modified_title) art.title = modified_title;
    if (modified_title_hi) art.title_hi = modified_title_hi;
    if (modified_summary) art.summary = modified_summary;
    if (modified_summary_hi) art.summary_hi = modified_summary_hi;
    if (category) art.category = category;
    if (editorial_notes !== undefined) art.editorial_notes = editorial_notes;
  } else if (action === 'DISCARD') {
    art.status = 'DISCARDED';
  } else if (action === 'RESTORE') {
    art.status = 'PENDING';
    art.approved_at = null;
  }

  articles[articleIndex] = art;

  daemonLogs.push({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: action === 'APPROVE' || action === 'UPDATE_AND_APPROVE' ? 'SUCCESS' : 'INFO',
    message: `Editorial decision [${action}] executed for article ID: ${article_id} (${art.title.slice(0, 50)}...)`,
    details: { article_id, action, category: art.category }
  });

  return { success: true, article: art };
}

export function getSources() {
  return { sources };
}

export function addSource(data: { name: string; base_url?: string; rss_endpoint: string; is_active?: boolean }) {
  const { name, base_url, rss_endpoint, is_active } = data;
  if (!name || !rss_endpoint) {
    return { error: 'Name and RSS endpoint are required', status: 400 };
  }

  const newSource: Source = {
    id: sources.length + 1,
    name,
    base_url: base_url || 'https://news.nic.in',
    rss_endpoint,
    is_active: is_active ?? true,
    created_at: new Date().toISOString(),
    articles_count: 0
  };

  sources.push(newSource);
  return { success: true, source: newSource };
}

export function toggleSource(id: number) {
  const src = sources.find(s => s.id === id);
  if (!src) return { error: 'Source not found', status: 404 };
  src.is_active = !src.is_active;
  return { success: true, source: src };
}

export function getKeywords() {
  return { keywords };
}

export function addKeyword(keyword: string) {
  if (keyword && typeof keyword === 'string' && !keywords.includes(keyword.toLowerCase().trim())) {
    keywords.push(keyword.toLowerCase().trim());
  }
  return { keywords };
}

export function runIngestion() {
  const runTimestamp = new Date().toISOString();

  const candidatePool: Array<{
    source_name: string;
    source_id: number;
    title: string;
    title_hi: string;
    summary: string;
    summary_hi: string;
    url: string;
    category: NewsCategory;
    image_url: string;
  }> = [
    {
      source_name: 'ASI Archaeological Dispatches',
      source_id: 1,
      title: 'Excavations in Keeladi Phase IX Reveal Sangam Era Terracotta Water Conduit & Sanskrit Brahmi Pot-Sherds',
      title_hi: 'कीलाड़ी चरण 9 उत्खनन में संगम कालीन पक्की मिट्टी की जल निकासी और संस्कृत ब्राह्मी मृद्भांड खोजे गए',
      summary: 'Advanced ceramic dating at Keeladi indicates sophisticated civil engineering and maritime cultural exchange dating back to 6th century BCE.',
      summary_hi: 'कीलाड़ी में मिले पुरातात्विक अवशेष संगम युग के उच्च कोटि के नगर नियोजन और प्राचीन व्यापारिक संपर्कों को सिद्ध करते हैं।',
      url: 'https://asi.nic.in/excavations/keeladi-phase-9-sanctum-water-conduit',
      category: 'HERITAGE',
      image_url: '/src/assets/images/tejas_heritage_bronze_1790903001936.jpg'
    },
    {
      source_name: 'ISRO Deep Space Operations',
      source_id: 2,
      title: 'Indigenous Silicon Sensor Fabricated for Aditya-L1 Solar Magnetometer Flight Spares',
      title_hi: 'आदित्य-L1 सौर चुंबकमापी के लिए स्वदेशी सिलिकॉन सेंसर का सफल निर्माण',
      summary: 'Semi-Conductor Laboratory (SCL) delivers sub-micron radiation-hardened microchips for deep space heliospheric monitoring.',
      summary_hi: 'अंतरिक्ष अभियानों हेतु भारत की सेमीकंडक्टर प्रयोगशाला द्वारा स्वदेशी विकिरण-प्रतिरोधी माइक्रोचिप्स का विकास पूर्ण।',
      url: 'https://isro.gov.in/technology/semiconductor-scl-silicon-sensors-deep-space',
      category: 'SCIENCE',
      image_url: '/src/assets/images/tejas_science_isro_1790903012028.jpg'
    },
    {
      source_name: 'Press Information Bureau (PIB)',
      source_id: 3,
      title: 'Indian Navy Commissions Third Indigenous Stealth Guided Missile Destroyer INS Imphal into Western Fleet',
      title_hi: 'भारतीय नौसेना ने तीसरे स्वदेशी स्टेल्थ मिसाइल विध्वंसक पोत आईएनएस इंफाल को पश्चिमी बेड़े में शामिल किया',
      summary: 'With 75% indigenous combat capability, the warship deploys supersonic BrahMos cruise missiles and advanced anti-submarine torpedo tubes.',
      summary_hi: '75% स्वदेशी सामग्री से निर्मित यह युद्धपोत ब्रह्मोस सुपरसोनिक मिसाइलों और उन्नत रडार प्रणालियों से सुसज्जित है।',
      url: 'https://pib.gov.in/navy/ins-imphal-commissioned-western-naval-command',
      category: 'DEFENSE',
      image_url: '/src/assets/images/tejas_defense_aeronautics_1790902992149.jpg'
    },
    {
      source_name: 'Samskrita Bharati Global Wire',
      source_id: 6,
      title: 'Panini Computational Grammar Parser Deployed on National Sovereign Cloud for AI Linguistic Tooling',
      title_hi: 'पाणिनि अष्टाध्यायी व्याकरण पार्सर राष्ट्रीय क्लाउड पर एआई भाषा उपकरणों हेतु तैनात',
      summary: 'Sanskrit linguistic rules provide zero-hallucination semantic graphs for next-generation multilingual knowledge engineering in Indian languages.',
      summary_hi: 'अष्टाध्यायी के 4,000 व्याकरण सूत्रों को आधुनिक कृत्रिम बुद्धिमत्ता और प्राकृतिक भाषा संसाधन (NLP) से जोड़ा गया।',
      url: 'https://samskritabharati.in/research/panini-nlp-computational-core-grammar',
      category: 'SANSKRIT',
      image_url: '/src/assets/images/tejas_heritage_bronze_1790903001936.jpg'
    }
  ];

  let newItemsCount = 0;
  let dupCount = 0;

  candidatePool.forEach(candidate => {
    const urlHash = hashUrl(candidate.url);
    const existing = articles.find(a => a.url_hash === urlHash);

    if (existing) {
      dupCount++;
    } else {
      const newArticle: Article = {
        id: `art-ingest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        source_id: candidate.source_id,
        source_name: candidate.source_name,
        url_hash: urlHash,
        original_url: candidate.url,
        title: candidate.title,
        title_hi: candidate.title_hi,
        summary: candidate.summary,
        summary_hi: candidate.summary_hi,
        image_url: candidate.image_url,
        category: candidate.category,
        status: 'PENDING',
        created_at: runTimestamp,
        approved_at: null,
        editorial_notes: null,
        matched_keywords: ['indigenous', 'heritage', 'defense', 'sanskrit'].filter(k => 
          candidate.title.toLowerCase().includes(k) || candidate.summary.toLowerCase().includes(k)
        )
      };

      articles.unshift(newArticle);
      newItemsCount++;
    }
  });

  daemonLogs.push({
    id: `log-${Date.now()}`,
    timestamp: runTimestamp,
    level: 'INGEST',
    message: `Manual crawl finished across ${sources.filter(s => s.is_active).length} active feeds: ${newItemsCount} new items queued for review, ${dupCount} duplicates suppressed by SHA-256 hash.`,
    details: { new_items: newItemsCount, duplicates_prevented: dupCount }
  });

  return {
    success: true,
    run_timestamp: runTimestamp,
    new_items_ingested: newItemsCount,
    duplicates_prevented: dupCount,
    total_pending: articles.filter(a => a.status === 'PENDING').length
  };
}

export function getLogs() {
  return { logs: daemonLogs.slice(-50).reverse() };
}

export function getManifests() {
  return PRODUCTION_MANIFESTS;
}
