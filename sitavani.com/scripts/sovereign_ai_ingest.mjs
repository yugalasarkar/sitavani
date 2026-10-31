#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

// Load environment variables
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

  str = str.replace(/<[^>]*>/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
}

function extractImageUrl(itemBlock) {
  // 1. media:content or media:thumbnail
  const mediaMatch = itemBlock.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch && mediaMatch[1] && mediaMatch[1].startsWith('http')) return mediaMatch[1];

  // 2. enclosure
  const encMatch = itemBlock.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i) || itemBlock.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (encMatch && encMatch[1] && encMatch[1].startsWith('http')) return encMatch[1];

  // 3. img tag in description or content
  const imgMatch = itemBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http')) return imgMatch[1];

  return null;
}

function isDeepCivilizationalNews(text, sourceName) {
  const combinedExclusions = `${text} ${sourceName}`.toLowerCase();
  
  // 1. Strict Geographic & Geopolitical Exclusion:
  // Reject foreign Middle Eastern conflicts, Israel/Iran/Gaza/Houthi politics, foreign elections
  if (/\b(iran|tehran|israel|tel aviv|netanyahu|knesset|ben-gvir|gaza|palestine|hamas|hezbollah|lebanon|beirut|yemen|houthi|houthis|syria|damascus|iraq|baghdad|ukraine|kyiv|zelensky|russia|moscow|putin|brazil|lula|italian|italy|meloni|us election|trump|biden|kamala|taiwan|china-philippines|west asia conflict)\b/i.test(combinedExclusions)) {
    return false;
  }

  // 2. Reject Graphic Crimes, Sexual Violence, Brutality, and Gore (NO CRIME BLOTTER):
  if (/\b(rape|raped|rapist|gangrape|molest|pocso|murder|murdered|killer|homicide|hanged till death|electric saw|beheaded|throat slit|hacked to death|stabbed|suicide|corpse|dead body|mutilat|child abuse|pedophile|domestic violence)\b/i.test(combinedExclusions)) {
    return false;
  }

  // 3. Reject Sordid Scandals, Petty Crimes, Vice, and Defeatist Whining:
  if (/\b(scam|extortion|bribe|liquor|alcohol|drunk|cockroach|weed|cannabis|narcotics|drug peddler|prostitution|quarrel|jailbreak|sub-jail|prisons dgp|theft beneath|underneath a cow-dung|vendor arrested|domestic workers detained|hit and run|car crash|accident|traffic challan|how long will sanatanis remain asleep|eighth class citizens|victim card|plight of hindus|helpless|pathetic condition|humiliation|smoking|dental|hospital|pyare khan|jail bharo)\b/i.test(combinedExclusions)) {
    return false;
  }

  // 4. Reject foreign religious trivia & internal petty sectarian disputes
  if (/mosque.*closed|church.*wedding|pastor arrested|madrasa curriculum|fatwa/i.test(combinedExclusions)) {
    return false;
  }

  // 5. Exclude trivial bureaucratic/commercial noise & party political bickering
  if (
    /postal stamp|commemorative stamp|audit manual|spectrum auction|gst circular|customs duty on|filing return|tender notice|telecom license|bjp mobile app|membership|bjp e-library|manifesto|chapter \d+|sarcastic trolling|amruta fadnavis|naseeruddin|diljit dosanjh|rahul baba|jio ipo/i.test(combinedExclusions)
  ) {
    return false;
  }

  // 6. MANDATORY POSITIVE CIVILISATIONAL & SOVEREIGN TRIUMPH:
  // Must positively affirm Mandir restoration, Vedic heritage, archaeological discoveries, defense supremacy, scientific breakthroughs, or dharmic resurgence!
  // CRITICAL: Tested strictly against ARTICLE TEXT (not source name!)
  const hasPositiveDevanagari = /भव्य|गौरव|विजय|प्रतिष्ठा|उत्सव|दीपावली|दीपोत्सव|विजयादशमी|शस्त्र\s*पूजन|तीर्थ|मंदिर|मन्दिर|महाकुंभ|कुंभ|काशी|अयोध्या|सोमनाथ|केदारनाथ|बद्रीनाथ|शबरीमाला|विग्रह|पुरातत्व|उत्खनन|शिलालेख|अभिलेख|वेद|उपनिषद्|संस्कृत|शास्त्र|गुरुकुल|डीआरडीओ|इसरो|मिसाइल|अग्नि|ब्रह्मोस|नौसेना|वायुसेना|सैन्य|सुरक्षा|गोरक्षा|संप्रभुता|पुनर्नामकरण/.test(text);

  const hasPositiveEnglish = /\b(grand|celebrat|record|diwali|deepotsav|vijayadashami|shastra puja|consecrat|mandir|temple|pilgrimag|tirth|tirtha|vigraha|pran pratishtha|kashi|ayodhya|mathura|somnath|kedarnath|badrinath|sabarimala|tirupati|jagannath|asi|archaeol|excavation|inscription|epigraphy|chola|saraswati|harappa|repatriat|restor|decoloniz|reclaim|sanskrit|veda|vedic|upanishad|gurukul|drdo|brahmos|agni|missile|ins |navy|air force|iaf|army|defense|defence|isro|chandrayaan|gaganyaan|space|quantum|semiconductor|gau raksha|cow protection|heritage|sovereign|renaissance|resurgence|triumph)\b/i.test(text);

  return hasPositiveDevanagari || hasPositiveEnglish;
}

function determineCategory(text, sourceName = '') {
  const content = (text || '').toLowerCase();

  // 1. MANDIR: Only if content is actually about temples, vigrahas, pujas, teerthas
  if (
    /मंदिर|मन्दिर|तीर्थ|देवस्थान|गर्भगृह|परिक्रमा|कुण्ड|घाट|पुजारी|महादेव|शिवलिंग|दर्शन|आरती|विष्णु|दुर्गा|हनुमान|रामलला|सोमनाथ|केदारनाथ|बद्रीनाथ|काशी\s*विश्वनाथ|अयोध्या|महाकाल|उज्जैन|मीनाक्षी|तिरुपति|जगन्नाथ|द्वारका|श्रद्धालु|आध्यात्मिक|विग्रह|सबरीमाला|शबरीमाला/.test(text) ||
    /\b(mandir|temple|tirth|tirtha|sabarimala|devasthan|sanctum|parikrama|kund|ghat|puja|deity|kashi vishwanath|ayodhya|ram mandir|somnath|kedarnath|badrinath|mahakal|tirupati|jagannath|garbhagriha|pilgrimage|sacred shrine|jyotirlinga|murti|shiva temple|krishna janmabhoomi|gyanvapi|bhojshala)\b/.test(content)
  ) {
    return 'MANDIR';
  }

  // 2. HERITAGE & ITIHASA
  if (
    /इतिहास|पुरातत्व|उत्खनन|धरोहर|शिलालेख|अभिलेख|पुनर्नामकरण|नामकरण|नाम\s*परिवर्तन|ऐतिहासिक|सिंधु\s*घाटी|हड़प्पा|राखीगढ़ी|तंजावुर|चोल|कांस्य|मूर्ति\s*वापसी|प्रयागराज|संभाजीनगर|धाराशिव|विग्रह\s*पुनर्प्राप्ति|संस्कृति|वि-उपनिवेशीकरण/.test(text) ||
    /\b(heritage|archaeol|excavation|inscription|epigraphy|renam|reclaim|decoloniz|monument|chola|repatriat|harappa|rakhigarhi|sudarshana|rudradaman|ancient|civiliz|antiquity|prayagraj|chhatrapati sambhajinagar|dharashiv|historical name|stolen artifact|restored idol|sculpture)\b/.test(content)
  ) {
    return 'HERITAGE';
  }

  // 3. NARRATIVE_FACTS
  if (
    /भ्रम|तथ्य|सत्य|झूठ|खंडन|पर्दाफाश|षड्यंत्र|विरोधी|दोगलापन|धर्मांतरण|वक्फ|हलाल|विवाद|अदालत/.test(text) ||
    /\b(busting|myth|bias|fact-check|investigation|propaganda|fake news|halal|waqf|conversion syndicate|truth behind|exposed|narrative|controversy|court|bench|cji)\b/.test(content)
  ) {
    return 'NARRATIVE_FACTS';
  }

  // 4. SANSKRIT
  if (/वेद|संस्कृत|शास्त्र|स्तोत्र|उपनिषद्|गीता|पुराण|स्मृति|दर्शन|व्याकरण|गुरुकुल|आचार्य/.test(text) ||
      /\b(sanskrit|shastra|veda|vedic|upanishad|gita|purana|gurukula|acharya|mantra|stotra)\b/.test(content)) {
    return 'SANSKRIT';
  }

  // 5. DEFENSE
  if (/सेना|रक्षा|डीआरडीओ|मिसाइल|नौसेना|वायुसेना|अग्नि|ब्रह्मोस|सीमा|सुरक्षा|आईएनएस|सैन्य|परमाणु|सामरिक/.test(text) ||
      /\b(drdo|missile|navy|army|air force|iaf|ins |warship|defense|defence|brahmos|agni|stealth|combat|strategic|border security)\b/.test(content)) {
    return 'DEFENSE';
  }

  // 6. SCIENCE
  if (/इसरो|अंतरिक्ष|उपग्रह|चंद्रयान|गगनयान|परमाणु\s*ऊर्जा|वैज्ञानिक|अनुसंधान/.test(text) ||
      /\b(isro|satellite|spacecraft|chandrayaan|gaganyaan|quantum|semiconductor|supercomputer|atomic energy)\b/.test(content)) {
    return 'SCIENCE';
  }

  return 'GOVERNANCE';
}

function synthesizeSovereignDispatch(title, rawSummary, rawContent, category, sourceName) {
  let cleanedTitle = cleanHtml(title);
  cleanedTitle = cleanedTitle.replace(/\s*-\s*(OpIndia|HinduPost|NewsBharati|Hindu Janajagruti Samiti|Sanatan Prabhat|Organiser|Panchjanya|Swarajya|BJP).*$/i, '').trim();

  let cleanedSummary = cleanHtml(rawSummary);
  cleanedSummary = cleanedSummary.replace(/\s*-\s*(OpIndia|HinduPost|NewsBharati|Hindu Janajagruti Samiti|Sanatan Prabhat|Organiser|Panchjanya|Swarajya|BJP).*$/i, '').trim();

  let cleanedBody = cleanHtml(rawContent || rawSummary);

  const decolonizedTitle = decolonizeText(cleanedTitle);
  let decolonizedSummary = decolonizeText(cleanedSummary);

  // Detect if summary is trivial or just the headline repeated
  const titleWords = cleanedTitle.split(/\s+/).length;
  const summaryWords = cleanedSummary.split(/\s+/).length;

  if (summaryWords < 25 || summaryWords <= titleWords + 6 || decolonizedSummary.length < 140) {
    if (cleanedBody && cleanedBody.length > 150 && cleanedBody.split(/\s+/).length > 30) {
      decolonizedSummary = decolonizeText(cleanedBody.slice(0, 500));
    } else {
      decolonizedSummary = `Sovereign intelligence dispatch concerning ${decolonizedTitle}. Verified reports from ${sourceName} reveal critical developments advancing civilisational vigilance, legal accountability, and the institutional defense of Sanātana Dharma traditions across Bhāratavarsha.`;
    }
  }

  // Devanagari title formatting
  let devPrefix = 'सनातन-सार्वभौमत्वम्';
  if (category === 'MANDIR') devPrefix = 'मन्दिर-मर्यादा एवं तीर्थ-रक्षा';
  else if (category === 'HERITAGE') devPrefix = 'सभ्यतागत-पुनरुत्थानम्';
  else if (category === 'NARRATIVE_FACTS') devPrefix = 'सत्य-शोधनम् · धर्म-रक्षा';
  else if (category === 'DEFENSE') devPrefix = 'राष्ट्र-रक्षा एवं सामरिक-विजयः';
  else if (category === 'SANSKRIT') devPrefix = 'वैदिक-शास्त्रीय-प्रवाहः';

  const titleEn = decolonizedTitle.length > 250 ? decolonizedTitle.slice(0, 247) + '...' : decolonizedTitle;
  
  // If the incoming title is already Devanagari, keep it pure Devanagari
  const isDevanagari = /[\u0900-\u097F]/.test(decolonizedTitle);
  let titleHi = '';
  if (isDevanagari) {
    titleHi = `${devPrefix}: ${decolonizedTitle}`.slice(0, 290);
  } else {
    let specificHi = '';
    const lowTitle = decolonizedTitle.toLowerCase();
    if (/ayodhya|diwali|deepotsav/.test(lowTitle)) {
      specificHi = 'अयोध्या धाम: भव्य दीपोत्सव एवं सनातन विश्व-कीर्तिमान';
    } else if (/somnath|kashi|kedarnath|badrinath|sabarimala|tirupati|mathura/.test(lowTitle)) {
      specificHi = 'पवित्र तीर्थ-क्षेत्र एवं मन्दिर-परम्परा का दिव्य संरक्षण';
    } else if (/mandir|temple|vigraha|shrine/.test(lowTitle)) {
      specificHi = 'मन्दिर-पुनरुद्धार एवं सनातन देवस्थान की रक्षा';
    } else if (/asi|archaeol|excavat|ancient|epigraph/.test(lowTitle)) {
      specificHi = 'पुरातत्व-साक्ष्य: वैदिक सभ्यता की प्राचीनता का ऐतिहासिक प्रमाण';
    } else if (/drdo|brahmos|agni|missile|navy|army|air force|defense/.test(lowTitle)) {
      specificHi = 'अजेय भारत: सामरिक सुरक्षा एवं स्वदेशी रक्षा-प्रणाली का पराक्रम';
    } else if (/isro|space|satellite|chandrayaan/.test(lowTitle)) {
      specificHi = 'भारतीय ज्ञान-विज्ञान: अन्तरिक्ष में भारत का ऐतिहासिक विजय-अभियान';
    } else if (/cow|gau|slaughter/.test(lowTitle)) {
      specificHi = 'गो-रक्षा एवं धर्म-मर्यादा: भारतीय न्यायपालिका का ऐतिहासिक निर्णय';
    } else if (/shastra|puja|vijayadashami|sanskrit|veda/.test(lowTitle)) {
      specificHi = 'शस्त्र-पूजन एवं शास्त्रीय मर्यादा: राष्ट्र-चेतना का पुनर्जागरण';
    } else {
      specificHi = `${devPrefix} [${category}]`;
    }
    titleHi = `${devPrefix} · ${specificHi}`.slice(0, 290);
  }

  const summaryEn = decolonizedSummary.slice(0, 490);
  const summaryHi = `सनातन धर्म एवं भारत के संप्रभुता-हित में: ${decolonizedSummary}`.slice(0, 490);

  const bodyExcerpt = cleanedBody.length > 300 ? cleanedBody : decolonizedSummary;

  const contentRaw = `### सारसंक्षेपः · Executive Dispatch Synopsis

${decolonizedSummary}

---

### सभ्यतागत-विजयः · Civilisational Resurgence & Sovereignty

${bodyExcerpt}

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
    const contentMatch = itemBlock.match(/<content:encoded(?:\s[^>]*)?>([\s\S]*?)<\/content:encoded>/i);
    const pubDateMatch = itemBlock.match(/<(?:pubDate|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date)>/i);

    const title = cleanHtml(titleMatch ? titleMatch[1] : '');
    const link = (linkMatch ? linkMatch[1] : '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    const description = cleanHtml(descMatch ? descMatch[1] : '');
    const content = cleanHtml(contentMatch ? contentMatch[1] : description);
    const imageUrl = extractImageUrl(itemBlock);

    let pubDate = new Date();
    if (pubDateMatch) {
      const parsed = new Date(pubDateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed;
      }
    }

    if (title && link) {
      items.push({ title, link, description, content, imageUrl, pubDate });
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

    // Fetch active sources, prioritizing direct rich RSS feeds over Google News proxies
    const sourcesRes = await client.query(
      `SELECT id, name, base_url, rss_endpoint FROM sources 
       WHERE is_active = TRUE 
       ORDER BY CASE WHEN rss_endpoint LIKE '%google%' THEN 1 ELSE 0 END, id ASC`
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

          const combined = `${item.title} ${item.description} ${item.content}`;

          // MANDATORY POSITIVE CIVILISATIONAL GATE:
          // Strictly reject gore, crimes, scandals, whining, foreign geopolitics!
          if (!isDeepCivilizationalNews(combined, source.name)) {
            continue;
          }

          const category = determineCategory(combined, source.name);
          const dispatch = synthesizeSovereignDispatch(item.title, item.description, item.content, category, source.name);

          const articleId = `art-sov-${Date.now()}-${urlHash.slice(0, 6)}`;
          const now = new Date();
          const itemCreatedAt = item.pubDate || now;

          // Insert into PENDING status for admin 1-click approval
          await client.query(
            `INSERT INTO articles (
              id, source_id, source_name, original_url, url_hash,
              title, title_hi, summary, summary_hi, content_raw,
              image_url, category, status, salience,
              created_at, updated_at, matched_keywords
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, 'PENDING', 'FEATURE',
              $13, $14, $15
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
              item.imageUrl || null,
              category,
              itemCreatedAt,
              now,
              ['sanatana', 'sovereign', 'dharma', category.toLowerCase(), 'vishwaguru']
            ]
          );

          totalPendingAdded++;
          console.log(`  [+] Queued for Approval [${category}]: ${dispatch.titleEn.slice(0, 65)}...`);

          if (totalPendingAdded >= 5) break;
        }

        await client.query('UPDATE sources SET last_polled_at = NOW() WHERE id = $1', [source.id]);

        if (totalPendingAdded >= 5) {
          console.log(`[Limit] Reached 5 deep dispatches for this cycle.`);
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
