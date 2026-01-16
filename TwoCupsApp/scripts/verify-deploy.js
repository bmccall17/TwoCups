#!/usr/bin/env node
/**
 * Verify that production deployment matches local build
 *
 * Usage: npm run verify:prod
 *
 * This script:
 * 1. Fetches build-manifest.json from production
 * 2. Compares it to local dist/build-manifest.json
 * 3. Reports any mismatches
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Production URL - update this to your Firebase Hosting URL
const PROD_URL = 'https://twocups-2026.web.app';
const LOCAL_MANIFEST_PATH = path.join(__dirname, '..', 'dist', 'build-manifest.json');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        reject(new Error(`404: ${url} not found`));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Two Cups Deploy Verification ===\n');

  // Check local manifest exists
  if (!fs.existsSync(LOCAL_MANIFEST_PATH)) {
    console.error('[ERROR] Local build-manifest.json not found!');
    console.error('Run "npm run build:web" first to generate it.');
    process.exit(1);
  }

  const localManifest = JSON.parse(fs.readFileSync(LOCAL_MANIFEST_PATH, 'utf8'));
  console.log(`Local build: ${localManifest.buildDate}`);
  console.log(`Local files: ${localManifest.fileCount}`);
  console.log('');

  // Fetch production manifest
  console.log(`Fetching: ${PROD_URL}/build-manifest.json`);
  let prodManifest;
  try {
    prodManifest = await fetchJson(`${PROD_URL}/build-manifest.json`);
  } catch (e) {
    console.error(`[ERROR] Could not fetch production manifest: ${e.message}`);
    console.error('');
    console.error('This could mean:');
    console.error('  1. The site has never been deployed with the new build system');
    console.error('  2. The deployment failed');
    console.error('  3. The URL is incorrect');
    process.exit(1);
  }

  console.log(`Prod build:  ${prodManifest.buildDate}`);
  console.log(`Prod files:  ${prodManifest.fileCount}`);
  console.log('');

  // Compare timestamps
  if (localManifest.buildTimestamp === prodManifest.buildTimestamp) {
    console.log('[OK] Build timestamps match!');
    console.log('Production is running the same build as local.');
    process.exit(0);
  }

  console.log('[MISMATCH] Build timestamps differ');
  console.log('');

  // Find file differences
  const localFiles = new Map(localManifest.files.map(f => [f.path, f]));
  const prodFiles = new Map(prodManifest.files.map(f => [f.path, f]));

  const missingInProd = [];
  const missingInLocal = [];
  const hashMismatches = [];

  for (const [path, local] of localFiles) {
    const prod = prodFiles.get(path);
    if (!prod) {
      missingInProd.push(path);
    } else if (prod.hash !== local.hash) {
      hashMismatches.push({ path, local: local.hash, prod: prod.hash });
    }
  }

  for (const [path] of prodFiles) {
    if (!localFiles.has(path)) {
      missingInLocal.push(path);
    }
  }

  if (missingInProd.length > 0) {
    console.log(`Missing in production (${missingInProd.length}):`);
    missingInProd.forEach(f => console.log(`  - ${f}`));
    console.log('');
  }

  if (missingInLocal.length > 0) {
    console.log(`Extra in production (${missingInLocal.length}):`);
    missingInLocal.forEach(f => console.log(`  - ${f}`));
    console.log('');
  }

  if (hashMismatches.length > 0) {
    console.log(`Content differs (${hashMismatches.length}):`);
    hashMismatches.forEach(f => console.log(`  - ${f.path}`));
    console.log('');
  }

  console.log('=== Recommendation ===');
  console.log('Run: npm run deploy');
  console.log('to sync production with your local build.');

  process.exit(1);
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});
