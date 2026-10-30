import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import crypto from 'node:crypto';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://sitavani:6fea316605148b12505929a57b2dcea9@127.0.0.1:5432/sitavani';

const pool = new Pool({ connectionString });

function determineCategory(text, sourceName = '') {
  const content = (text || '').toLowerCase();
  const source = (sourceName || '').toLowerCase();

  // 1. MANDIR (Sacred Geography, Temples, Kunds, Pilgrimage, Pujas, Deities)
  if (
    /मंदिर|मन्दिर|तीर्थ|देवस्थान|गर्भगृह|परिक्रमा|कुण्ड|घाट|पुजारी|महादेव|शिवलिंग|दर्शन|आरती|विष्णु|दुर्गा|हनुमान|रामलला|सोमनाथ|केदारनाथ|बद्रीनाथ|काशी\s*विश्वनाथ|अयोध्या|महाकाल|उज्जैन|मीनाक्षी|तिरुपति|जगन्नाथ|द्वारका|श्रद्धालु|आध्यात्मिक/.test(text) ||
    /\b(mandir|temple|tirth|tirtha|devasthan|sanctum|parikrama|kund|ghat|puja|deity|kashi vishwanath|ayodhya|ram mandir|somnath|kedarnath|badrinath|mahakal|tirupati|jagannath|garbhagriha|pilgrimage|sacred shrine|jyotirlinga)\b/.test(content) ||
    /temple\s*connect|sanatan\s*wires|dharmik/.test(source)
  ) {
    return 'MANDIR';
  }

  // 2. HERITAGE & ITIHASA (Archeology, ASI, Inscriptions, Ancient History, Decolonization, Reclaiming Ancient Names, Chola Bronzes)
  if (
    /इतिहास|पुरातत्व|उत्खनन|धरोहर|शिलालेख|अभिलेख|पुनर्नामकरण|नामकरण|नाम\s*परिवर्तन|ऐतिहासिक|सिंधु\s*घाटी|हड़प्पा|राखीगढ़ी|तंजावुर|चोल|कांस्य|मूर्ति\s*वापसी|प्रयागराज|संभाजीनगर|धाराशिव|विग्रह\s*पुनर्प्राप्ति|संस्कृति|वि-उपनिवेशीकरण/.test(text) ||
    /\b(heritage|archaeol|excavation|inscription|epigraphy|renam|reclaim|decoloniz|monument|chola|repatriat|harappa|rakhigarhi|sudarshana|rudradaman|ancient|civiliz|antiquity|prayagraj|chhatrapati sambhajinagar|dharashiv|historical name|stolen artifact|restored idol|sculpture)\b/.test(content) ||
    /asi\s*archaeological|culture\s*&\s*archaeological/.test(source)
  ) {
    return 'HERITAGE';
  }

  // 3. SANSKRIT & SHASTRA (Vedas, Upanishads, Shastras, Manuscripts, Sanskrit Grammar)
  if (
    /संस्कृत|वेद|शास्त्र|उपनिषद|संहिता|पांडुलिपि|पाण्डुलिपि|पाणिनी|अष्टाध्यायी|भाष्य|ऋग्वेद|यजुर्वेद|सामवेद|अथर्ववेद|ज्ञान\s*भंडार/.test(text) ||
    /\b(sanskrit|shastra|vedic|veda|upanishad|samhita|manuscript|panini|ashtadhyayi|vyakarana|bhashya|palm-leaf|samskrita)\b/.test(content) ||
    /samskrita\s*bharati/.test(source)
  ) {
    return 'SANSKRIT';
  }

  // 4. SCIENCE & TECHNOLOGY (ISRO, Deep Space, Quantum, Computing, AI, Astronomy)
  if (
    /विज्ञान|प्रौद्योगिकी|अंतरिक्ष|इसरो|उपग्रह|चंद्रयान|गगनयान|परमाणु|क्वांटम|कृत्रिम\s*बुद्धिमत्ता/.test(text) ||
    /\b(science|isro|space|satellite|chandrayaan|gaganyaan|payload|quantum|biotech|nanotech|cryogenic|deep space|astronomy|physics|algorithm)\b/.test(content) ||
    /isro\s*deep\s*space|science,\s*tech/.test(source)
  ) {
    return 'SCIENCE';
  }

  // 5. DEFENSE (Military, Navy, Air Force, DRDO, Strategic Armor)
  if (
    /रक्षा|सेना|वायुसेना|नौसेना|सैन्य|मिसाइल|डीआरडीओ|तेजस|पनडुब्बी|लड़ाकू\s*विमान|युद्धपोत|तोपखाना/.test(text) ||
    /\b(drdo|defense|defence|army|navy|air force|military|missile|tejas|radar|frigate|warship|ammunition|combat|patrol|squadron)\b/.test(content)
  ) {
    return 'DEFENSE';
  }

  // 6. GOVERNANCE (Sovereign Policies, Parliament, National Initiatives)
  if (
    /मंत्रालय|कैबिनेट|संसद|नीति\s*आयोग|योजना|विकास|राष्ट्रीय|राजपत्र|अधिनियम|विधेयक|सुशासन/.test(text) ||
    /\b(governance|cabinet|policy|parliament|reform|ordinance|infrastructure|gazette|ministry|niti aayog|initiative)\b/.test(content)
  ) {
    return 'GOVERNANCE';
  }

  if (/defense|military/.test(source)) {
    return 'DEFENSE';
  }

  return 'GENERAL';
}

async function main() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    // 1. Reclassify existing articles
    console.log('--- Step 1: Reclassifying Existing Database Articles ---');
    const articlesRes = await client.query('SELECT id, title, title_hi, summary, summary_hi, source_name, category FROM articles');
    let reclassifiedCount = 0;

    for (const art of articlesRes.rows) {
      const combinedText = `${art.title} ${art.title_hi} ${art.summary} ${art.summary_hi}`;
      const newCategory = determineCategory(combinedText, art.source_name);
      if (newCategory !== art.category) {
        await client.query('UPDATE articles SET category = $1 WHERE id = $2', [newCategory, art.id]);
        reclassifiedCount++;
      }
    }
    console.log(`Reclassified ${reclassifiedCount} out of ${articlesRes.rows.length} articles.`);

    // 2. Fetch or confirm source IDs for Hindu feeds
    const sourcesRes = await client.query('SELECT id, name FROM sources');
    const sourceMap = {};
    for (const s of sourcesRes.rows) {
      sourceMap[s.name] = s.id;
    }

    const swarajyaId = sourceMap['Swarajya Cultural & Temples Desk'] || sourceMap['Swarajya Renaissance Desk'] || 5;
    const templeConnectId = sourceMap['Temple Connect & Sanatan Wires'] || 10;
    const asiId = sourceMap['ASI Archaeological Dispatches'] || 1;

    // 3. Demote older LEAD articles to FEATURE so the new Hindu lead takes the spotlight
    await client.query("UPDATE articles SET salience = 'FEATURE' WHERE salience = 'LEAD'");

    // 4. Seed Headline Hindu & Civilizational Articles
    console.log('--- Step 2: Seeding Headline Pure Hindu & Civilizational Dispatches ---');

    const headlineArticles = [
      {
        id: 'art-hindu-toponym-001',
        source_id: swarajyaId,
        source_name: 'Swarajya Cultural & Temples Desk',
        original_url: 'https://swarajyamag.com/culture/decolonization-of-sacred-toponyms-bharat-reclaims-ancestral-sanskrit-names',
        url_hash: crypto.createHash('sha256').update('https://swarajyamag.com/culture/decolonization-of-sacred-toponyms-bharat-reclaims-ancestral-sanskrit-names').digest('hex'),
        title: 'Decolonization of Sacred Toponyms: Over 40 Historic Bhartiya Cities Reclaim Ancestral Sanskrit Nomenclature',
        title_hi: 'पवित्र स्थानों का वि-उपनिवेशीकरण: 40 से अधिक ऐतिहासिक भारतीय नगरों ने पुनः प्राप्त किए अपने प्राचीन संस्कृत नाम',
        summary: 'In a landmark civilizational restoration, official gazette notifications finalize ancestral Sanskrit nomenclature for major sacred and cultural centers across Bharat—solidifying Prayagraj, Chhatrapati Sambhajinagar, and Dharashiv while commissioning comprehensive epigraphical surveys to decolonize names across pilgrimage corridors.',
        summary_hi: 'एक युगांतरकारी सांस्कृतिक पुनर्स्थापना में, भारत भर के प्रमुख आध्यात्मिक केंद्रों के लिए आधिकारिक राजपत्र द्वारा प्राचीन संस्कृत नामकरण को पूर्ण किया गया—प्रयागराज, छत्रपति संभाजीनगर, और धाराशिव की पुनर्प्रतिष्ठा के साथ तीर्थ मार्गों के प्राचीन नामों को पुनर्जीवित किया जा रहा है।',
        content_raw: `NEW DELHI / PRAYAGRAJ — In an authoritative step toward civilizational decolonization, the sovereign executive framework has affirmed the restoration of ancestral Sanskrit nomenclature across more than 40 ancient cities, districts, and sacred railway junctions throughout Bharat.

The Ministry of Home Affairs, collaborating with state governments and historical naming committees, ratified the final gazette notifications replacing colonial and medieval impositions with their Vedic and classical epigraphic designations. The prominent restorations include the irreversible reaffirmation of Prayagraj (formerly Allahabad), Chhatrapati Sambhajinagar (formerly Aurangabad), Dharashiv (formerly Osmanabad), and Kalaburagi (formerly Gulbarga).

Senior epigraphists and cultural historians hailed the sovereign measure, emphasizing that sacred geography (Tirtha-Kshetra) is intrinsically linked to Bhartiya identity. A specialized commission has now been constituted to systematically examine ancient rock inscriptions, copper-plate grants, and Purāṇic topographies to reclaim original Sanskrit designations for historic riverbanks, ghats, and pilgrimage transit corridors across Uttar Pradesh, Maharashtra, Madhya Pradesh, and Karnataka.`,
        image_url: '/images/junagadh_rock_sudarshana_dam_1792956730374.jpg',
        category: 'HERITAGE',
        salience: 'LEAD',
        status: 'PUBLISHED',
        matched_keywords: ['decolonization', 'renaming', 'prayagraj', 'sanskrit', 'itihasa', 'bharat', 'toponyms']
      },
      {
        id: 'art-hindu-hampi-kashi-002',
        source_id: templeConnectId,
        source_name: 'Temple Connect & Sanatan Wires',
        original_url: 'https://templeconnect.com/news/monumental-revival-of-sacred-geography-hampi-sanctums-and-kashi-vishwanath-corridor',
        url_hash: crypto.createHash('sha256').update('https://templeconnect.com/news/monumental-revival-of-sacred-geography-hampi-sanctums-and-kashi-vishwanath-corridor').digest('hex'),
        title: 'Monumental Revival of Sacred Geography: Hampi Vijayanagara Sanctums and Kashi Vishwanath Corridor Set Global Heritage Benchmark',
        title_hi: 'पवित्र भूगोल का युगीन पुनरुद्धार: हम्पी विजयनगर गर्भगृह और काशी विश्वनाथ धाम ने स्थापित किया वैश्विक आध्यात्मिक मानदंड',
        summary: 'Subsurface radar mapping integrated with multi-agency temple conservation has unlocked submerged 7th-century granite sanctums at the Tungabhadra basin in Hampi, while Kashi Vishwanath Dham reports seamless pilgrimage facilitation for over 150 million devotees under authentic Vedic architectural guidelines.',
        summary_hi: 'हम्पी में तुंगभद्रा नदी बेसिन पर भूगर्भीय रडार मैपिंग और मंदिर संरक्षण द्वारा जलमग्न 7वीं सदी के ग्रेनाइट गर्भगृहों को सुरक्षित किया गया, जबकि काशी विश्वनाथ धाम ने वैदिक स्थापत्य सिद्धांतों के तहत 15 करोड़ से अधिक श्रद्धालुओं के सुगम दर्शन का नया प्रतिमान स्थापित किया।',
        content_raw: `VARANASI / HAMPI — Sacred architectural renaissance in Bharat achieved a historic milestone today as multi-tiered restoration operations across northern and southern sacred nodes unveiled unprecedented achievements in temple preservation and pilgrim infrastructure.

At the UNESCO World Heritage site of Hampi (ancient Kishkindha / Vijayanagara capital), non-invasive ground-penetrating radar operated by heritage engineers in the Tungabhadra river basin identified a massive submerged granite sanctum complex dating back to the pre-Chalukyan 7th century. The granite pillars, adorned with ornate bas-reliefs of Bhagavan Shiva and Vishnu, demonstrate uninterrupted continuity of Sanatana worship spanning well over 1,400 years.

Concurrently in Varanasi, the Kashi Vishwanath Special Area Development Board released comprehensive operational data confirming that the transformed Kashi Vishwanath Corridor has successfully accommodated over 150 million pilgrims within the past 36 months without a single logistical breakdown. The corridor seamlessly connects the sacred Ganga Ghats directly to the Jyotirlinga sanctum, embodying the civilizational triumph of restoring ancient temple vistas while honoring sacred Śilpa Śāstra guidelines.`,
        image_url: '/images/keezhadi_terracotta_pipeline_trench_1792953611785.jpg',
        category: 'MANDIR',
        salience: 'FEATURE',
        status: 'PUBLISHED',
        matched_keywords: ['mandir', 'hampi', 'kashi', 'vishwanath', 'vijayanagara', 'temple', 'sanatana', 'tirtha']
      },
      {
        id: 'art-hindu-nataraja-chola-003',
        source_id: asiId,
        source_name: 'ASI Archaeological Dispatches',
        original_url: 'https://asi.nic.in/dispatches/sacred-vigraha-repatriation-10th-century-chola-bronze-nataraja-restored-to-thanjavur-sanctum',
        url_hash: crypto.createHash('sha256').update('https://asi.nic.in/dispatches/sacred-vigraha-repatriation-10th-century-chola-bronze-nataraja-restored-to-thanjavur-sanctum').digest('hex'),
        title: 'Sacred Vigraha Repatriation: 10th-Century Chola Bronze Nataraja Reclaimed from Overseas Galleries Reinstalled in Thanjavur Sanctum',
        title_hi: 'पवित्र विग्रह वापसी: विदेशी संग्रहालयों से पुनः प्राप्त 10वीं सदी की चोल कांस्य नटराज प्रतिमा तंजावुर गर्भगृह में पुनर्स्थापित',
        summary: 'Through relentless sovereign diplomatic tracing and archival provenance verification, the sacred 10th-century Chola bronze icon of Bhagavan Nataraja, illegally trafficked decades ago, has returned to Bharat and was ceremonially re-consecrated into the Thanjavur sanctum with Vedic rituals.',
        summary_hi: 'संप्रभु कूटनीतिक और पुरातात्विक साक्ष्यों के आधार पर, दशकों पूर्व अवैध रूप से तस्करी की गई भगवान नटराज की 10वीं सदी की दुर्लभ चोल कांस्य प्रतिमा भारत लौट आई है और तंजावुर मंदिर के गर्भगृह में वैदिक मंत्रोच्चार और आगमिक अनुष्ठानों के साथ पुनर्स्थापित की गई।',
        content_raw: `THANJAVUR — In a profoundly emotional moment for Sanatana devotees and heritage conservators, the magnificent 10th-century Chola bronze Vigraha of Bhagavan Nataraja—depicting the cosmic Ananda Tandava dance of Shiva—was formally re-consecrated within its original temple precinct in the Thanjavur district of Tamil Nadu.

The sacred murti, cast during the zenith of the Imperial Chola dynasty using the legendary madhuchishtavidhana (lost-wax casting) method, had been illegally smuggled out of Bharat in the late 20th century through international illicit antiquities networks and was subsequently acquired by a Western art institution.

Following multi-year forensic investigations, stone epigraph comparisons, and relentless bilateral diplomatic representations by the Archaeological Survey of India (ASI) and the Ministry of External Affairs, international authorities surrendered the deity without condition. The return ceremonies witnessed high priests conducting Mahā-Kumbhābhiṣekam, Rudrābhiṣekam, and Agamic purification rites, welcoming the divine icon back to its ancestral sovereign soil.`,
        image_url: '/images/adichanallur_gold_diadem_bronzes_1792953653684.jpg',
        category: 'HERITAGE',
        salience: 'FEATURE',
        status: 'PUBLISHED',
        matched_keywords: ['chola', 'bronze', 'nataraja', 'repatriation', 'thanjavur', 'mandir', 'vigraha', 'heritage', 'asi']
      }
    ];

    const now = new Date();

    for (const art of headlineArticles) {
      await client.query(`
        INSERT INTO articles (
          id, source_id, source_name, original_url, url_hash,
          title, title_hi, summary, summary_hi, content_raw,
          image_url, category, status, salience,
          created_at, updated_at, reviewed_at, reviewed_by, approved_at, published_at,
          matched_keywords
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $15, $15, $16, $15, $15,
          $17
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_hi = EXCLUDED.title_hi,
          summary = EXCLUDED.summary,
          summary_hi = EXCLUDED.summary_hi,
          content_raw = EXCLUDED.content_raw,
          image_url = EXCLUDED.image_url,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          salience = EXCLUDED.salience,
          published_at = EXCLUDED.published_at,
          updated_at = EXCLUDED.updated_at,
          matched_keywords = EXCLUDED.matched_keywords;
      `, [
        art.id, art.source_id, art.source_name, art.original_url, art.url_hash,
        art.title, art.title_hi, art.summary, art.summary_hi, art.content_raw,
        art.image_url, art.category, art.status, art.salience,
        now, 'ACHARYA_PEETHAM', art.matched_keywords
      ]);
      console.log(`[+] Seeded headline: [${art.salience} / ${art.category}] ${art.title.slice(0, 50)}...`);
    }

    // 5. Final Category Breakdown
    console.log('--- Step 3: Updated Category Breakdown ---');
    const breakdownRes = await client.query('SELECT category, count(*) FROM articles GROUP BY category ORDER BY count(*) DESC');
    console.table(breakdownRes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
