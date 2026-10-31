import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://sitavani:6fea316605148b12505929a57b2dcea9@127.0.0.1:5432/sitavani'
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  // Deactivate generic bureau feeds
  await client.query(`
    UPDATE sources
    SET is_active = FALSE
    WHERE id IN (3, 4, 7, 8, 9);
  `);
  console.log('Deactivated generic government bureaucratic feeds (PIB, DD News).');

  // Ensure Organiser and Panchjanya exist and are active
  const feeds = [
    {
      name: 'Organiser Weekly (Ideological Right-Wing Voice)',
      baseUrl: 'https://organiser.org',
      endpoint: 'https://news.google.com/rss/search?q=site:organiser.org'
    },
    {
      name: 'Panchjanya Rashtriya Wire (Dharmic Awakening)',
      baseUrl: 'https://panchjanya.com',
      endpoint: 'https://news.google.com/rss/search?q=site:panchjanya.com'
    }
  ];

  for (const f of feeds) {
    const existing = await client.query('SELECT id FROM sources WHERE rss_endpoint = $1', [f.endpoint]);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO sources (name, base_url, rss_endpoint, is_active, created_at)
        VALUES ($1, $2, $3, TRUE, NOW())
      `, [f.name, f.baseUrl, f.endpoint]);
      console.log(`Inserted source: ${f.name}`);
    } else {
      await client.query('UPDATE sources SET is_active = TRUE WHERE id = $1', [existing.rows[0].id]);
      console.log(`Updated source to active: ${f.name}`);
    }
  }

  // Ensure all Hindutva sources are active
  await client.query(`
    UPDATE sources
    SET is_active = TRUE
    WHERE name ILIKE '%OpIndia%'
       OR name ILIKE '%HinduPost%'
       OR name ILIKE '%NewsBharati%'
       OR name ILIKE '%Hindu Janajagruti%'
       OR name ILIKE '%Sanatan Prabhat%'
       OR name ILIKE '%Swarajya%'
       OR name ILIKE '%Temple Connect%'
       OR name ILIKE '%Sanatan Board%'
       OR name ILIKE '%BJP%'
       OR name ILIKE '%Organiser%'
       OR name ILIKE '%Panchjanya%';
  `);

  const activeRes = await client.query('SELECT id, name, is_active FROM sources WHERE is_active = TRUE ORDER BY id ASC');
  console.log('Currently Active Sovereign Right-Wing Sources:');
  console.table(activeRes.rows);

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
