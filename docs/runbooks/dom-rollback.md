# DOM Refactor Rollback Log

> **Date:** 2026-01-18
> **Purpose:** Track all changes made during DOM refactor for easy rollback

---

## Change Log

### Change 1: TimelineEntryCard - Consolidate expandIcon
**File:** `src/components/history/TimelineEntryCard.tsx`
**Lines Changed:** 114-124

**Before:**
```jsx
{isExpanded && (
  <View style={styles.expandedContent}>
    ...
    <View style={styles.expandIcon}>
      <Text style={styles.chevron}>▲</Text>
    </View>
  </View>
)}

{!isExpanded && (
  <View style={styles.expandIcon}>
    <Text style={styles.chevron}>▼</Text>
  </View>
)}
```

**After:**
```jsx
{isExpanded && (
  <View style={styles.expandedContent}>
    ...
  </View>
)}

<View style={styles.expandIcon}>
  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
</View>
```

**Rollback:** Replace lines with the "Before" code above.

---

### Change 2: AcknowledgeScreen - Bottom Spacing
**File:** `src/screens/AcknowledgeScreen.tsx`
**Lines Changed:** 634, 653-654

**Before:**
```jsx
// Line 634:
<View style={{ height: 100 }} />

// Line 653-654 (scrollContent style):
scrollContent: {
  padding: spacing.md,
},
```

**After:**
```jsx
// Line 634: REMOVED

// scrollContent style:
scrollContent: {
  padding: spacing.md,
  paddingBottom: 100,
},
```

**Rollback:** Add `<View style={{ height: 100 }} />` before closing `</ScrollView>`, remove `paddingBottom: 100` from scrollContent style.

---

### Change 3: New File - SectionHeader Component
**File:** `src/components/common/SectionHeader.tsx`
**Action:** NEW FILE CREATED

**Rollback:** Delete the file and remove export from `src/components/common/index.ts`.

---

### Change 4: New File - EmptyHint Component
**File:** `src/components/common/EmptyHint.tsx`
**Action:** NEW FILE CREATED

**Rollback:** Delete the file and remove export from `src/components/common/index.ts`.

---

### Change 5: common/index.ts - Add Exports
**File:** `src/components/common/index.ts`
**Lines Added:** Export statements for SectionHeader and EmptyHint

**Before:** (original exports only)

**After:** Added:
```typescript
export { SectionHeader } from './SectionHeader';
export { EmptyHint } from './EmptyHint';
```

**Rollback:** Remove the two export lines added.

---

### Change 6: AcknowledgeScreen - Use Shared Components
**File:** `src/screens/AcknowledgeScreen.tsx`
**Sections Changed:**
- Import statements (line 23)
- CollapsibleSection now uses SectionHeader (lines 89-99)
- Prominent section headers now use SectionHeader (lines 547-555, 590-598)
- Empty list hints now use EmptyHint (lines 580, 619)

**Rollback:** Revert to inline implementations (see original file in git).

---

### Change 7: AcknowledgeScreen - Style Cleanup
**File:** `src/screens/AcknowledgeScreen.tsx`
**Styles Removed:**
- `collapsibleTitleRow`
- `collapsibleIcon`
- `collapsibleTitle`
- `countBadge`
- `countBadgeText`
- `sectionIcon`
- `sectionTitle`
- `emptyListHint`
- `emptyListHintText`

**Rollback:** Add these styles back from the original file in git.

---

### Change 8: App.tsx - Feather Icon Font Preloading
**File:** `App.tsx`
**Lines Changed:** 4-5 (imports), 214-224 (RootNavigator)

**Added Imports:**
```tsx
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
```

**Added to RootNavigator:**
```tsx
// Load icon fonts - this ensures Feather icons display correctly on web
const [fontsLoaded] = useFonts({
  ...Feather.font,
});

// Changed condition from: if (!loading)
// To: if (!loading && fontsLoaded)
```

**Rollback:** Remove the imports and the `fontsLoaded` logic from RootNavigator. Revert useEffect condition back to `if (!loading)`.

---

### Change 9: LoginScreen - Remove Guest Button
**File:** `src/screens/auth/LoginScreen.tsx`
**Changes:**
- Removed `signInAnonymously` from useAuth destructuring
- Removed `handleAnonymousLogin` function
- Removed "Continue as Guest" button from UI

**Rollback:** Restore the guest login functionality from git history.

---

### Change 10: SettingsScreen - Add Email/Password Change
**File:** `src/screens/SettingsScreen.tsx`
**Changes:**
- Added Firebase Auth imports: `EmailAuthProvider`, `reauthenticateWithCredential`, `updateEmail`, `updatePassword`
- Added validation imports: `validateEmail`, `validatePassword`
- Added state for email and password change modals
- Added `handleOpenEmailModal`, `handleSaveEmail`, `handleOpenPasswordModal`, `handleSavePassword` functions
- Added "Account" section UI with Email and Password rows
- Added Email Change Modal with re-authentication
- Added Password Change Modal with re-authentication
- Added styles: `accountInfo`, `divider`

**Rollback:** Restore original SettingsScreen from git history.

---

## Quick Rollback Commands

```bash
# Rollback everything (run from TwoCupsApp directory)
git checkout -- src/components/history/TimelineEntryCard.tsx
git checkout -- src/screens/AcknowledgeScreen.tsx
git checkout -- src/screens/SettingsScreen.tsx
git checkout -- src/screens/auth/LoginScreen.tsx
git checkout -- src/components/common/index.ts
git checkout -- App.tsx
rm src/components/common/SectionHeader.tsx
rm src/components/common/EmptyHint.tsx

# Rollback specific files
git checkout -- <filename>
```

---

## Verification After Rollback

1. Run `npm run typecheck` - should pass
2. Run `npx expo start --clear` - app should load
3. Test AcknowledgeScreen with pending items and without
4. Test TimelineEntryCard expand/collapse
