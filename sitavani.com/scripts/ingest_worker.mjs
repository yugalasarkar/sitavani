#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const { Pool } = pg;

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

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtml(html) {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function sanitizeSovereignTerms(text) {
  if (!text) return '';
  return text
    .replace(/\bIndia\b/g, 'Bharat')
    .replace(/\bIndian\b/g, 'Bhartiya')
    .replace(/\bIndia's\b/g, "Bharat's");
}

function determineCategory(text, sourceName = '') {
  const lower = (text + ' ' + sourceName).toLowerCase();
  if (/temple|excavation|archaeol|monument|mandir|heritage|inscription|chola|harappa|purana|kashi|varanasi|ayodhya|tirtha|deity|sculpture|culture/.test(lower)) {
    return 'HERITAGE';
  }
  if (/drdo|defense|defence|army|navy|air force|military|missile|tejas|radar|frigate|warship|ammunition|combat|patrol|squadron/.test(lower)) {
    return 'DEFENSE';
  }
  if (/isro|space|satellite|chandrayaan|payload|quantum|cryogenic|orbit|cosmic|astronomy|physics|biotech|nanotech|algorithm|ai|deep space|tech|science/.test(lower)) {
    return 'SCIENCE';
  }
  if (/sanskrit|shastra|vedic|veda|upanishad|manuscript|panini|ashtadhyayi|vyakarana|bhashya|samhita/.test(lower)) {
    return 'SANSKRIT';
  }
  if (/ramsar|wetland|sanctuary|dharma|pilgrimage|kund|ghat|sacred/.test(lower)) {
    return 'MANDIR';
  }
  if (/pib|cabinet|prime minister|president|niti aayog|governance|reform|parliament|ordinance|infrastructure|highway|railways/.test(lower)) {
    return 'GOVERNANCE';
  }
  return 'GENERAL';
}

function extractImage(itemXml) {
  const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (encMatch && encMatch[1]) return encMatch[1];
  
  const mediaMatch = itemXml.match(/<media:(content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch && mediaMatch[2]) return mediaMatch[2];

  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];

  return null;
}

function parseFeedItems(xmlText) {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title[\s>]([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link[\s>]([\s\S]*?)<\/link>/i) || itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
    const descMatch = itemXml.match(/<(description|content:encoded)[\s>]([\s\S]*?)<\/\1>/i);
    const pubDateMatch = itemXml.match(/<pubDate[\s>]([\s\S]*?)<\/pubDate>/i);

    const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
    const rawLink = linkMatch ? (linkMatch[2] ? linkMatch[2].trim() : stripHtml(linkMatch[1])) : '';
    const rawDesc = descMatch ? stripHtml(descMatch[2]) : '';
    const rawPubDate = pubDateMatch ? stripHtml(pubDateMatch[1]) : '';
    const imageUrl = extractImage(itemXml);

    if (rawTitle && rawLink && rawLink.startsWith('http')) {
      items.push({
        title: rawTitle,
        link: rawLink,
        description: rawDesc,
        pubDate: rawPubDate,
        imageUrl: imageUrl
      });
    }
  }

  if (items.length === 0) {
    const entryMatches = xmlText.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    for (const entryXml of entryMatches) {
      const titleMatch = entryXml.match(/<title[\s>]([\s\S]*?)<\/title>/i);
      const linkMatch = entryXml.match(/<link[^>]+href=["']([^"']+)["']/i);
      const summaryMatch = entryXml.match(/<(summary|content)[\s>]([\s\S]*?)<\/\1>/i);
      const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
      const rawLink = linkMatch ? linkMatch[1].trim() : '';
      const rawSummary = summaryMatch ? stripHtml(summaryMatch[2]) : '';
      const imageUrl = extractImage(entryXml);

      if (rawTitle && rawLink && rawLink.startsWith('http')) {
        items.push({
          title: rawTitle,
          link: rawLink,
          description: rawSummary,
          pubDate: '',
          imageUrl: imageUrl
        });
      }
    }
  }

  return items;
}

async function fetchRssFeed(url) {
  const { stdout } = await execFileAsync('curl', [
    '-sL',
    '--max-time', '15',
    '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    url
  ]);
  return stdout;
}


async function enrichWithQwen(title, summary) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);
  try {
    const prompt = `Title: ${title}
Summary: ${summary.slice(0, 280)}`;
    const res = await fetch("http://127.0.0.1:8081/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are SITAVANI sovereign news editor. Output strict JSON with keys title_hi and summary_hi in Hindi Devanagari only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 90,
        temperature: 0.1
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        titleHi: parsed.title_hi ? sanitizeSovereignTerms(parsed.title_hi.trim()) : null,
        summaryHi: parsed.summary_hi ? sanitizeSovereignTerms(parsed.summary_hi.trim()) : null
      };
    }
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

export async function runIngestion() {
  const runId = randomUUID();
  const startTime = new Date();
  let totalSeen = 0;
  let totalAdded = 0;
  const client = await pool.connect();

  console.log(`[${startTime.toISOString()}] Starting SITAVANI Autonomous Ingestion Run [${runId}]`);

  try {
    await client.query(
      `INSERT INTO ingestion_runs (id, status, started_at, articles_seen, articles_added, message)
       VALUES ($1, $2, $3, 0, 0, $4)`,
      [runId, 'RUNNING', startTime, 'Ingestion cycle initiated.']
    );

    const sourcesRes = await client.query(
      `SELECT id, name, base_url, rss_endpoint FROM sources WHERE is_active = TRUE ORDER BY id ASC`
    );
    const sources = sourcesRes.rows;

    for (const source of sources) {
      console.log(`Polling source: ${source.name} (${source.rss_endpoint})`);
      try {
        const xmlText = await fetchRssFeed(source.rss_endpoint);
        if (!xmlText || xmlText.trim().length === 0) {
          console.warn(`[WARN] Empty response from ${source.name}`);
          continue;
        }

        const items = parseFeedItems(xmlText);
        console.log(`Found ${items.length} items in ${source.name}`);

        for (const item of items) {
          totalSeen++;
          const urlHash = createHash('sha256').update(item.link.trim()).digest('hex');

          const existing = await client.query('SELECT 1 FROM articles WHERE url_hash = $1', [urlHash]);
          if (existing.rows.length > 0) {
            continue;
          }

          const combinedText = `${item.title} ${item.description}`;
          const category = determineCategory(combinedText, source.name);
          const sanitizedTitle = sanitizeSovereignTerms(item.title);
          const sanitizedSummary = sanitizeSovereignTerms(item.description || item.title);

          let titleEn = sanitizedTitle;
          let titleHi = sanitizedTitle;
          let summaryEn = sanitizedSummary.slice(0, 500);
          let summaryHi = sanitizedSummary.slice(0, 500);

          try {
            const enriched = await enrichWithQwen(sanitizedTitle, sanitizedSummary);
            if (enriched) {
              if (enriched.titleHi) titleHi = enriched.titleHi;
              if (enriched.summaryHi) summaryHi = enriched.summaryHi;
            }
          } catch (_) {}

          const articleId = `art-wire-${Date.now()}-${urlHash.slice(0, 6)}`;
          const now = new Date();

          await client.query(
            `INSERT INTO articles (
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
            )`,
            [
              articleId,
              source.id,
              source.name,
              item.link,
              urlHash,
              titleEn.slice(0, 300),
              titleHi.slice(0, 300),
              summaryEn,
              summaryHi,
              item.description,
              item.imageUrl || null,
              category,
              'PUBLISHED',
              'WIRE',
              now,
              'INGEST_DAEMON',
              ['sovereign', 'bharat', category.toLowerCase()]
            ]
          );

          totalAdded++;
          console.log(`  [+] Ingested [${category}]: ${titleEn.slice(0, 60)}...`);
        }

        await client.query('UPDATE sources SET last_polled_at = NOW() WHERE id = $1', [source.id]);

      } catch (srcErr) {
        console.error(`Error polling source ${source.name}:`, srcErr.message);
        await client.query(
          `INSERT INTO ingestion_logs (id, run_id, level, message, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [`log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, runId, 'WARN', `Polling failed for ${source.name}: ${srcErr.message}`, JSON.stringify({ source_id: source.id })]
        );
      }
    }

    const finishTime = new Date();
    const message = `Ingestion completed successfully. Seen: ${totalSeen}, Added: ${totalAdded}`;

    await client.query(
      `UPDATE ingestion_runs 
       SET status = $1, finished_at = $2, articles_seen = $3, articles_added = $4, message = $5
       WHERE id = $6`,
      ['SUCCEEDED', finishTime, totalSeen, totalAdded, message, runId]
    );

    await client.query(
      `INSERT INTO ingestion_logs (id, run_id, level, message, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [`log-${Date.now()}`, runId, 'SUCCESS', message, JSON.stringify({ seen: totalSeen, added: totalAdded })]
    );

    console.log(`[${finishTime.toISOString()}] ${message}`);
    return { success: true, runId, totalSeen, totalAdded, message };

  } catch (err) {
    console.error('Fatal error during ingestion run:', err);
    try {
      await client.query(
        `UPDATE ingestion_runs 
         SET status = $1, finished_at = NOW(), articles_seen = $2, articles_added = $3, message = $4
         WHERE id = $5`,
        ['FAILED', totalSeen, totalAdded, `Fatal error: ${err.message}`, runId]
      );
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('ingest_worker.mjs')) {
  runIngestion()
    .then(res => {
      console.log('Result:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
}
