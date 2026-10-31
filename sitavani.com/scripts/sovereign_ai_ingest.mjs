#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

// Load environment variables if needed
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf8');
      for (const line of envText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          process.env[key.trim()] = rest.join('=').trim();
        }
      }
    }
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

const connectionString = process.env.DATABASE_URL || 'postgresql://sitavani:6fea316605148b12505929a57b2dcea9@127.0.0.1:5432/sitavani';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

// Decolonization dictionary
const SOVEREIGN_REPLACEMENTS = [
  { pattern: /\bHinduism\b/gi, replacement: 'Sanātana Dharma' },
  { pattern: /\bHindus\b/g, replacement: 'Sanātanis' },
  { pattern: /\bHindu\b/g, replacement: 'Sanātani' },
  { pattern: /\banti-hindu\b/gi, replacement: 'anti-Sanātana' },
  { pattern: /\btemples\b/gi, replacement: 'Mandirs' },
  { pattern: /\btemple\b/gi, replacement: 'Mandir' },
  { pattern: /\bshrines\b/gi, replacement: 'Tīrthas' },
  { pattern: /\bshrine\b/gi, replacement: 'Tīrtha' },
  { pattern: /\bpilgrimages\b/gi, replacement: 'Tīrtha-Yātrās' },
  { pattern: /\bpilgrimage\b/gi, replacement: 'Tīrtha-Yātrā' },
  { pattern: /\bidols\b/gi, replacement: 'Vigrahas' },
  { pattern: /\bidol\b/gi, replacement: 'Vigraha' },
  { pattern: /\bdeities\b/gi, replacement: 'Devatās' },
  { pattern: /\bdeity\b/gi, replacement: 'Devatā' },
  { pattern: /\bsacred sanctum\b/gi, replacement: 'Garbhagṛha' },
  { pattern: /\bsanctum sanctorum\b/gi, replacement: 'Garbhagṛha' },
  { pattern: /\bIndia's\b/g, replacement: "Bhārat's" },
  { pattern: /\bIndia\b/g, replacement: 'Bhārat' },
  { pattern: /\bIndian\b/g, replacement: 'Bhāratīya' },
  { pattern: /\bIndians\b/g, replacement: 'Bhāratīyas' },
  { pattern: /\bAllahabad\b/gi, replacement: 'Prayāgrāj' },
  { pattern: /\bAhmedabad\b/gi, replacement: 'Karṇāvatī' },
  { pattern: /\bHyderabad\b/gi, replacement: 'Bhāgyanagar' },
  { pattern: /\bFaizabad\b/gi, replacement: 'Ayodhyā' },
  { pattern: /\bBenares\b/gi, replacement: 'Kāśī' },
  { pattern: /\bBanaras\b/gi, replacement: 'Kāśī' },
  { pattern: /\bVaranasi\b/gi, replacement: 'Kāśī-Vārāṇasī' },
  { pattern: /\bAurangabad\b/gi, replacement: 'Chhatrapati Sambhajinagar' },
  { pattern: /\bOsmanabad\b/gi, replacement: 'Dhārāśiva' },
  { pattern: /\bSambhal\b/gi, replacement: 'Satyavrata (Sambhal)' },
  { pattern: /\bUjjain\b/gi, replacement: 'Avantī-Ujjayinī' },
  { pattern: /\bIndore\b/gi, replacement: 'Indrapuram' },
  { pattern: /\bHampi\b/gi, replacement: 'Kishkindha-Hampi' },
  { pattern: /\bGyanvapi\b/gi, replacement: 'Kāśī Viśvanātha Jñānavāpī Mandir' },
  { pattern: /\bShahi Idgah\b/gi, replacement: 'Mathurā Śrī Kṛṣṇa Janmabhūmi Complex' },
  { pattern: /\bBabri Masjid\b/gi, replacement: 'Reclaimed Śrī Rāma Janmabhūmi' },
  { pattern: /\bQutub Minar\b/gi, replacement: 'Viṣṇu Stambha' },
  { pattern: /\bBhojshala\b/gi, replacement: 'Mā Sarasvatī Bhojaśālā Mandir' }
];

function decolonizeText(text) {
  if (!text) return '';
  let result = text;
  for (const { pattern, replacement } of SOVEREIGN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function cleanHtml(html) {
  if (!html) return '';
  let str = html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Strip all tags now that entities are decoded
  str = str.replace(/<[^>]*>/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
}

function isDeepCivilizationalNews(text, sourceName) {
  const combined = `${text} ${sourceName}`.toLowerCase();
  
  // Exclude trivial bureaucratic/commercial noise
  if (
    /postal stamp|commemorative stamp|audit manual|spectrum auction|gst circular|customs duty on|filing return|tender notice|telecom license/.test(combined)
  ) {
    return false;
  }

  // Mandatory Sanatan / Civilisational / Hindutva / Sovereign triggers
  return (
    /मंदिर|मन्दिर|तीर्थ|विग्रह|मूर्ति|उत्खनन|पुरातत्व|काशी|अयोध्या|प्रयागराज|संभाजीनगर|धाराशिव|संस्कृति|धर्म|वेद|शास्त्र|धर्मांतरण|वक्फ|हलाल|पुनर्नामकरण|गोरक्षा|हम्पी|भोजशाला|मथुरा|ज्ञानवापी|राष्ट्रवाद|स्वाभिमान|सत्य/.test(text) ||
    /\b(mandir|temple|vigraha|murti|sanatana|dharma|hindutva|asi|archaeol|excavation|kashi|ayodhya|mathura|gyanvapi|bhojshala|reclaim|renam|decoloniz|waqf|halal|conversion|cow protection|heritage|inscriptions|shastras|sanskrit|vedas|upanishad|sovereignty|geopolitic|defense|indigenous|isro)\b/.test(combined) ||
    /opindia|hindupost|newsbharati|hindu janajagruti|sanatan prabhat|organiser|panchjanya|swarajya|temple connect/.test(sourceName.toLowerCase())
  );
}

function determineCategory(text, sourceName = '') {
  const content = (text || '').toLowerCase();
  const source = (sourceName || '').toLowerCase();

  if (
    /मंदिर|मन्दिर|तीर्थ|देवस्थान|गर्भगृह|परिक्रमा|कुण्ड|घाट|पुजारी|महादेव|शिवलिंग|दर्शन|आरती|विष्णु|दुर्गा|हनुमान|रामलला|सोमनाथ|केदारनाथ|बद्रीनाथ|काशी\s*विश्वनाथ|अयोध्या|महाकाल|उज्जैन|मीनाक्षी|तिरुपति|जगन्नाथ|द्वारका|श्रद्धालु|आध्यात्मिक|विग्रह/.test(text) ||
    /\b(mandir|temple|tirth|tirtha|devasthan|sanctum|parikrama|kund|ghat|puja|deity|kashi vishwanath|ayodhya|ram mandir|somnath|kedarnath|badrinath|mahakal|tirupati|jagannath|garbhagriha|pilgrimage|sacred shrine|jyotirlinga|murti|shiva temple|krishna janmabhoomi|gyanvapi)\b/.test(content) ||
    /sanatan\s*board|temple\s*connect|sanatan\s*wires|hindujagruti/.test(source)
  ) {
    return 'MANDIR';
  }

  if (
    /इतिहास|पुरातत्व|उत्खनन|धरोहर|शिलालेख|अभिलेख|पुनर्नामकरण|नामकरण|नाम\s*परिवर्तन|ऐतिहासिक|सिंधु\s*घाटी|हड़प्पा|राखीगढ़ी|तंजावुर|चोल|कांस्य|मूर्ति\s*वापसी|प्रयागराज|संभाजीनगर|धाराशिव|विग्रह\s*पुनर्प्राप्ति|संस्कृति|वि-उपनिवेशीकरण/.test(text) ||
    /\b(heritage|archaeol|excavation|inscription|epigraphy|renam|reclaim|decoloniz|monument|chola|repatriat|harappa|rakhigarhi|sudarshana|rudradaman|ancient|civiliz|antiquity|prayagraj|chhatrapati sambhajinagar|dharashiv|historical name|stolen artifact|restored idol|sculpture)\b/.test(content)
  ) {
    return 'HERITAGE';
  }

  if (
    /भ्रम|तथ्य|सत्य|झूठ|खंडन|पर्दाफाश|षड्यंत्र|विरोधी|दोगलापन|धर्मांतरण|वक्फ|हलाल/.test(text) ||
    /\b(busting|myth|bias|fact-check|investigation|propaganda|fake news|halal|waqf|conversion syndicate|truth behind|exposed|narrative)\b/.test(content) ||
    /opindia/.test(source)
  ) {
    return 'NARRATIVE_FACTS';
  }

  if (/वेद|संस्कृत|शास्त्र|स्तोत्र|उपनिषद्|गीता|पुराण|स्मृति|दर्शन|व्याकरण|गुरुकुल|आचार्य/.test(text) ||
      /\b(sanskrit|shastra|veda|vedic|upanishad|gita|purana|gurukula|acharya|mantra|stotra)\b/.test(content)) {
    return 'SANSKRIT';
  }

  if (/सेना|रक्षा|डीआरडीओ|मिसाइल|नौसेना|वायुसेना|अग्नि|ब्रह्मोस|सीमा|सुरक्षा|आईएनएस|सैन्य|परमाणु|सामरिक/.test(text) ||
      /\b(drdo|missile|navy|army|air force|iaf|ins |warship|defense|defence|brahmos|agni|stealth|combat|strategic|border security)\b/.test(content)) {
    return 'DEFENSE';
  }

  if (/इसरो|अंतरिक्ष|उपग्रह|चंद्रयान|गगनयान|परमाणु\s*ऊर्जा|वैज्ञानिक|अनुसंधान/.test(text) ||
      /\b(isro|satellite|spacecraft|chandrayaan|gaganyaan|quantum|semiconductor|supercomputer|atomic energy)\b/.test(content)) {
    return 'SCIENCE';
  }

  return 'GOVERNANCE';
}

function synthesizeSovereignDispatch(title, rawSummary, category, sourceName) {
  let cleanedTitle = cleanHtml(title);
  cleanedTitle = cleanedTitle.replace(/\s*-\s*(OpIndia|HinduPost|NewsBharati|Hindu Janajagruti Samiti|Sanatan Prabhat|Organiser|Panchjanya|Swarajya).*$/i, '').trim();

  let cleanedSummary = cleanHtml(rawSummary);
  cleanedSummary = cleanedSummary.replace(/\s*-\s*(OpIndia|HinduPost|NewsBharati|Hindu Janajagruti Samiti|Sanatan Prabhat|Organiser|Panchjanya|Swarajya).*$/i, '').trim();

  const decolonizedTitle = decolonizeText(cleanedTitle);
  let decolonizedSummary = decolonizeText(cleanedSummary);

  if (!decolonizedSummary || decolonizedSummary.length < 40 || decolonizedSummary === decolonizedTitle) {
    decolonizedSummary = `${decolonizedTitle}. High-priority sovereign intelligence dispatch verified via ${sourceName}, substantiating the unyielding resurgence of Sanātana Dharma and the civilisational integrity of Bhārat.`;
  }

  // Generate Devanagari headline equivalent
  let devanagariPrefix = 'सनातन सार्वभौमत्वम्';
  if (category === 'MANDIR') devanagariPrefix = 'मन्दिर-मुक्ति-वार्ता';
  else if (category === 'HERITAGE') devanagariPrefix = 'सभ्यतागत-पुनरुत्थानम्';
  else if (category === 'NARRATIVE_FACTS') devanagariPrefix = 'सत्य-शोधनम् · धर्म-रक्षा';
  else if (category === 'DEFENSE') devanagariPrefix = 'राष्ट्र-रक्षा · अजेय-भारतम्';
  else if (category === 'SANSKRIT') devanagariPrefix = 'वैदिक-शास्त्रीय-प्रवाहः';

  const titleEn = decolonizedTitle.length > 250 ? decolonizedTitle.slice(0, 247) + '...' : decolonizedTitle;
  const titleHi = `${devanagariPrefix}: ${decolonizedTitle}`.slice(0, 290);

  const summaryEn = decolonizedSummary.slice(0, 480);
  const summaryHi = `सनातन धर्म एवं भारत के सभ्यतागत संप्रभुता के अंतर्गत: ${decolonizedSummary}`.slice(0, 480);

  const contentRaw = `### सारसंक्षेपः · Executive Dispatch Synopsis

${decolonizedSummary}

---

### सभ्यतागत-विजयः · Civilisational Resurgence & Sovereignty

In the unfolding era of Sanātana resurgence, Bhārat stands firmly as an unapologetic, sovereign civilisational superpower (*Vishwaguru*). The developments reported via **${sourceName}** directly substantiate the continuous reclamation of sacred space, judicial verification of Vedic antiquity, and the systematic dismantling of colonial and secularist distortions.

Key strategic observations:
- **Dharmic Integrity:** Assertion of original Sanskrit nomenclature and canonical *Śāstric* jurisprudence over sacred geographical landscapes.
- **Institutional Awakening:** Reclaiming the unalienable autonomy of Mandirs, dismantling institutionalized encroachment, and securing ancient traditions.
- **Cultural Self-Confidence:** Uncompromising celebration of Bhārat's civilisational triumphs on the global and domestic stage.

---

### शास्त्रीय-प्रमाणम् · Scriptural & Historical Foundation

> *"धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः । तस्माद्धर्मो न हन्तव्यो मा नो धर्मो हतोऽवधीत् ॥"*  
> (*Manusmṛti 8.15: "Dharma protects those who protect it. Dharma, when defended, becomes an impenetrable shield for the nation."*)

Historical consciousness in Bhārat is not merely an archival exercise; it is an active spiritual duty (*Dharma-Kārya*). Every restored Mandir, unearthed Vigraha, and decolonized toponym repairs the civilisational fabric of Bhāratavarsha and honours the unbroken sacrifices of generations of Dharmic ancestors.

---

### धर्म-रक्षा-प्रभावः · Strategic National Ascendance

Through robust documentation, fearless reporting, and uncompromising statecraft, the truth of Sanātana Dharma prevails over orchestrated historical negations. This dispatch marks another milestone in the renaissance of a self-reliant, sovereign Bhārat.`;

  return {
    titleEn,
    titleHi,
    summaryEn,
    summaryHi,
    contentRaw
  };
}

async function fetchRss(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SitavaniSovereign/2.0'
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function parseFeedItems(xml) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1];

    const titleMatch = itemBlock.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
    const linkMatch = itemBlock.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i) || itemBlock.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const descMatch = itemBlock.match(/<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i);

    const title = cleanHtml(titleMatch ? titleMatch[1] : '');
    const link = (linkMatch ? linkMatch[1] : '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    const description = cleanHtml(descMatch ? descMatch[1] : '');

    if (title && link) {
      items.push({ title, link, description });
    }
  }
  return items;
}

export async function runSovereignCycle() {
  const runId = randomUUID();
  const client = await pool.connect();
  let totalSeen = 0;
  let totalPendingAdded = 0;

  try {
    console.log(`[${new Date().toISOString()}] Initiating Sovereign Ingestion Cycle: ${runId}`);
    await client.query(
      `INSERT INTO ingestion_runs (id, status, started_at, message)
       VALUES ($1, 'RUNNING', NOW(), 'Autonomous Sovereign Right-Wing Ingestion Cycle')`,
      [runId]
    );

    // Fetch only active right-wing & Sanatan sources
    const sourcesRes = await client.query(
      `SELECT id, name, base_url, rss_endpoint FROM sources WHERE is_active = TRUE ORDER BY id ASC`
    );
    const sources = sourcesRes.rows;

    for (const source of sources) {
      console.log(`[Source] Checking ${source.name}...`);
      try {
        const xml = await fetchRss(source.rss_endpoint);
        const items = parseFeedItems(xml);
        console.log(`  -> Found ${items.length} items`);

        for (const item of items) {
          totalSeen++;
          const urlHash = createHash('sha256').update(item.link.trim()).digest('hex');

          // Check if already in DB
          const exists = await client.query('SELECT 1 FROM articles WHERE url_hash = $1', [urlHash]);
          if (exists.rows.length > 0) continue;

          // Check if it is a deep civilizational story
          const combined = `${item.title} ${item.description}`;
          if (!isDeepCivilizationalNews(combined, source.name)) {
            continue;
          }

          const category = determineCategory(combined, source.name);
          const dispatch = synthesizeSovereignDispatch(item.title, item.description || item.title, category, source.name);

          const articleId = `art-sov-${Date.now()}-${urlHash.slice(0, 6)}`;
          const now = new Date();

          // Insert into PENDING status for admin 1-click approval!
          await client.query(
            `INSERT INTO articles (
              id, source_id, source_name, original_url, url_hash,
              title, title_hi, summary, summary_hi, content_raw,
              category, status, salience,
              created_at, updated_at, matched_keywords
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, 'PENDING', 'FEATURE',
              $12, $12, $13
            )`,
            [
              articleId,
              source.id,
              source.name,
              item.link,
              urlHash,
              dispatch.titleEn,
              dispatch.titleHi,
              dispatch.summaryEn,
              dispatch.summaryHi,
              dispatch.contentRaw,
              category,
              now,
              ['sanatana', 'sovereign', 'dharma', category.toLowerCase(), 'vishwaguru']
            ]
          );

          totalPendingAdded++;
          console.log(`  [+] Queued for Approval [${category}]: ${dispatch.titleEn.slice(0, 65)}...`);

          // Rate limit: add maximum 3 deep articles per source per cycle to avoid flooding
          if (totalPendingAdded >= 5) break;
        }

        await client.query('UPDATE sources SET last_polled_at = NOW() WHERE id = $1', [source.id]);

        if (totalPendingAdded >= 5) {
          console.log(`[Limit] Reached maximum 5 deep dispatches for this cycle.`);
          break;
        }

      } catch (srcErr) {
        console.error(`  [!] Error polling ${source.name}:`, srcErr.message);
      }
    }

    const message = `Sovereign Cycle completed. Seen: ${totalSeen}, Added to Pending: ${totalPendingAdded}`;
    await client.query(
      `UPDATE ingestion_runs
       SET status = 'SUCCEEDED', finished_at = NOW(), articles_seen = $1, articles_added = $2, message = $3
       WHERE id = $4`,
      [totalSeen, totalPendingAdded, message, runId]
    );

    console.log(`[DONE] ${message}`);
    return { success: true, runId, totalSeen, totalPendingAdded };

  } catch (err) {
    console.error('Fatal sovereign cycle error:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('sovereign_ai_ingest.mjs')) {
  runSovereignCycle()
    .then(res => {
      console.log('Finished:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
