import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { protectAdminRequest } from '../../../../lib/adminAuth';
import { jsonResponse, jsonError } from '../../../../lib/api';

const execFileAsync = promisify(execFile);

export const POST: APIRoute = async ({ request }) => {
  const denied = protectAdminRequest(request, true);
  if (denied) return denied;

  try {
    const nodeBin = process.execPath || '/home/ubuntu/.nvm/versions/node/v22.23.4/bin/node';
    const { stdout } = await execFileAsync(nodeBin, ['/var/www/sitavani/scripts/sovereign_ai_ingest.mjs'], {
      timeout: 60000,
      env: process.env
    });

    return jsonResponse({
      success: true,
      message: 'Sovereign right-wing ingestion pulse completed successfully.',
      output: stdout
    });
  } catch (err: any) {
    console.error('Admin trigger ingestion failed:', err);
    return jsonError(err?.message || 'Ingestion cycle execution failed.', 500);
  }
};
