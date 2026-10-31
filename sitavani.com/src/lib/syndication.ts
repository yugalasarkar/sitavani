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
}

export interface BroadcastResult {
  success: boolean;
  channel?: string;
  message_id?: number;
  error?: string;
}

export async function broadcastToTelegram(article: ArticleBroadcastPayload): Promise<BroadcastResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '9052032199:AAFmp3U7MEmjbCrUw8kT1bjjqJB7RzgGK5g';
  const chatId = process.env.TELEGRAM_CHAT_ID || '@sitavani';

  if (!token || !chatId) {
    console.warn('[Syndication] Telegram token or chat ID is missing. Skipping broadcast.');
    return { success: false, error: 'Telegram credentials missing' };
  }

  // Format clean headline and text
  const siteUrl = 'https://sitavani.com';
  const articleUrl = `${siteUrl}/articles/${article.id}`;

  const cleanTitle = (article.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanTitleHi = (article.title_hi || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanSummary = (article.summary || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 700);
  const cleanSource = (article.source_name || 'Sitavani Sovereign Wire').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const messageText = [
    `🚩 <b>सनातन विजय · SANĀTANA VIJAYA</b>`,
    ``,
    `🏛 <b>${cleanTitle}</b>`,
    cleanTitleHi ? `<i>${cleanTitleHi}</i>` : '',
    ``,
    `📜 <b>सारसंक्षेपः · Executive Dispatch:</b>`,
    cleanSummary,
    ``,
    `📍 <b>Category:</b> #${article.category}  |  <b>Source:</b> ${cleanSource}`,
    `🔗 <a href="${articleUrl}">वाचनम् · Read Full Sovereign Dispatch ↗</a>`,
    ``,
    `#SanatanDharma #Bharat #Hindutva #Mandir #Sitavani #DharmaRaksha`
  ].filter(line => line !== '').join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
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
