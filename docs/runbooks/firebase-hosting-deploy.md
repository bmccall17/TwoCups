# Firebase Hosting Deployment

**Status:** active
**Owner:** @brett
**Last Updated:** 2026-01-19
**Audience:** Developers
**Related:** [deploy-hosting.sh](../../scripts/deploy-hosting.sh), [firebase.json](../../firebase.json)

---

## Overview

Two Cups is deployed to Firebase Hosting. There are two deployment methods:

1. **Automatic (CI/CD)**: Push to `main` triggers GitHub Actions deployment
2. **Manual**: Run `./scripts/deploy-hosting.sh` locally

Both methods use the same build process and verification checks.

---

## Automatic Deployment (Recommended)

### How It Works

On every push to `main`, GitHub Actions:
1. Checks out code
2. Installs dependencies (`npm ci` in TwoCupsApp/)
3. Builds web app (`npm run build:web`)
4. Verifies required files exist
5. Deploys to Firebase Hosting (live channel)

### Verify Deployment

1. Check the **Actions** tab in GitHub for workflow status
2. Look for the deployment banner in logs showing:
   - Commit SHA
   - Timestamp (UTC)
   - Public directory deployed
3. Visit https://twocups-2026.web.app to confirm

### Required GitHub Secret

The workflow requires a `FIREBASE_SERVICE_ACCOUNT` secret. See [Setup GitHub Secret](#setup-github-secret-one-time) below.

---

## Manual Deployment

Use `deploy-hosting.sh` for local deployments or debugging:

```bash
# Full deploy to production
./scripts/deploy-hosting.sh

# Deploy to preview channel (7-day expiry)
./scripts/deploy-hosting.sh --preview

# Build only, no deploy (for testing)
./scripts/deploy-hosting.sh --dry-run
```

### Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- Node.js 20+
- Access to the `twocups-2026` Firebase project

---

## Build Process

Both deployment methods run the same build:

```
TwoCupsApp/
├── npm run clean          # Removes dist/
├── expo export --platform web
└── node scripts/post-build.js
    ├── Copies icon assets to dist/assets/
    ├── Injects PWA manifest link
    ├── Injects service worker registration
    └── Generates build-manifest.json
```

### Required Output Files

These files MUST exist after build (verification fails if missing):

| File | Purpose |
|------|---------|
| `dist/index.html` | App entry point |
| `dist/sw.js` | Service worker (PWA) |
| `dist/manifest.json` | PWA manifest |
| `dist/build-manifest.json` | Build verification metadata |
| `dist/assets/icon.png` | App icon |
| `dist/assets/adaptive-icon.png` | Android adaptive icon |
| `dist/assets/favicon.png` | Browser favicon |

---

## Setup GitHub Secret (One-Time)

### Step 1: Generate Firebase Service Account Key

```bash
# In Firebase Console or via CLI
firebase login:ci
# OR use Service Account JSON from Firebase Console:
# Project Settings > Service accounts > Generate new private key
```

### Step 2: Add Secret to GitHub

1. Go to repo **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: Paste the entire service account JSON content
5. Click **Add secret**

### Service Account JSON Format

The secret should be a JSON object like:

```json
{
  "type": "service_account",
  "project_id": "twocups-2026",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@twocups-2026.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

---

## Troubleshooting

### Build fails with missing files

Check `TwoCupsApp/assets/` has the required icon files:
- `icon.png`
- `adaptive-icon.png`
- `favicon.png`

### Deploy fails with permission error

1. Verify `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
2. Ensure service account has "Firebase Hosting Admin" role
3. Check project ID matches `twocups-2026`

### Service worker not updating

The build injects a unique timestamp into `sw.js`. Force update:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check build-manifest.json for latest timestamp

---

## Architecture

```
GitHub (main branch)
       │
       ▼ (push)
GitHub Actions Workflow
       │
       ├── npm ci (TwoCupsApp/)
       ├── npm run build:web
       ├── verify required files
       │
       ▼
Firebase Hosting (live)
       │
       ▼
https://twocups-2026.web.app
```

**Deployed Directory:** `TwoCupsApp/dist` (configured in `firebase.json`)

---

## Related Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-hosting.yml` | GitHub Actions workflow |
| `scripts/deploy-hosting.sh` | Manual deploy script |
| `TwoCupsApp/scripts/post-build.js` | Post-build processing |
| `TwoCupsApp/public/sw.js` | Service worker source |
| `firebase.json` | Firebase configuration |
