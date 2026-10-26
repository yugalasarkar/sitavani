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
    const { stdout } = await execFileAsync('/usr/bin/node', ['/var/www/sitavani/scripts/ingest_worker.mjs'], {
      timeout: 45000,
      env: process.env
    });

    return jsonResponse({
      success: true,
      message: 'Ingestion cycle executed successfully.',
      output: stdout
    });
  } catch (err: any) {
    console.error('Admin trigger ingestion failed:', err);
    return jsonError(err?.message || 'Ingestion cycle execution failed.', 500);
  }
};
