#!/usr/bin/env node
/**
 * Post-build script for Two Cups PWA
 * Adds service worker registration and manifest link to index.html
 * Copies icon assets to dist folder
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const assetsPath = path.join(__dirname, '..', 'assets');
const distAssetsPath = path.join(distPath, 'assets');

console.log('Running post-build PWA setup...');

// Copy icon assets to dist/assets
const iconFiles = ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash-icon.png'];
iconFiles.forEach(file => {
  const src = path.join(assetsPath, file);
  const dest = path.join(distAssetsPath, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
});

// Read the current index.html
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
}

// Add background color to body style if not present
if (!html.includes('background-color: #0F0F0F')) {
  html = html.replace(
    'body {',
    'body {\n        background-color: #0F0F0F;'
  );
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
}

// Write the modified index.html
fs.writeFileSync(indexPath, html);

console.log('PWA setup complete!');
console.log('- Added manifest link');
console.log('- Added Apple PWA meta tags');
console.log('- Added service worker registration');
console.log('- Added dark background color');
