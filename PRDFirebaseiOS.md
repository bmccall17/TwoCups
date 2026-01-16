PRDFirebaseiOS.md

---

# PRD: Firebase iOS SDK & Initialization Setup

> **⚠️ IMPORTANT NOTE (2026-01-16)**
>
> TwoCups is an **Expo/React Native** app, not a native Swift/SwiftUI app. This PRD has been updated with notes showing how each step maps to our Expo workflow.
>
> **Key Differences:**
> - We use `@react-native-firebase` packages (npm), not Swift Package Manager
> - Expo config plugins auto-generate native iOS code during `prebuild`
> - CocoaPods is used for iOS dependencies, not SPM
> - Firebase initialization happens automatically via the generated AppDelegate

## Objective
Ensure the iOS app is fully connected to Firebase by:
1. Correctly installing the Firebase iOS SDK via Swift Package Manager
2. Initializing Firebase at app launch using SwiftUI best practices

**Success = Firebase initializes cleanly at runtime with no warnings or crashes.**

---

## Scope
✅ In scope
* Firebase SDK installation (SPM)
* Firebase initialization code (SwiftUI)
* Validation via build + runtime check

❌ Out of scope
* Firebase feature usage (Auth, Firestore, Analytics events, etc.)
* Android / Web setup

---

## Preconditions (Already Met)

* Firebase project exists
* iOS app registered in Firebase Console
* `GoogleService-Info.plist` downloaded and added to Xcode target
* App builds successfully before Firebase integration

> **📝 EXPO STATUS (2026-01-16):**
> - ✅ Firebase project exists: `twocups-2026`
> - ✅ iOS app registered in Firebase Console with bundle ID: `com.twocups.app`
> - ✅ `GoogleService-Info.plist` downloaded and in `TwoCupsApp/`
> - ✅ `google-services.json` downloaded and in `TwoCupsApp/`
> - ✅ App configured in `app.json` with both `ios.googleServicesFile` and `android.googleServicesFile`

---

## Phase 1: Baseline Audit (Confirm Current State)
### Task 1.1 — Check Dependency Manager
**Action**
* Open Xcode → Project Settings
* Confirm whether **Swift Package Manager** is already in use

**Result**
* Clear decision: *Add new Firebase package* or *update existing Firebase package*

> **📝 EXPO EQUIVALENT:**
> - ✅ **DONE** - We use npm packages, not SPM
> - Installed: `@react-native-firebase/app@23.8.2` and `@react-native-firebase/crashlytics@23.8.2`
> - These packages include Expo config plugins that auto-configure CocoaPods
> - Check: `npm list @react-native-firebase/app`

---

### Task 1.2 — Check App Entry Point
**Action**
* Identify app lifecycle:
  * `@main struct AppName: App` (SwiftUI)
  * Or legacy `AppDelegate`

**Result**
* Confirm SwiftUI lifecycle (expected)
* Determine exact file where Firebase initialization should live

> **📝 EXPO EQUIVALENT:**
> - React Native uses `AppDelegate.mm` (Objective-C++), not SwiftUI
> - Expo prebuild generates this file automatically at `ios/TwoCupsApp/AppDelegate.mm`
> - The @react-native-firebase config plugin modifies AppDelegate to call `[FIRApp configure]`
> - **No manual code changes needed** - config plugins handle everything

---

## Phase 2: Add Firebase SDK (SPM)
### Task 2.1 — Add Firebase iOS SDK via SPM
**Action**
* Xcode → File → Add Packages
* URL:
  ```
  https://github.com/firebase/firebase-ios-sdk
  ```
* Select **latest stable version**

**Result**
* Firebase SDK added and resolved successfully

> **📝 EXPO EQUIVALENT:**
> - ✅ **DONE** - Config plugin handles this automatically
> - Run `npx expo prebuild --platform ios` to generate iOS project
> - This creates `ios/Podfile` with Firebase pods
> - Run `cd ios && pod install` (or let Expo handle it)
> - Firebase SDK version is managed by @react-native-firebase package

---

### Task 2.2 — Select Required Firebase Libraries
**Action**
* Minimum required:
  * `FirebaseCore`
* Optional (select now only if immediately needed):
  * `FirebaseAnalytics` or `FirebaseAnalyticsWithoutAdId`
  * Others deferred until feature work begins

**Result**
* Only intentional Firebase modules linked
* No unused dependencies

> **📝 EXPO EQUIVALENT:**
> - ✅ **DONE** - We've installed what we need:
>   - `@react-native-firebase/app` → includes `FirebaseCore`
>   - `@react-native-firebase/crashlytics` → includes `FirebaseCrashlytics`
> - To add more Firebase features later:
>   ```bash
>   npx expo install @react-native-firebase/auth
>   npx expo install @react-native-firebase/firestore
>   ```
> - Each package adds its config plugin automatically

---

## Phase 3: Add Initialization Code (SwiftUI)
### Task 3.1 — Create / Confirm AppDelegate
**Action**
* Create `AppDelegate.swift` (if not present)
* Conform to `UIApplicationDelegate`
* Call:
  ```swift
  FirebaseApp.configure()
  ```

**Result**
* Firebase configured exactly once at launch

> **📝 EXPO EQUIVALENT:**
> - ✅ **DONE** - Config plugin handles this automatically
> - The `@react-native-firebase/app` plugin modifies the generated `AppDelegate.mm`:
>   ```objc
>   #import <Firebase.h>
>
>   - (BOOL)application:(UIApplication *)application
>       didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
>     [FIRApp configure];  // ← Added by config plugin
>     // ... rest of React Native setup
>   }
>   ```
> - **No manual code changes needed**

---

### Task 3.2 — Connect AppDelegate to SwiftUI App
**Action**
* In main `@main App` struct:
  ```swift
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
  ```

**Result**
* Firebase initializes automatically on app startup

> **📝 EXPO EQUIVALENT:**
> - ✅ **NOT APPLICABLE** - React Native doesn't use SwiftUI lifecycle
> - React Native's entry point is `index.js` → `App.tsx`
> - Firebase initializes in native layer before React Native loads
> - Our JS code calls `initializeCrashlytics()` for additional setup (user ID, etc.)

---

## Phase 4: Validation & Acceptance
### Task 4.1 — Build Validation
**Action**
* Clean build (`Shift + Cmd + K`)
* Build and run on Simulator or device

**Result**
* No build errors
* No missing symbol or linker warnings

> **📝 EXPO EQUIVALENT:**
> ```bash
> # Generate iOS project (requires GoogleService-Info.plist first!)
> npx expo prebuild --platform ios
>
> # Build and run on simulator
> npx expo run:ios
>
> # Or build with EAS
> eas build --profile development --platform ios
> ```
> - ✅ **DONE (2026-01-16)**: Prebuild completed for both iOS and Android
> - ✅ iOS: `FirebaseApp.configure()` added to `AppDelegate.swift` (line 28)
> - ✅ Android: `google-services` and `crashlytics` plugins applied in `build.gradle`

---

### Task 4.2 — Runtime Validation
**Action**
* Observe Xcode console at app launch

**Expected Signal**
* Firebase startup log similar to:
  ```
  FirebaseApp.configure() successful
  ```

**Result**
* Firebase is live and correctly initialized

> **📝 EXPO EQUIVALENT:**
> - Look for Firebase initialization logs in Metro bundler or Xcode console
> - Test crash reporting:
>   ```typescript
>   // In SettingsScreen (dev only)
>   import { testCrash } from '../services/crashlytics';
>
>   {__DEV__ && (
>     <TouchableOpacity onPress={testCrash}>
>       <Text>Test Crash</Text>
>     </TouchableOpacity>
>   )}
>   ```
> - Check Firebase Console → Crashlytics for test crash (may take 5-10 min)

---

## Definition of Done

* ✅ Firebase SDK installed via SPM
* ✅ Firebase initializes on app launch
* ✅ App builds and runs without warnings
* ✅ Ready for feature-level Firebase work (Auth, Firestore, etc.)

> **📝 EXPO STATUS (2026-01-16 - ALL COMPLETE):**
> - ✅ `@react-native-firebase/app@23.8.2` installed
> - ✅ `@react-native-firebase/crashlytics@23.8.2` installed
> - ✅ Config plugins configured in `app.json`
> - ✅ `GoogleService-Info.plist` downloaded and configured
> - ✅ `google-services.json` downloaded and configured
> - ✅ `npx expo prebuild --platform ios` completed
> - ✅ `npx expo prebuild --platform android` completed
> - ✅ TypeScript compilation passes
> - ✅ Web build passes
> - 🔜 **NEXT**: Run on physical device/simulator to test Crashlytics

---

## Follow-Up (Optional, Not Blocking)

* Add Analytics consent handling (if needed)
* Add Firebase DebugView for event validation
* Lock Firebase SDK version in Package Dependencies

> **📝 EXPO NOTES:**
> - Analytics: Install `@react-native-firebase/analytics` when needed
> - Version locking: Handled by `package-lock.json`
> - Debug view: Use `firebase analytics:debug` or enable in Info.plist

---

## Quick Start Checklist (Expo/React Native)

### Prerequisites
- [ ] macOS with Xcode installed (required for iOS builds)
- [ ] CocoaPods installed (`sudo gem install cocoapods`)

### Steps (Updated 2026-01-16)
1. **Download Firebase config files:** ✅ DONE
   - [x] `GoogleService-Info.plist` in `TwoCupsApp/`
   - [x] `google-services.json` in `TwoCupsApp/`

2. **Generate native projects:** ✅ DONE
   ```bash
   cd TwoCupsApp
   npx expo prebuild --platform ios    # ✅ Completed
   npx expo prebuild --platform android # ✅ Completed
   ```

3. **Build and run:** 🔜 NEXT
   ```bash
   # iOS (requires macOS with Xcode)
   cd ios && pod install && cd ..
   npx expo run:ios

   # Android (requires Android Studio or SDK)
   npx expo run:android
   ```

4. **Verify Crashlytics:**
   - Add test crash button (dev only)
   - Trigger crash
   - Check Firebase Console → Crashlytics (5-10 min delay)

### Troubleshooting
- **Pod install fails**: `cd ios && pod install --repo-update`
- **Code signing issues**: Open `ios/TwoCupsApp.xcworkspace` in Xcode, set team
- **Crashlytics not appearing**: Ensure GoogleService-Info.plist bundle ID matches `com.twocups.app`
