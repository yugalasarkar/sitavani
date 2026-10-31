import type { APIRoute } from 'astro';
import { executeAction } from '../../../../data/store';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { dataErrorResponse, jsonError, jsonResponse } from '../../../../lib/api';
import { broadcastToTelegram } from '../../../../lib/syndication';

const validActions = new Set(['APPROVE', 'UPDATE_AND_APPROVE', 'PUBLISH', 'DISCARD', 'UNPUBLISH']);
const validCategories = new Set(['HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL']);
const textLimits: Record<string, number> = {
  modified_title: 300,
  modified_title_hi: 300,
  modified_summary: 5000,
  modified_summary_hi: 5000,
  editorial_notes: 5000
};

export const POST: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Invalid request body.', 400);
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }
  const input = body as Record<string, unknown>;
  if (typeof input.article_id !== 'string' || input.article_id.length > 100 ||
    typeof input.action !== 'string' || !validActions.has(input.action)) {
    return jsonError('A valid article ID and editorial action are required.', 400);
  }
  if (input.modified_title !== undefined && typeof input.modified_title === 'string' && !input.modified_title.trim()) {
    return jsonError('An edited title cannot be empty.', 400);
  }
  for (const [field, maxLength] of Object.entries(textLimits)) {
    if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > maxLength)) {
      return jsonError(`${field} must be text no longer than ${maxLength} characters.`, 400);
    }
  }
  if (input.category !== undefined && (typeof input.category !== 'string' || !validCategories.has(input.category))) {
    return jsonError('Unknown article category.', 400);
  }
  try {
    const result = await executeAction(input as Parameters<typeof executeAction>[0]);

    if ('error' in result) {
      return jsonError(result.error, result.status || 400);
    }

    // Trigger Telegram broadcast upon publishing / approving
    let telegramResult = null;
    if (result.success && result.article && result.article.status === 'PUBLISHED') {
      try {
        telegramResult = await broadcastToTelegram(result.article);
      } catch (tgErr: any) {
        console.error('Failed to broadcast to Telegram:', tgErr);
        telegramResult = { success: false, error: tgErr?.message };
      }
    }

    return jsonResponse({
      ...result,
      telegram: telegramResult
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
};
