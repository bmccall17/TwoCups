PRDFirebaseiOS.md

---

# PRD: Firebase iOS SDK & Initialization Setup
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

---

## Phase 1: Baseline Audit (Confirm Current State)
### Task 1.1 — Check Dependency Manager
**Action**
* Open Xcode → Project Settings
* Confirm whether **Swift Package Manager** is already in use

**Result**
* Clear decision: *Add new Firebase package* or *update existing Firebase package*

---

### Task 1.2 — Check App Entry Point
**Action**
* Identify app lifecycle:
  * `@main struct AppName: App` (SwiftUI)
  * Or legacy `AppDelegate`

**Result**
* Confirm SwiftUI lifecycle (expected)
* Determine exact file where Firebase initialization should live

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

---

### Task 3.2 — Connect AppDelegate to SwiftUI App
**Action**
* In main `@main App` struct:
  ```swift
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
  ```

**Result**
* Firebase initializes automatically on app startup

---

## Phase 4: Validation & Acceptance
### Task 4.1 — Build Validation
**Action**
* Clean build (`Shift + Cmd + K`)
* Build and run on Simulator or device

**Result**
* No build errors
* No missing symbol or linker warnings

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

---

## Definition of Done

* ✅ Firebase SDK installed via SPM
* ✅ Firebase initializes on app launch
* ✅ App builds and runs without warnings
* ✅ Ready for feature-level Firebase work (Auth, Firestore, etc.)

---

## Follow-Up (Optional, Not Blocking)

* Add Analytics consent handling (if needed)
* Add Firebase DebugView for event validation
* Lock Firebase SDK version in Package Dependencies
