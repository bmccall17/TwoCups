#!/usr/bin/env node
/**
 * Post-build script for Two Cups PWA
 * - Copies icon assets to dist folder
 * - Adds PWA tags to index.html
 * - Injects build timestamp into service worker for cache busting
 * - Generates build-manifest.json for deployment verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const assetsPath = path.join(__dirname, '..', 'assets');
const distAssetsPath = path.join(distPath, 'assets');
const swSourcePath = path.join(__dirname, '..', 'public', 'sw.js');
const swDestPath = path.join(distPath, 'sw.js');

// Generate build timestamp for cache busting
const BUILD_TIMESTAMP = Date.now().toString();

console.log('=== Two Cups Post-Build ===');
console.log(`Build timestamp: ${BUILD_TIMESTAMP}`);

// Ensure dist/assets directory exists
if (!fs.existsSync(distAssetsPath)) {
  fs.mkdirSync(distAssetsPath, { recursive: true });
}

// Copy icon assets to dist/assets
const iconFiles = ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash-icon.png'];
iconFiles.forEach(file => {
  const src = path.join(assetsPath, file);
  const dest = path.join(distAssetsPath, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[OK] Copied: assets/${file}`);
  } else {
    console.error(`[WARN] Missing: assets/${file}`);
  }
});

// Process service worker - inject build timestamp
if (fs.existsSync(swSourcePath)) {
  let swContent = fs.readFileSync(swSourcePath, 'utf8');
  swContent = swContent.replace(/BUILD_TIMESTAMP/g, BUILD_TIMESTAMP);
  fs.writeFileSync(swDestPath, swContent);
  console.log(`[OK] Service worker updated with timestamp ${BUILD_TIMESTAMP}`);
} else {
  console.error('[ERROR] public/sw.js not found!');
  process.exit(1);
}

// Process index.html
if (!fs.existsSync(indexPath)) {
  console.error('[ERROR] dist/index.html not found! Did expo export run?');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Add manifest link if not present
if (!html.includes('rel="manifest"')) {
  html = html.replace(
    '</head>',
    `<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/assets/icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Two Cups">
</head>`
  );
  console.log('[OK] Added PWA manifest link and Apple meta tags');
}

// Add background color to body style if not present
if (!html.includes('background-color: #0F0F0F')) {
  html = html.replace(
    'body {',
    'body {\n        background-color: #0F0F0F;'
  );
  console.log('[OK] Added dark background color');
}

// Add service worker registration if not present
if (!html.includes('serviceWorker')) {
  const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
              console.log('SW registered:', registration.scope);
              registration.update();
              registration.addEventListener('updatefound', function() {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', function() {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    window.dispatchEvent(new CustomEvent('swUpdate', { detail: registration }));
                  }
                });
              });
            })
            .catch(function(error) {
              console.log('SW registration failed:', error);
            });
          navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SW_UPDATED') {
              window.location.reload();
            }
          });
        });
      }
    </script>
  `;
  html = html.replace('</body>', swScript + '</body>');
  console.log('[OK] Added service worker registration script');
}

// Write the modified index.html
fs.writeFileSync(indexPath, html);

// Generate build manifest for verification
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({
        path: relativePath,
        hash: getFileHash(fullPath),
        size: stat.size
      });
    }
  }
  return files;
}

const buildFiles = getAllFiles(distPath);
const buildManifest = {
  buildTimestamp: BUILD_TIMESTAMP,
  buildDate: new Date().toISOString(),
  fileCount: buildFiles.length,
  files: buildFiles.sort((a, b) => a.path.localeCompare(b.path))
};

fs.writeFileSync(
  path.join(distPath, 'build-manifest.json'),
  JSON.stringify(buildManifest, null, 2)
);

console.log('');
console.log('=== Build Summary ===');
console.log(`Total files: ${buildFiles.length}`);
console.log(`Build manifest: dist/build-manifest.json`);
console.log('');
console.log('Post-build complete!');
