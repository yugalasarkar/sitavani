#!/usr/bin/env node
/**
 * 3-Minute Autonomous Sovereign Pulse Daemon
 * SITAVANI Sovereign Intelligence Wire
 */
import { runSovereignCycle } from './sovereign_ai_ingest.mjs';

const INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

async function loop() {
  console.log(`[Daemon] Sovereign Sanātana Pulse started. Interval: 3 minutes.`);

  while (true) {
    const start = Date.now();
    try {
      console.log(`\n======================================================`);
      console.log(`[Pulse] ${new Date().toISOString()} - Executing 3-Minute Ingestion Pulse...`);
      await runSovereignCycle();
      console.log(`[Pulse] Cycle finished in ${(Date.now() - start) / 1000}s`);
    } catch (err) {
      console.error(`[Pulse Error]`, err);
    }

    console.log(`[Daemon] Sleeping for 3 minutes before next pulse...`);
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
}

loop().catch(err => {
  console.error('[Daemon Fatal]', err);
  process.exit(1);
});
