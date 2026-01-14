# Android Build & Testing Guide

## Prerequisites

- Node.js 18+
- Android Studio with Android SDK
- Java Development Kit (JDK) 17+
- (For EAS Build) Expo account and EAS CLI

## Building the APK

### Option 1: EAS Build (Recommended - No Local SDK Required)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Build preview APK
eas build --platform android --profile preview
```

The APK will be available for download from Expo's build dashboard.

### Option 2: Local Build (Requires Android SDK)

```bash
# Generate/update native Android project
npx expo prebuild --platform android --clean

# Build debug APK
cd android
./gradlew assembleDebug

# APK output location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

For release builds:
```bash
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Running on Emulator

```bash
# Start the app on connected emulator
npx expo run:android

# Or install APK directly
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Testing Checklist

### Pre-Flight Checks
- [ ] `npx expo-doctor` passes with no issues
- [ ] `npx tsc --noEmit` passes (TypeScript)
- [ ] App runs in Expo Go on Android (basic sanity check)

### Build Verification
- [ ] `npx expo prebuild --platform android` completes without errors
- [ ] APK builds successfully (debug or preview)

### Emulator Testing
- [ ] APK installs on Android emulator
- [ ] App launches without crash
- [ ] All screens accessible via navigation

### Physical Device Testing (2+ devices recommended)
- [ ] APK installs on Device 1: ________________
- [ ] APK installs on Device 2: ________________

### Screen Rendering (Test on Multiple Screen Sizes)
- [ ] HomeScreen - cups display correctly, no overflow
- [ ] LogAttemptScreen - form fits screen, keyboard doesn't obscure inputs
- [ ] AcknowledgeScreen - list scrolls, items render correctly
- [ ] MakeRequestScreen - form displays properly
- [ ] ManageSuggestionsScreen - suggestions list renders
- [ ] SettingsScreen - all buttons accessible
- [ ] HistoryScreen - pagination works, list scrolls
- [ ] GemHistoryScreen - history items display correctly

### Navigation Testing
- [ ] Bottom tab navigation works
- [ ] Stack navigation (push/pop) works
- [ ] Back button behavior correct
- [ ] Deep links work (if applicable)

### Firebase Testing
- [ ] Anonymous auth works (first launch creates account)
- [ ] User data persists across app restarts
- [ ] Firestore reads work (data displays)
- [ ] Firestore writes work (can log attempts, create requests)
- [ ] Offline mode: app loads cached data when offline
- [ ] Online sync: data syncs when connection restored

### Device-Specific Tests
- [ ] Safe area insets correct (notch/punch-hole cameras)
- [ ] Status bar visible and styled correctly
- [ ] Keyboard shows/hides properly
- [ ] App works in portrait orientation

## Known Configurations

- **Package Name**: `com.twocups.app`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35 (Android 15)
- **Orientation**: Portrait only
- **Architecture**: New Architecture enabled

## Troubleshooting

### Build Fails
1. Clean and rebuild:
   ```bash
   cd android && ./gradlew clean && cd ..
   npx expo prebuild --platform android --clean
   ```

2. Check Java version:
   ```bash
   java -version  # Should be 17+
   ```

3. Verify Android SDK path in `local.properties`

### Firebase Issues on Android
- Firebase JS SDK is used (not native SDK)
- No `google-services.json` required for JS SDK auth
- Ensure INTERNET permission in manifest (✓ already added)

### Metro Bundler Issues
```bash
# Clear Metro cache
npx expo start --clear
```
