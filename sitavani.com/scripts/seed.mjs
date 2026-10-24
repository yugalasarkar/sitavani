import pg from "pg";
import { INITIAL_SOURCES, DHARMIC_KEYWORDS, INITIAL_ARTICLES } from "/tmp/cleaned_data.js";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Seed keywords
    for (const kw of DHARMIC_KEYWORDS) {
      await client.query(
        "INSERT INTO ingest_keywords (keyword) VALUES ($1) ON CONFLICT (keyword) DO NOTHING",
        [kw.toLowerCase().trim()]
      );
    }
    console.log("Seeded keywords.");

    // 2. Seed sources
    for (const s of INITIAL_SOURCES) {
      await client.query(
        `INSERT INTO sources (id, name, base_url, rss_endpoint, is_active, created_at, last_polled_at)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (rss_endpoint) DO UPDATE SET
           name = EXCLUDED.name,
           base_url = EXCLUDED.base_url,
           is_active = EXCLUDED.is_active`,
        [s.id, s.name, s.base_url, s.rss_endpoint, s.is_active ?? true, s.created_at || new Date(), s.last_polled_at || new Date()]
      );
    }
    await client.query("SELECT setval(pg_get_serial_sequence(\x27sources\x27, \x27id\x27), COALESCE((SELECT MAX(id) FROM sources), 1))");
    console.log("Seeded sources.");

    // 3. Seed articles
    for (const a of INITIAL_ARTICLES) {
      const now = new Date();
      const createdAt = a.created_at ? new Date(a.created_at) : now;
      const approvedAt = a.approved_at ? new Date(a.approved_at) : createdAt;
      const publishedAt = approvedAt;
      const reviewedAt = approvedAt;
      const reviewedBy = "Editorial Desk";
      const status = "PUBLISHED";

      await client.query(
        `INSERT INTO articles (
          id, source_id, source_name, source_identifier, url_hash, original_url,
          title, title_hi, summary, summary_hi, content_raw, image_url, category,
          status, created_at, updated_at, reviewed_at, reviewed_by, approved_at,
          published_at, editorial_notes, matched_keywords, salience
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at`,
        [
          a.id,
          a.source_id,
          a.source_name,
          a.source_identifier || null,
          a.url_hash,
          a.original_url,
          a.title,
          a.title_hi || "",
          a.summary || "",
          a.summary_hi || "",
          a.content_raw || null,
          a.image_url || null,
          a.category,
          status,
          createdAt,
          createdAt,
          reviewedAt,
          reviewedBy,
          approvedAt,
          publishedAt,
          a.editorial_notes || null,
          a.matched_keywords || [],
          a.salience || null
        ]
      );
    }
    console.log("Seeded articles.");

    await client.query("COMMIT");
    console.log("Database seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
