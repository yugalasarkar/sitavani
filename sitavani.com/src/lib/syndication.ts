/**
 * Sovereign Syndication Engine (Telegram & Public Wires)
 * SITAVANI Sovereign Intelligence Wire
 */

export interface ArticleBroadcastPayload {
  id: string;
  title: string;
  title_hi?: string | null;
  summary: string;
  category: string;
  source_name?: string;
  original_url?: string;
  image_url?: string | null;
}

export interface BroadcastResult {
  success: boolean;
  channel?: string;
  message_id?: number;
  error?: string;
}

function stripAllHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeTelegramHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function broadcastToTelegram(article: ArticleBroadcastPayload): Promise<BroadcastResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '9052032199:AAFmp3U7MEmjbCrUw8kT1bjjqJB7RzgGK5g';
  const chatId = process.env.TELEGRAM_CHAT_ID || '@sitavani';

  if (!token || !chatId) {
    console.warn('[Syndication] Telegram token or chat ID is missing. Skipping broadcast.');
    return { success: false, error: 'Telegram credentials missing' };
  }

  const siteUrl = 'https://sitavani.com';
  const articleUrl = `${siteUrl}/articles/${article.id}`;

  const cleanTitle = escapeTelegramHtml(stripAllHtml(article.title));
  const rawTitleHi = stripAllHtml(article.title_hi || '');
  const cleanTitleHi = rawTitleHi && rawTitleHi !== stripAllHtml(article.title) ? escapeTelegramHtml(rawTitleHi) : '';

  let rawSummary = stripAllHtml(article.summary || '');
  // Prevent duplicate headline repetition in summary
  if (rawSummary.startsWith(stripAllHtml(article.title))) {
    rawSummary = rawSummary.slice(stripAllHtml(article.title).length).replace(/^[\s:—–-]+/, '').trim();
  }
  if (!rawSummary || rawSummary.length < 20) {
    rawSummary = `High-priority sovereign intelligence dispatch verified via ${article.source_name || 'Bhartiya Corridors'}. Full canonical reporting and scriptural documentation available on Sitavani.`;
  }

  const cleanSummary = escapeTelegramHtml(rawSummary).slice(0, 700);
  const cleanSource = escapeTelegramHtml(article.source_name || 'Sitavani Sovereign Wire');

  const captionText = [
    `🚩 <b>सनातन विजय · SANĀTANA VIJAYA</b>`,
    ``,
    `🏛 <b>${cleanTitle}</b>`,
    cleanTitleHi ? `<i>${cleanTitleHi}</i>` : '',
    ``,
    `📜 <b>सारसंक्षेपः · Sovereign Intelligence Brief:</b>`,
    cleanSummary,
    ``,
    `📍 <b>Category:</b> #${article.category}  |  <b>Source:</b> ${cleanSource}`,
    `🔗 <a href="${articleUrl}">वाचनम् · Read Full Sovereign Dispatch on Sitavani ↗</a>`,
    ``,
    `#SanatanDharma #Bharat #Hindutva #Mandir #Sitavani #DharmaRaksha`
  ].filter(line => line !== '').join('\n');

  try {
    // If an image URL is present, try sendPhoto first for rich visual wire presentation
    if (article.image_url && article.image_url.startsWith('http')) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: article.image_url,
            caption: captionText.slice(0, 1024),
            parse_mode: 'HTML'
          })
        });
        const photoData = await photoRes.json();
        if (photoData.ok) {
          console.log(`[Syndication] Broadcasted with Photo to Telegram ${chatId} (msg: ${photoData.result.message_id})`);
          return { success: true, channel: chatId, message_id: photoData.result.message_id };
        }
        console.warn('[Syndication] sendPhoto failed, falling back to sendMessage:', photoData.description);
      } catch (photoErr) {
        console.warn('[Syndication] sendPhoto network error, falling back to sendMessage');
      }
    }

    // Default text message broadcast
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: captionText,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await response.json();
    if (data.ok) {
      console.log(`[Syndication] Successfully broadcasted article ${article.id} to Telegram ${chatId} (msg: ${data.result.message_id})`);
      return {
        success: true,
        channel: chatId,
        message_id: data.result.message_id
      };
    } else {
      console.error('[Syndication] Telegram API returned error:', data);
      return {
        success: false,
        error: data.description || 'Unknown Telegram API error'
      };
    }
  } catch (err: any) {
    console.error('[Syndication] Telegram network error:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
