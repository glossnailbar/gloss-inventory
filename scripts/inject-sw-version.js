#!/usr/bin/env node
/**
 * Post-build script to inject build timestamp into service worker
 * This enables cache busting for PWA updates
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = './dist';
const swPath = join(distDir, 'service-worker.js');

// Generate timestamp (YYYY-MM-DD-HHMMSS)
const now = new Date();
const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];

console.log('📦 Injecting build timestamp:', timestamp);

try {
  let content = readFileSync(swPath, 'utf-8');

  // Replace the placeholder with actual timestamp
  content = content.replace(
    /BUILD_TIMESTAMP_PLACEHOLDER/g,
    timestamp
  );

  writeFileSync(swPath, content);
  console.log('✅ Service worker updated with cache-busting version');
  console.log('   Cache name will be:', `gloss-inventory-v1-${timestamp}`);
} catch (err) {
  console.error('❌ Failed to update service worker:', err.message);
  process.exit(1);
}
