# Clean Baseline Plan for TwoCupsApp

**Created:** 2026-01-12
**Purpose:** Create a fresh, clean project folder without losing code

---

## Current State

**Repo root:** `Documents/GitHub/TwoCups/`
**App folder:** `TwoCups/TwoCupsApp/`
**Live site:** https://twocups-2026.web.app
**Firebase project:** `twocups-2026`

---

## Files to COPY (Essential Source)

```
TwoCupsApp/
├── App.tsx                 # Root component
├── index.ts                # Entry point
├── app.json                # Expo config
├── package.json            # Dependencies (clean version below)
├── tsconfig.json           # TypeScript config
├── assets/                 # All files (icons, splash)
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
└── src/                    # ALL subdirectories
    ├── components/common/  # Button, TextInput, LoadingSpinner
    ├── context/            # AuthContext.tsx
    ├── hooks/              # (empty, for future)
    ├── screens/            # HomeScreen, auth/*
    ├── services/           # firebase/, api/
    ├── theme/              # index.ts (dark theme)
    └── types/              # index.ts
```

## Files to SKIP (Generated/Cached)

```
node_modules/       # Reinstall fresh
dist/               # Rebuild
.expo/              # Cache
android/            # Not needed for web
package-lock.json   # Regenerate
.git/               # Fresh init
```

---

## Firebase Files at Repo Root (Keep These)

```
TwoCups/
├── .firebaserc             # Project binding
├── firebase.json           # Hosting config
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Indexes
├── SHIPLOG.md              # Progress log
├── prd_v0.0.1.md           # PRD
└── PLAN_claude.md          # Architecture plan
```

---

## Clean package.json

```json
{
  "name": "twocupsapp",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build:web": "expo export --platform web",
    "deploy": "npm run build:web && cd .. && firebase deploy --only hosting"
  },
  "dependencies": {
    "@react-navigation/native": "^7.1.26",
    "@react-navigation/native-stack": "^7.9.0",
    "expo": "~54.0.31",
    "expo-status-bar": "~3.0.9",
    "firebase": "^12.7.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  },
  "private": true
}
```

---

## Commands to Create Clean Baseline

### Step 1: Create clean folder and copy source

```powershell
# From TwoCups/ directory
mkdir TwoCupsApp_clean
cd TwoCupsApp_clean

# Copy essential files
copy ..\TwoCupsApp\App.tsx .
copy ..\TwoCupsApp\index.ts .
copy ..\TwoCupsApp\app.json .
copy ..\TwoCupsApp\package.json .
copy ..\TwoCupsApp\tsconfig.json .

# Copy folders
xcopy ..\TwoCupsApp\assets assets\ /E /I
xcopy ..\TwoCupsApp\src src\ /E /I
```

### Step 2: Install dependencies fresh

```powershell
npm install
```

### Step 3: Create .gitignore

```powershell
# Create .gitignore with this content:
@"
node_modules/
dist/
.expo/
*.log
.env*
.DS_Store
"@ | Out-File -Encoding utf8 .gitignore
```

### Step 4: Verify build works

```powershell
npm run build:web
# Should create dist/ folder with index.html
```

### Step 5: Update firebase.json (at repo root)

Change `"public": "TwoCupsApp/dist"` to `"public": "TwoCupsApp_clean/dist"`

### Step 6: Deploy and verify

```powershell
cd ..
firebase deploy --only hosting
# Should deploy to https://twocups-2026.web.app
```

### Step 7: Initialize Git (optional - or add to parent repo)

**Option A: Add to existing TwoCups repo**
```powershell
cd ..
git add TwoCupsApp_clean/
git commit -m "feat: clean baseline app folder"
```

**Option B: Standalone repo**
```powershell
git init
git add .
git commit -m "Initial commit: Two Cups Expo app"
```

---

## Verification Checklist

- [ ] `npm run build:web` succeeds
- [ ] `dist/index.html` exists
- [ ] `firebase deploy --only hosting` succeeds
- [ ] https://twocups-2026.web.app loads
- [ ] "Continue as Guest" auth works
- [ ] No node_modules in git
- [ ] No dist in git

---

## Key Config Files Reference

### firebase.json (at TwoCups/ root)
```json
{
  "hosting": {
    "public": "TwoCupsApp_clean/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### .firebaserc (at TwoCups/ root)
```json
{
  "projects": {
    "default": "twocups-2026"
  }
}
```

### Firebase Web Config (in src/services/firebase/config.ts)
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyBr_ph2BvDkswN0xtWIz_o_e86WS1O6dDI",
  authDomain: "twocups-2026.firebaseapp.com",
  projectId: "twocups-2026",
  storageBucket: "twocups-2026.firebasestorage.app",
  messagingSenderId: "43746143400",
  appId: "1:43746143400:web:242e1488b1714dadeca69d",
  measurementId: "G-R8SP3CYBBS"
};
```

---

## Architecture Summary

```
TwoCups/                          # Repo root
├── firebase.json                 # Hosting config
├── firestore.rules               # Security rules
├── .firebaserc                   # Project binding
├── TwoCupsApp_clean/             # Clean Expo app
│   ├── src/
│   │   ├── services/firebase/    # Firebase JS SDK
│   │   ├── services/api/         # Firestore operations
│   │   ├── context/              # Auth state
│   │   ├── screens/              # UI screens
│   │   └── components/           # Reusable components
│   ├── dist/                     # Web build (gitignored)
│   └── package.json
└── docs/                         # Documentation
```

---

## Quick Reference Commands

| Action | Command | Location |
|--------|---------|----------|
| Dev server | `npm run web` | TwoCupsApp_clean/ |
| Build | `npm run build:web` | TwoCupsApp_clean/ |
| Deploy | `npm run deploy` | TwoCupsApp_clean/ |
| Manual deploy | `firebase deploy --only hosting` | TwoCups/ |
