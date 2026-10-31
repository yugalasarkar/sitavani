/**
 * Sovereign Sanātana Terminology & Decolonization Dictionary
 * SITAVANI Sovereign Intelligence Wire
 *
 * Enforces authentic Sanskrit, Dharmic, and civilisational vocabulary.
 * Decolonizes foreign, colonial, or secularized distortions.
 */

export interface ReplacementRule {
  pattern: RegExp;
  replacement: string;
}

export const SOVEREIGN_REPLACEMENTS: ReplacementRule[] = [
  // 1. Core Dharmic Conceptions
  { pattern: /\bHinduism\b/gi, replacement: 'Sanātana Dharma' },
  { pattern: /\bHindus\b/g, replacement: 'Sanātanis' },
  { pattern: /\bHindu\b/g, replacement: 'Sanātani' },
  { pattern: /\banti-hindu\b/gi, replacement: 'anti-Sanātana' },

  // 2. Sacred Geography and Architecture
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

  // 3. Civilisational Nationhood
  { pattern: /\bIndia's\b/g, replacement: "Bhārat's" },
  { pattern: /\bIndia\b/g, replacement: 'Bhārat' },
  { pattern: /\bIndian\b/g, replacement: 'Bhāratīya' },
  { pattern: /\bIndians\b/g, replacement: 'Bhāratīyas' },

  // 4. Decolonized Ancient Sanskrit City & Region Names
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

  // 5. Contested & Reclaimed Heritage Sites
  { pattern: /\bGyanvapi\b/gi, replacement: 'Kāśī Viśvanātha Jñānavāpī Mandir' },
  { pattern: /\bShahi Idgah\b/gi, replacement: 'Mathurā Śrī Kṛṣṇa Janmabhūmi Complex' },
  { pattern: /\bBabri Masjid\b/gi, replacement: 'Reclaimed Śrī Rāma Janmabhūmi' },
  { pattern: /\bQutub Minar\b/gi, replacement: 'Viṣṇu Stambha' },
  { pattern: /\bBhojshala\b/gi, replacement: 'Mā Sarasvatī Bhojaśālā Mandir' }
];

/**
 * Normalizes any text to strictly adhere to authentic Sanatana terminology.
 */
export function decolonizeText(text: string): string {
  if (!text) return '';
  let result = text;
  for (const { pattern, replacement } of SOVEREIGN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Strips raw HTML and decodes entities safely.
 */
export function cleanRawHtml(html: string): string {
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
